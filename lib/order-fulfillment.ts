import { getPrisma } from '@/lib/prisma';
import { whatsappService } from '@/lib/whatsapp';
import { notifyOrderPaymentCompleted } from '@/lib/order-notifications';
import { nextDeliveryDate, PLAN_WEEKS } from '@/lib/delivery';
import { applyRenewalPayment, PLAN_ID } from '@/lib/plans';

/**
 * Server-side order fulfilment.
 *
 * When an ORDER payment is confirmed (via the ZB callback or a status poll)
 * we turn the payment metadata into a Recipient, Hamper, Subscription and
 * first Delivery so the order shows up on the admin logistics board even if
 * the customer never returns to the website. Idempotent: the created
 * subscription id is written back into the payment metadata.
 */

type CartLine = { id?: string; title: string; kg: number; price?: number };

type Frequency = 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';

interface OrderMetadata {
    source?: string;
    cart?: CartLine[];
    cartItems?: CartLine[];
    recipientName?: string;
    recipientWhatsApp?: string;
    recipientAddress?: string;
    recipientSuburb?: string;
    senderName?: string;
    frequency?: string;
    /** "MONTHLY" = prepaid weekly plan (PLAN_WEEKS deliveries per payment). */
    plan?: string;
    autoRenew?: boolean;
    payerWhatsApp?: string;
    /** Set on renewal payments: the plan (subscription) being topped up. */
    renewalOf?: string;
    fulfilledSubscriptionId?: string;
    fulfilledAt?: string;
    [key: string]: unknown;
}

function parseMetadata(raw: string | null | undefined): OrderMetadata {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? (parsed as OrderMetadata) : {};
    } catch {
        return {};
    }
}

function normalizeFrequency(value: unknown): Frequency {
    return value === 'BI_WEEKLY' || value === 'MONTHLY' ? value : 'WEEKLY';
}

export { nextDeliveryDate };

export function describeCart(items: CartLine[]): string {
    return items.map((i) => `${i.title} (${i.kg}kg)`).join(', ');
}

/**
 * Create the delivery records for a COMPLETED order payment.
 * Returns the subscription id, or null when nothing could be created.
 */
export async function fulfillPaidOrder(paymentId: string): Promise<string | null> {
    const db = getPrisma();
    if (!db) return null;

    const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: { user: { select: { id: true, name: true } } },
    });
    if (!payment || payment.purpose !== 'ORDER' || payment.status !== 'COMPLETED') return null;

    const meta = parseMetadata(payment.metadata);
    if (meta.fulfilledSubscriptionId) return meta.fulfilledSubscriptionId;

    if (meta.renewalOf) {
        const renewedId = await applyRenewalPayment(payment, meta.renewalOf);
        if (renewedId) {
            meta.fulfilledSubscriptionId = renewedId;
            meta.fulfilledAt = new Date().toISOString();
            await db.payment.update({ where: { id: paymentId }, data: { metadata: JSON.stringify(meta) } });
        }
        return renewedId;
    }

    const isPlan = meta.plan === PLAN_ID;

    const items = (meta.cart?.length ? meta.cart : meta.cartItems) || [];
    const recipientName = (meta.recipientName || '').trim();
    const recipientWhatsApp = (meta.recipientWhatsApp || '').trim();
    const recipientAddress = (meta.recipientAddress || '').trim();
    const recipientSuburb = (meta.recipientSuburb || 'Harare').trim();

    if (!recipientName || !recipientWhatsApp || !recipientAddress) {
        console.warn(`[Fulfilment] Payment ${paymentId} has no recipient details; skipping delivery creation`);
        return null;
    }

    const recipient =
        (await db.recipient.findFirst({ where: { whatsapp: recipientWhatsApp } })) ??
        (await db.recipient.create({
            data: { name: recipientName, whatsapp: recipientWhatsApp, address: recipientAddress, suburb: recipientSuburb },
        }));

    const hamperName = (describeCart(items) || `Hexad Market order ${payment.orderReference || ''}`).trim().slice(0, 200);
    const currency = payment.currency.toUpperCase();
    const hamper = await db.hamper.upsert({
        where: { name: hamperName },
        update: {},
        create: {
            name: hamperName,
            description: `Meat order: ${hamperName}`,
            priceUSD: currency === 'USD' ? payment.amount : 0,
            priceZAR: currency === 'ZAR' ? payment.amount : 0,
            priceGBP: currency === 'GBP' ? payment.amount : 0,
        },
    });

    const scheduledDate = nextDeliveryDate();
    const subscription = await db.subscription.create({
        data: {
            senderId: payment.userId,
            recipientId: recipient.id,
            hamperId: hamper.id,
            frequency: isPlan ? 'WEEKLY' : normalizeFrequency(meta.frequency),
            nextDelivery: scheduledDate,
            ...(isPlan
                ? {
                    // Prepaid plan: this payment covers PLAN_WEEKS weekly deliveries.
                    // The first is created below; lib/plans.ts schedules the rest.
                    isActive: true,
                    plan: PLAN_ID,
                    deliveriesPerCycle: PLAN_WEEKS,
                    deliveriesLeft: PLAN_WEEKS - 1,
                    autoRenew: meta.autoRenew !== false,
                    cycleAmount: payment.amount,
                    cycleCurrency: currency,
                    cart: JSON.stringify(items),
                    payerWhatsApp: (meta.payerWhatsApp || '').trim() || null,
                    cycleCount: 1,
                    renewalDueAt: null,
                }
                : {
                    // One payment, one delivery: a one-off order. Inactive
                    // subscriptions are skipped by the scheduler and batch button.
                    isActive: false,
                }),
        },
    });

    await db.delivery.create({
        data: {
            subscriptionId: subscription.id,
            recipientId: recipient.id,
            status: 'PENDING',
            scheduledDate,
        },
    });

    await db.transaction.create({
        data: {
            userId: payment.userId,
            amount: payment.amount,
            type: 'DEPOSIT',
            description: `${isPlan ? `Weekly plan (${PLAN_WEEKS} deliveries)` : 'Order'} payment via ZB Smile & Pay (${currency}) — ${hamperName}`.slice(0, 500),
            reference: payment.orderReference || `PAY-${payment.id.slice(-6).toUpperCase()}`,
        },
    });

    meta.fulfilledSubscriptionId = subscription.id;
    meta.fulfilledAt = new Date().toISOString();
    await db.payment.update({
        where: { id: paymentId },
        data: { metadata: JSON.stringify(meta) },
    });

    const senderName = meta.senderName || payment.user.name || 'your family';
    const dateLabel = scheduledDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    whatsappService
        .sendMessage({
            to: recipientWhatsApp,
            text: isPlan
                ? `Hi ${recipientName}! 🥩 ${senderName} has set up weekly fresh meat deliveries for you from Hexad Market.\n\n` +
                  `${hamperName}\n\n` +
                  `Every Wednesday for the next ${PLAN_WEEKS} weeks, starting ${dateLabel}. We'll message you when each one is on its way.`
                : `Hi ${recipientName}! 🥩 ${senderName} has ordered fresh meat for you from Hexad Market.\n\n` +
                  `${hamperName}\n\n` +
                  `Delivery is scheduled for ${dateLabel}. We'll message you when it's on its way.`,
        })
        .catch((e) => console.error('[Fulfilment] Recipient WhatsApp failed:', e));

    console.log(`[Fulfilment] Payment ${paymentId} → subscription ${subscription.id}`);
    return subscription.id;
}

/**
 * Everything that should happen once an ORDER payment is COMPLETED.
 * Safe to call more than once.
 */
export async function handleOrderPaymentCompleted(paymentId: string): Promise<string | null> {
    let subscriptionId: string | null = null;
    try {
        subscriptionId = await fulfillPaidOrder(paymentId);
    } catch (error) {
        console.error('[Fulfilment] Failed to create delivery records:', error);
    }
    try {
        await notifyOrderPaymentCompleted(paymentId);
    } catch (error) {
        console.error('[Fulfilment] Owner notification failed:', error);
    }
    return subscriptionId;
}

/** Read the fulfilled subscription id (if any) from a payment's metadata. */
export function fulfilledSubscriptionId(metadata: string | null | undefined): string | null {
    return parseMetadata(metadata).fulfilledSubscriptionId || null;
}
