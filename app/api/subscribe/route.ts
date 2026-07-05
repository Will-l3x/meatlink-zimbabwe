import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
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
            hamperName,
            frequency,
            amount,
            currency,
            paymentMethod
        } = body;

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

        const db = getPrisma();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Subscription service is temporarily unavailable' }, { status: 503 });
        }

        let recipient = await db.recipient.findFirst({
            where: { whatsapp: String(recipientWhatsApp).trim() }
        });

        if (!recipient) {
            recipient = await db.recipient.create({
                data: {
                    name: String(recipientName).trim(),
                    whatsapp: String(recipientWhatsApp).trim(),
                    address: String(recipientAddress).trim(),
                    suburb: String(recipientSuburb || 'Harare').trim(),
                }
            });
        }

        const resolvedHamperName = String(hamperName || hamperId || 'MeatLink Hamper').trim();
        let resolvedHamperId = String(hamperId || '').trim();
        const existingHamper = await db.hamper.findFirst({
            where: { name: { contains: resolvedHamperName, mode: 'insensitive' } }
        });

        if (!existingHamper) {
            const hamper = await db.hamper.create({
                data: {
                    name: resolvedHamperName,
                    description: `Meat hamper pack: ${resolvedHamperName}`,
                    priceUSD: currency === 'USD' ? Number(amount) : 0,
                    priceZAR: currency === 'ZAR' ? Number(amount) : 0,
                    priceGBP: currency === 'GBP' ? Number(amount) : 0,
                }
            });
            resolvedHamperId = hamper.id;
        } else {
            resolvedHamperId = existingHamper.id;
        }

        const today = new Date();
        const daysUntilWed = (3 - today.getDay() + 7) % 7 || 7;
        const nextDelivery = new Date(today.getTime() + daysUntilWed * 24 * 60 * 60 * 1000);

        const subscription = await db.subscription.create({
            data: {
                senderId,
                recipientId: recipient.id,
                hamperId: resolvedHamperId,
                frequency: frequency || 'WEEKLY',
                nextDelivery,
            }
        });

        await db.delivery.create({
            data: {
                subscriptionId: subscription.id,
                recipientId: recipient.id,
                status: 'PENDING',
                scheduledDate: nextDelivery
            }
        });

        await db.transaction.create({
            data: {
                userId: senderId,
                amount: Number(amount),
                type: 'DEDUCTION',
                description: `Subscription for ${recipientName} (${frequency || 'WEEKLY'})`,
                reference: `SUB-${subscription.id.slice(-6).toUpperCase()}`
            }
        });

        if (paymentMethod === 'wallet') {
            const curr = (currency || 'USD').toUpperCase();
            const walletField = curr === 'ZAR' ? 'walletZAR' : curr === 'GBP' ? 'walletGBP' : 'walletUSD';

            await db.user.update({
                where: { id: senderId },
                data: {
                    [walletField]: { decrement: Number(amount) }
                }
            });
        }

        await whatsappService.sendMessage({
            to: String(recipientWhatsApp).trim(),
            text: `Hi ${recipientName}! 🍗 Your meat pack from ${senderName} is arriving today between 10 AM and 12 PM. Please ensure someone is home to receive it. Thank you for using Hexad Market!`
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
