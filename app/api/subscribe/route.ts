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
            currency,
            paymentMethod
        } = body;

        // Validate required fields
        if (!recipientName || !recipientWhatsApp || !recipientAddress) {
            return NextResponse.json(
                { success: false, error: 'Missing recipient details.' },
                { status: 400 }
            );
        }

        if (!senderId || !senderName) {
            return NextResponse.json(
                { success: false, error: 'Please log in to subscribe.' },
                { status: 401 }
            );
        }

        // 1. Create or find Recipient in DB
        const recipient = await prisma.recipient.create({
            data: {
                name: recipientName,
                whatsapp: recipientWhatsApp,
                address: recipientAddress,
                suburb: recipientSuburb,
            }
        });

        // 2. Find or resolve hamper
        let resolvedHamperId = hamperId;
        const existingHamper = await prisma.hamper.findFirst({
            where: { name: { contains: hamperId, mode: 'insensitive' } }
        });

        if (!existingHamper) {
            // Create hamper on the fly if it doesn't exist yet
            const hamper = await prisma.hamper.create({
                data: {
                    name: hamperId,
                    description: `Meat hamper pack: ${hamperId}`,
                    priceUSD: currency === 'USD' ? parseFloat(amount) : 0,
                    priceZAR: currency === 'ZAR' ? parseFloat(amount) : 0,
                    priceGBP: currency === 'GBP' ? parseFloat(amount) : 0,
                }
            });
            resolvedHamperId = hamper.id;
        } else {
            resolvedHamperId = existingHamper.id;
        }

        // 3. Calculate next delivery (upcoming Wednesday)
        const today = new Date();
        const daysUntilWed = (3 - today.getDay() + 7) % 7 || 7;
        const nextDelivery = new Date(today.getTime() + daysUntilWed * 24 * 60 * 60 * 1000);

        // 4. Create Subscription
        const subscription = await prisma.subscription.create({
            data: {
                senderId,
                recipientId: recipient.id,
                hamperId: resolvedHamperId,
                frequency: frequency || 'WEEKLY',
                nextDelivery,
            }
        });

        // 5. Auto-create a PENDING Delivery so it appears in admin Incoming immediately
        await prisma.delivery.create({
            data: {
                subscriptionId: subscription.id,
                recipientId: recipient.id,
                status: 'PENDING',
                scheduledDate: nextDelivery
            }
        });

        // 6. Record Transaction (wallet deduction)
        await prisma.transaction.create({
            data: {
                userId: senderId,
                amount: parseFloat(amount),
                type: 'DEDUCTION',
                description: `Subscription for ${recipientName} (${frequency})`,
                reference: `SUB-${subscription.id.slice(-6).toUpperCase()}`
            }
        });

        // 6. If paying from wallet, deduct from the correct currency balance
        if (paymentMethod === 'wallet') {
            const curr = (currency || 'USD').toUpperCase();
            const walletField = curr === 'ZAR' ? 'walletZAR' : curr === 'GBP' ? 'walletGBP' : 'walletUSD';

            await prisma.user.update({
                where: { id: senderId },
                data: {
                    [walletField]: { decrement: parseFloat(amount) }
                }
            });
        }

        // 7. Trigger WhatsApp notification to recipient
        await whatsappService.sendMessage({
            to: recipientWhatsApp,
            type: 'RECEIVER_HEADS_UP',
            params: { recipientName, senderName }
        });

        return NextResponse.json({
            success: true,
            subscriptionId: subscription.id,
            nextDelivery: nextDelivery.toISOString(),
            message: `Subscription created! ${recipientName} will receive a WhatsApp notification.`
        });
    } catch (error) {
        console.error('Subscription error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process subscription. Please try again.' },
            { status: 500 }
        );
    }
}
