import { NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { recipientName, senderName, recipientWhatsApp, hamperName } = body;

        // 1. In real life, create record in DB via Prisma
        console.log(`[API] Creating subscription for ${recipientName} (${hamperName})`);

        // 2. Trigger WhatsApp Heads-up to Recipient
        await whatsappService.sendMessage({
            to: recipientWhatsApp,
            type: 'RECEIVER_HEADS_UP',
            params: { recipientName, senderName }
        });

        return NextResponse.json({
            success: true,
            message: 'Subscription created and recipient notified via WhatsApp.'
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to process subscription' }, { status: 500 });
    }
}
