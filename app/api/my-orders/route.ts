import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Scheduled',
    ON_ROUTE: 'On the way',
    DELIVERED: 'Delivered',
    DELAYED: 'Delayed',
};

/**
 * The signed-in customer's paid orders with their latest delivery status,
 * newest first. Used by "My orders" so it works on any device.
 */
export async function GET(request: Request) {
    const guard = requireSession(request);
    if (guard.response) return guard.response;

    const db = getPrisma();
    if (!db) {
        return NextResponse.json({ success: false, error: 'Orders are temporarily unavailable.' }, { status: 503 });
    }

    try {
        const subscriptions = await db.subscription.findMany({
            where: { senderId: guard.session.uid },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                recipient: { select: { name: true, suburb: true } },
                hamper: { select: { name: true } },
                deliveries: { orderBy: { scheduledDate: 'desc' }, take: 1, select: { status: true, scheduledDate: true } },
            },
        });

        const orders = subscriptions.map((sub) => {
            const delivery = sub.deliveries[0];
            const deliveryDate = delivery?.scheduledDate ?? sub.nextDelivery;
            return {
                id: sub.id,
                pack: sub.hamper.name,
                recipientName: sub.recipient.name,
                location: `${sub.recipient.suburb || 'Harare'}, Harare`,
                date: sub.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                deliveryDate: deliveryDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
                status: STATUS_LABEL[delivery?.status ?? 'PENDING'] ?? 'Scheduled',
            };
        });

        return NextResponse.json({ success: true, orders });
    } catch (error) {
        console.error('[My Orders] Failed to load orders:', error);
        return NextResponse.json({ success: false, error: 'Could not load your orders.' }, { status: 500 });
    }
}
