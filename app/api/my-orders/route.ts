import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { PLAN_ID, renewalToken } from '@/lib/plans';
import { PLAN_WEEKS } from '@/lib/delivery';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Scheduled',
    ON_ROUTE: 'On the way',
    DELIVERED: 'Delivered',
    DELAYED: 'Delayed',
};

type PlanFields = {
    id: string;
    isActive: boolean;
    deliveriesPerCycle: number | null;
    deliveriesLeft: number | null;
    autoRenew: boolean | null;
    cycleAmount: number | null;
    cycleCurrency: string | null;
    renewalDueAt: Date | null;
};

function planSummary(sub: PlanFields, upcoming: number) {
    const token = renewalToken(sub.id);
    // The scheduled-but-not-yet-delivered drop counts as still to come.
    return {
        weeks: sub.deliveriesPerCycle ?? PLAN_WEEKS,
        deliveriesLeft: Math.max(0, sub.deliveriesLeft ?? 0) + upcoming,
        autoRenew: sub.autoRenew !== false,
        amount: sub.cycleAmount ?? 0,
        currency: (sub.cycleCurrency || 'USD').toUpperCase(),
        state: !sub.isActive ? 'ended' : sub.renewalDueAt ? 'renewal_due' : 'active',
        renewPath: token ? `/renew?sub=${sub.id}&t=${token}` : `/renew?sub=${sub.id}`,
    };
}

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

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const orders = subscriptions.map((sub) => {
            const delivery = sub.deliveries[0];
            const upcoming = delivery && delivery.status !== 'DELIVERED' && delivery.scheduledDate >= today ? 1 : 0;
            const deliveryDate = delivery?.scheduledDate ?? sub.nextDelivery;
            return {
                id: sub.id,
                pack: sub.hamper.name,
                recipientName: sub.recipient.name,
                location: `${sub.recipient.suburb || 'Harare'}, Harare`,
                date: sub.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                deliveryDate: deliveryDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
                status: STATUS_LABEL[delivery?.status ?? 'PENDING'] ?? 'Scheduled',
                plan: sub.plan === PLAN_ID ? planSummary(sub, upcoming) : null,
            };
        });

        return NextResponse.json({ success: true, orders });
    } catch (error) {
        console.error('[My Orders] Failed to load orders:', error);
        return NextResponse.json({ success: false, error: 'Could not load your orders.' }, { status: 500 });
    }
}

/**
 * PATCH /api/my-orders { id, autoRenew } — turn renewal links on or off for
 * one of the customer's weekly plans.
 */
export async function PATCH(request: Request) {
    const guard = requireSession(request);
    if (guard.response) return guard.response;

    const db = getPrisma();
    if (!db) {
        return NextResponse.json({ success: false, error: 'Orders are temporarily unavailable.' }, { status: 503 });
    }

    let body: { id?: unknown; autoRenew?: unknown } = {};
    try {
        body = await request.json();
    } catch {
        // validated below
    }
    if (typeof body.id !== 'string' || !/^[a-f0-9]{24}$/i.test(body.id) || typeof body.autoRenew !== 'boolean') {
        return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
    }

    const updated = await db.subscription.updateMany({
        where: { id: body.id, senderId: guard.session.uid, plan: PLAN_ID },
        data: { autoRenew: body.autoRenew },
    });
    if (updated.count === 0) {
        return NextResponse.json({ success: false, error: 'Plan not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, autoRenew: body.autoRenew });
}
