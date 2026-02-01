import { NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { deliveryId, recipientName, recipientWhatsApp, photoUrl } = body;

        // 1. In real life, update delivery status in DB
        console.log(`[API] Marking delivery ${deliveryId} as DONE`);

        // 2. Trigger WhatsApp Proof-of-Love to Sender
        await whatsappService.sendMessage({
            to: '+0000000000', // Senders real number would be here
            type: 'SENDER_PROOF_OF_LOVE',
            params: { recipientName, photoUrl }
        });

        return NextResponse.json({
            success: true,
            message: 'Delivery confirmed and Sender notified with photo.'
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to confirm delivery' }, { status: 500 });
    }
}
