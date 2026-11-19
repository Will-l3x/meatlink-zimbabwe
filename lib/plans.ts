import crypto from 'crypto';
import type { Payment, Prisma } from '@prisma/client';
import { getPrisma } from '@/lib/prisma';
import { signValue } from '@/lib/session';
import { whatsappService } from '@/lib/whatsapp';
import { sendOwnerWhatsApp } from '@/lib/order-notifications';
import { nextDeliveryDate, PLAN_WEEKS } from '@/lib/delivery';

/**
 * Prepaid weekly plans: the customer pays once for PLAN_WEEKS deliveries,
 * one delivery is scheduled each Wednesday, drawing down `deliveriesLeft`.
 * When the balance runs out we send a renewal link; paying it adds another
 * cycle. Nothing is ever charged automatically, the customer pays each link.
 *
 * The scheduler runs from the daily cron (/api/cron/plans) and from the admin
 * "Generate Next Batch" button, and is safe to run any number of times.
 */

export const PLAN_ID = 'MONTHLY';

const RENEWAL_SCOPE = 'renew:';

/** Long-lived token that lets whoever holds the link pay for this plan. */
export function renewalToken(subscriptionId: string): string | null {
    const sig = signValue(`${RENEWAL_SCOPE}${subscriptionId}`);
    return sig ? sig.slice(0, 32) : null;
}

export function verifyRenewalToken(subscriptionId: string, token: string | null | undefined): boolean {
    if (!token) return false;
    const expected = renewalToken(subscriptionId);
    if (!expected) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(token);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Origin used in links we send by WhatsApp (prefers the configured public URL). */
export function publicBaseUrl(fallback: string): string {
    const configured = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, '');
    if (configured) return configured;
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    return fallback;
}

export function renewalUrl(subscriptionId: string, baseUrl: string): string | null {
    const token = renewalToken(subscriptionId);
    return token ? `${baseUrl}/renew?sub=${subscriptionId}&t=${token}` : null;
}

function startOfDay(d: Date): Date {
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    return s;
}

function dayLabel(d: Date): string {
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function money(amount: number | null | undefined, currency: string | null | undefined): string {
    const c = (currency || 'USD').toUpperCase();
    const sym = c === 'ZAR' ? 'R' : c === 'GBP' ? '£' : c === 'USD' ? '$' : `${c} `;
    return `${sym}${(amount ?? 0).toFixed(2)}`;
}

/** Subscriptions with no renewal pending (field null or never written). */
const NO_RENEWAL_PENDING: Prisma.SubscriptionWhereInput = {
    OR: [{ renewalDueAt: null }, { renewalDueAt: { isSet: false } }],
};

/**
 * Schedule this plan's next paid delivery for the coming Wednesday, unless one
 * is already upcoming or nothing is left. Keeps exactly one upcoming delivery
 * per plan, so the admin board always shows the next drop.
 */
export async function scheduleNextPlanDelivery(subscriptionId: string, now: Date = new Date()) {
    const db = getPrisma();
    if (!db) return null;

    const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
    if (!sub || sub.plan !== PLAN_ID || !sub.isActive) return null;
    const left = sub.deliveriesLeft ?? 0;
    if (left <= 0) return null;

    const upcoming = await db.delivery.findFirst({
        where: { subscriptionId, scheduledDate: { gte: startOfDay(now) } },
        select: { id: true },
    });
    if (upcoming) return null;

    const scheduledDate = nextDeliveryDate(now);
    // Claim one delivery from the balance; a concurrent run loses the race.
    const claimed = await db.subscription.updateMany({
        where: { id: subscriptionId, deliveriesLeft: left },
        data: { deliveriesLeft: left - 1, nextDelivery: scheduledDate },
    });
    if (claimed.count === 0) return null;

    return db.delivery.create({
        data: { subscriptionId, recipientId: sub.recipientId, status: 'PENDING', scheduledDate },
    });
}

/** Tell the customer (if we have their WhatsApp) and the owner that a plan needs paying. */
async function sendRenewalNotice(subscriptionId: string, baseUrl: string): Promise<void> {
    const db = getPrisma();
    if (!db) return;
    const sub = await db.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
            recipient: { select: { name: true } },
            sender: { select: { name: true, email: true, whatsappId: true } },
        },
    });
    if (!sub) return;

    const link = renewalUrl(sub.id, baseUrl);
    if (!link) {
        console.error('[Plans] Cannot build a renewal link: SESSION_SECRET is not set');
        return;
    }
    const amount = money(sub.cycleAmount, sub.cycleCurrency);
    const weeks = sub.deliveriesPerCycle ?? PLAN_WEEKS;
    const lastDrop = dayLabel(sub.nextDelivery);
    const firstName = (sub.sender.name || '').split(' ')[0] || 'there';

    const payerNumber = sub.payerWhatsApp || sub.sender.whatsappId;
    if (payerNumber) {
        const result = await whatsappService.sendMessage({
            to: payerNumber,
            text:
                `Hi ${firstName}, ${sub.recipient.name}'s last prepaid delivery is on ${lastDrop}. 🥩\n\n` +
                `To keep the weekly deliveries going, pay ${amount} for the next ${weeks} weeks here:\n${link}\n\n` +
                `Nothing is charged until you pay. To stop, just ignore this message.`,
        });
        if (!result.success) console.warn('[Plans] Renewal WhatsApp to customer failed:', result.error);
    }

    await sendOwnerWhatsApp(
        `⏰ *Plan renewal due*\n\n` +
        `${sub.sender.name}${sub.sender.email ? ` (${sub.sender.email})` : ''} → ${sub.recipient.name}\n` +
        `Last paid delivery: ${lastDrop}\n` +
        `Renewal: ${amount} for ${weeks} weekly deliveries\n\n` +
        `Payment link (forward to the customer if needed):\n${link}`
    ).catch((e) => console.error('[Plans] Owner renewal notice failed:', e));
}

export interface SchedulerResult {
    scheduled: number;
    renewalsDue: number;
    ended: number;
}

/** Advance every active plan: schedule paid deliveries, flag renewals, end finished plans. */
export async function runPlanScheduler(baseUrl: string, now: Date = new Date()): Promise<SchedulerResult> {
    const result: SchedulerResult = { scheduled: 0, renewalsDue: 0, ended: 0 };
    const db = getPrisma();
    if (!db) return result;

    const plans = await db.subscription.findMany({
        where: { plan: PLAN_ID, isActive: true },
        select: { id: true },
    });

    for (const { id } of plans) {
        try {
            if (await scheduleNextPlanDelivery(id, now)) result.scheduled++;

            const sub = await db.subscription.findUnique({ where: { id } });
            if (!sub || (sub.deliveriesLeft ?? 0) > 0) continue;

            if (sub.autoRenew) {
                // Balance used up: send one renewal link per cycle.
                const claimed = await db.subscription.updateMany({
                    where: { id, deliveriesLeft: { lte: 0 }, ...NO_RENEWAL_PENDING },
                    data: { renewalDueAt: now },
                });
                if (claimed.count > 0) {
                    result.renewalsDue++;
                    await sendRenewalNotice(id, baseUrl);
                }
                continue;
            }

            // No renewal wanted: the plan ends once its last delivery has passed.
            const upcoming = await db.delivery.findFirst({
                where: { subscriptionId: id, scheduledDate: { gte: startOfDay(now) } },
                select: { id: true },
            });
            if (!upcoming) {
                await db.subscription.update({ where: { id }, data: { isActive: false } });
                result.ended++;
            }
        } catch (error) {
            console.error(`[Plans] Scheduler failed for subscription ${id}:`, error);
        }
    }

    if (result.scheduled || result.renewalsDue || result.ended) {
        console.log('[Plans] Scheduler run:', JSON.stringify(result));
    }
    return result;
}

/**
 * Apply a COMPLETED renewal payment to its plan: add a cycle of deliveries,
 * clear the renewal flag and schedule the next drop straight away.
 */
export async function applyRenewalPayment(payment: Payment, subscriptionId: string): Promise<string | null> {
    const db = getPrisma();
    if (!db) return null;

    const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
    if (!sub || sub.plan !== PLAN_ID || sub.senderId !== payment.userId) {
        console.warn(`[Plans] Payment ${payment.id} renews unknown plan ${subscriptionId}`);
        return null;
    }

    const weeks = sub.deliveriesPerCycle ?? PLAN_WEEKS;
    // Add the cycle, conditioned on the balance we read so a concurrent
    // scheduler run can't be overwritten; retry if it moved underneath us.
    let current = sub;
    let applied = false;
    for (let attempt = 0; attempt < 5 && !applied; attempt++) {
        if (current.lastRenewalPaymentId === payment.id) return current.id; // already applied
        const claimed = await db.subscription.updateMany({
            where: {
                id: sub.id,
                deliveriesLeft: current.deliveriesLeft,
                // Not yet applied. Spelled out because Prisma's NOT skips
                // documents where the field was never written.
                OR: [
                    { lastRenewalPaymentId: { isSet: false } },
                    { lastRenewalPaymentId: null },
                    { lastRenewalPaymentId: { not: payment.id } },
                ],
            },
            data: {
                deliveriesLeft: Math.max(0, current.deliveriesLeft ?? 0) + weeks,
                cycleCount: (current.cycleCount ?? 1) + 1,
                isActive: true,
                renewalDueAt: null,
                lastRenewalPaymentId: payment.id,
                cycleAmount: payment.amount,
                cycleCurrency: payment.currency.toUpperCase(),
            },
        });
        applied = claimed.count > 0;
        if (!applied) {
            const fresh = await db.subscription.findUnique({ where: { id: sub.id } });
            if (!fresh) return null;
            current = fresh;
        }
    }
    if (!applied) {
        console.error(`[Plans] Could not apply renewal payment ${payment.id} to plan ${sub.id}`);
        return null;
    }

    await db.transaction.create({
        data: {
            userId: payment.userId,
            amount: payment.amount,
            type: 'DEPOSIT',
            description: `Plan renewal via ZB Smile & Pay (${payment.currency.toUpperCase()}): ${weeks} weekly deliveries`,
            reference: payment.orderReference || `PAY-${payment.id.slice(-6).toUpperCase()}`,
        },
    });

    await scheduleNextPlanDelivery(sub.id);
    console.log(`[Plans] Payment ${payment.id} renewed plan ${sub.id} (+${weeks} deliveries)`);
    return sub.id;
}
