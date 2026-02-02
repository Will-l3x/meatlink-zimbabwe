import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { whatsappService } from '@/lib/whatsapp';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            recipientName,
            recipientWhatsApp,
            recipientAddress,
            recipientSuburb,
            senderId,
            senderName,
            hamperId,
            frequency,
            amount,
            currency
        } = body;

        // 1. Create or Find Recipient
        const recipient = await prisma.recipient.create({
            data: {
                name: recipientName,
                whatsapp: recipientWhatsApp,
                address: recipientAddress,
                suburb: recipientSuburb,
            }
        });

        // 2. Create Subscription
        const subscription = await prisma.subscription.create({
            data: {
                senderId,
                recipientId: recipient.id,
                hamperId,
                frequency,
                nextDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next Wed/Weekly mock
            }
        });

        // 3. Record Transaction
        await prisma.transaction.create({
            data: {
                userId: senderId,
                amount: parseFloat(amount),
                type: 'DEDUCTION',
                description: `Subscription for ${recipientName} (${frequency})`,
                reference: `SUB-${subscription.id.substr(-6)}`
            }
        });

        // 4. Trigger WhatsApp Heads-up to Recipient
        await whatsappService.sendMessage({
            to: recipientWhatsApp,
            type: 'RECEIVER_HEADS_UP',
            params: { recipientName, senderName }
        });

        return NextResponse.json({
            success: true,
            subscriptionId: subscription.id,
            message: 'Order persisted and recipient notified via WhatsApp.'
        });
    } catch (error) {
        console.error('Subscription error:', error);
        return NextResponse.json({ success: false, error: 'Failed to process subscription' }, { status: 500 });
    }
}
