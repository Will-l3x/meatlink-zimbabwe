import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import { whatsappService } from '@/lib/whatsapp';
import { resolveBaseUrl } from '@/lib/payment-initiation';
import { publicBaseUrl, runPlanScheduler } from '@/lib/plans';

export async function GET(request: Request) {
    const guard = requireAdmin(request);
    if (guard.response) return guard.response;

    try {
        const db = getPrisma();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Orders service is unavailable' }, { status: 503 });
        }

        const deliveries = await db.delivery.findMany({
            orderBy: { scheduledDate: 'asc' },
            include: {
                recipient: true,
                subscription: {
                    include: {
                        sender: { select: { name: true, email: true } },
                        hamper: { select: { name: true } }
                    }
                }
            }
        });

        const incoming = deliveries.filter(d => d.status === 'PENDING');
        const onRoute = deliveries.filter(d => d.status === 'ON_ROUTE');
        const delivered = deliveries.filter(d => d.status === 'DELIVERED');
        const delayed = deliveries.filter(d => d.status === 'DELAYED');

        return NextResponse.json({
            success: true,
            deliveries,
            grouped: { incoming, onRoute, delivered, delayed },
            counts: {
                total: deliveries.length,
                incoming: incoming.length,
                onRoute: onRoute.length,
                delivered: delivered.length,
                delayed: delayed.length
            }
        });
    } catch (error) {
        console.error('Orders fetch error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const guard = requireAdmin(request);
    if (guard.response) return guard.response;

    try {
        const body = await request.json();
        const { action } = body;

        const db = getPrisma();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Orders service is unavailable' }, { status: 503 });
        }

        if (action === 'generate_batch') {
            // Prepaid weekly plans draw down their own balance (same job as the daily cron).
            const plans = await runPlanScheduler(publicBaseUrl(resolveBaseUrl(request)));

            const now = new Date();
            const dayOfWeek = now.getDay();
            const daysUntilWednesday = (3 - dayOfWeek + 7) % 7 || 7;
            const nextWednesday = new Date(now);
            nextWednesday.setDate(now.getDate() + daysUntilWednesday);
            nextWednesday.setHours(9, 0, 0, 0);

            const activeSubs = await db.subscription.findMany({
                where: { isActive: true },
                include: {
                    recipient: true,
                    sender: { select: { name: true } },
                    hamper: { select: { name: true } }
                }
            });

            const startOfDay = new Date(nextWednesday);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(nextWednesday);
            endOfDay.setHours(23, 59, 59, 999);

            const existingDeliveries = await db.delivery.findMany({
                where: {
                    scheduledDate: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            });

            const existingSubIds = new Set(existingDeliveries.map(d => d.subscriptionId));
            const newDeliveries = [];
            for (const sub of activeSubs) {
                if (sub.plan) continue; // handled by runPlanScheduler above
                if (!existingSubIds.has(sub.id)) {
                    const delivery = await db.delivery.create({
                        data: {
                            subscriptionId: sub.id,
                            recipientId: sub.recipientId,
                            status: 'PENDING',
                            scheduledDate: nextWednesday
                        },
                        include: {
                            recipient: true,
                            subscription: {
                                include: {
                                    sender: { select: { name: true, email: true } },
                                    hamper: { select: { name: true } }
                                }
                            }
                        }
                    });
                    newDeliveries.push(delivery);
                }
            }

            return NextResponse.json({
                success: true,
                message:
                    `Generated ${newDeliveries.length + plans.scheduled} new deliveries for ${nextWednesday.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}` +
                    (plans.renewalsDue ? ` · ${plans.renewalsDue} plan renewal link${plans.renewalsDue === 1 ? '' : 's'} sent` : ''),
                newCount: newDeliveries.length + plans.scheduled,
                renewalsDue: plans.renewalsDue,
                skipped: existingDeliveries.length,
                scheduledDate: nextWednesday.toISOString()
            });
        }

        if (action === 'update_status') {
            const { deliveryId, status } = body;

            if (!deliveryId || !status) {
                return NextResponse.json({ success: false, error: 'Missing deliveryId or status' }, { status: 400 });
            }

            const VALID = ['PENDING', 'ON_ROUTE', 'DELIVERED', 'DELAYED'] as const;
            if (!VALID.includes(status)) {
                return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
            }

            const previous = await db.delivery.findUnique({ where: { id: deliveryId }, select: { status: true } });
            if (!previous) {
                return NextResponse.json({ success: false, error: 'Delivery not found' }, { status: 404 });
            }

            const updateData: { status: typeof VALID[number]; deliveredAt?: Date } = { status };
            if (status === 'DELIVERED') {
                updateData.deliveredAt = new Date();
            }

            const updated = await db.delivery.update({
                where: { id: deliveryId },
                data: updateData,
                include: {
                    recipient: true,
                    subscription: {
                        include: {
                            sender: { select: { name: true } },
                            hamper: { select: { name: true } }
                        }
                    }
                }
            });

            console.log(`[Orders] Delivery ${deliveryId} → ${status} (${updated.recipient.name})`);

            // Keep the recipient informed; only message on an actual change.
            if (previous.status !== status && updated.recipient.whatsapp) {
                const name = updated.recipient.name;
                const sender = updated.subscription.sender?.name;
                const text =
                    status === 'ON_ROUTE'
                        ? `Hi ${name}! 🚚 Your Hexad Market order${sender ? ` from ${sender}` : ''} is on its way. Please make sure someone is home to receive it.`
                        : status === 'DELIVERED'
                            ? `Hi ${name}! ✅ Your Hexad Market order has been delivered. Enjoy, and thank you!`
                            : status === 'DELAYED'
                                ? `Hi ${name}, your Hexad Market delivery is running late today. We're sorry for the wait and will update you shortly.`
                                : null;
                if (text) {
                    whatsappService.sendMessage({ to: updated.recipient.whatsapp, text })
                        .catch((e) => console.error('[Orders] Recipient WhatsApp failed:', e));
                }
            }

            return NextResponse.json({ success: true, delivery: updated });
        }

        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('Orders action error:', error);
        return NextResponse.json({ success: false, error: 'Failed to process action' }, { status: 500 });
    }
}
