import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { whatsappService } from '@/lib/whatsapp';
import { requireAdmin } from '@/lib/session';

/** POST /api/deliveries — confirm a delivery (admin / driver console). */
export async function POST(request: Request) {
    const guard = requireAdmin(request);
    if (guard.response) return guard.response;

    try {
        const body = await request.json();
        const { deliveryId, photoUrl } = body;

        if (!deliveryId) {
            return NextResponse.json({ success: false, error: 'Missing deliveryId' }, { status: 400 });
        }

        const db = getPrisma();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Delivery service is temporarily unavailable' }, { status: 503 });
        }

        const updatedDelivery = await db.delivery.update({
            where: { id: deliveryId },
            data: {
                status: 'DELIVERED',
                deliveredAt: new Date(),
                proofOfDelivery: photoUrl || null,
            },
            include: { recipient: true }
        });

        if (updatedDelivery.recipient?.whatsapp) {
            await whatsappService.sendMessage({
                to: updatedDelivery.recipient.whatsapp,
                text: `Good news! Your meat order has been delivered to ${updatedDelivery.recipient.name}. ✅ Thank you for using Hexad Market!`
            });
        }

        return NextResponse.json({
            success: true,
            delivery: updatedDelivery,
            message: 'Delivery confirmed and recipient notified.'
        });
    } catch (error) {
        console.error('Delivery confirmation error:', error);
        return NextResponse.json({ success: false, error: 'Failed to confirm delivery' }, { status: 500 });
    }
}
