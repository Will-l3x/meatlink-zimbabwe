import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export async function GET() {
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
    try {
        const body = await request.json();
        const { action } = body;

        const db = getPrisma();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Orders service is unavailable' }, { status: 503 });
        }

        if (action === 'generate_batch') {
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
                message: `Generated ${newDeliveries.length} new deliveries for ${nextWednesday.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}`,
                newCount: newDeliveries.length,
                skipped: existingDeliveries.length,
                scheduledDate: nextWednesday.toISOString()
            });
        }

        if (action === 'update_status') {
            const { deliveryId, status } = body;

            if (!deliveryId || !status) {
                return NextResponse.json({ success: false, error: 'Missing deliveryId or status' }, { status: 400 });
            }

            const updateData: { status: 'PENDING' | 'ON_ROUTE' | 'DELIVERED' | 'DELAYED'; deliveredAt?: Date } = { status: status as 'PENDING' | 'ON_ROUTE' | 'DELIVERED' | 'DELAYED' };
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

            return NextResponse.json({ success: true, delivery: updated });
        }

        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('Orders action error:', error);
        return NextResponse.json({ success: false, error: 'Failed to process action' }, { status: 500 });
    }
}
