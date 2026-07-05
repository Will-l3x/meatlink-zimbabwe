import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { whatsappService } from '@/lib/whatsapp';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { deliveryId, recipientName, recipientWhatsApp, photoUrl } = body;

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
            }
        });

        await whatsappService.sendMessage({
            to: recipientWhatsApp || '+0000000000',
            text: `Good news! Your family's weekly meat pack has been delivered to ${recipientName}. ✅ Thank you for using Hexad Market!`
        });

        return NextResponse.json({
            success: true,
            delivery: updatedDelivery,
            message: 'Delivery confirmed and sender notified.'
        });
    } catch (error) {
        console.error('Delivery confirmation error:', error);
        return NextResponse.json({ success: false, error: 'Failed to confirm delivery' }, { status: 500 });
    }
}
