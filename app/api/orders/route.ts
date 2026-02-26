import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all deliveries with related data
export async function GET() {
    try {
        const deliveries = await prisma.delivery.findMany({
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

        // Group by status for the Kanban view
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

// POST: Generate batch deliveries for next Wednesday, or update a delivery status
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action } = body;

        // --- Action: Generate next batch ---
        if (action === 'generate_batch') {
            // Find next Wednesday
            const now = new Date();
            const dayOfWeek = now.getDay();
            const daysUntilWednesday = (3 - dayOfWeek + 7) % 7 || 7; // 3 = Wednesday
            const nextWednesday = new Date(now);
            nextWednesday.setDate(now.getDate() + daysUntilWednesday);
            nextWednesday.setHours(9, 0, 0, 0);

            // Get all active subscriptions
            const activeSubs = await prisma.subscription.findMany({
                where: { isActive: true },
                include: {
                    recipient: true,
                    sender: { select: { name: true } },
                    hamper: { select: { name: true } }
                }
            });

            // Check if deliveries already exist for this date
            const startOfDay = new Date(nextWednesday);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(nextWednesday);
            endOfDay.setHours(23, 59, 59, 999);

            const existingDeliveries = await prisma.delivery.findMany({
                where: {
                    scheduledDate: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            });

            const existingSubIds = new Set(existingDeliveries.map(d => d.subscriptionId));

            // Create deliveries for subscriptions that don't have one yet
            const newDeliveries = [];
            for (const sub of activeSubs) {
                if (!existingSubIds.has(sub.id)) {
                    const delivery = await prisma.delivery.create({
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

        // --- Action: Update delivery status ---
        if (action === 'update_status') {
            const { deliveryId, status } = body;

            if (!deliveryId || !status) {
                return NextResponse.json({ success: false, error: 'Missing deliveryId or status' }, { status: 400 });
            }

            const updateData: Record<string, unknown> = { status };
            if (status === 'DELIVERED') {
                updateData.deliveredAt = new Date();
            }

            const updated = await prisma.delivery.update({
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
