import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { whatsappService } from '@/lib/whatsapp';
import { requireSession } from '@/lib/session';
import { nextDeliveryDate } from '@/lib/order-fulfillment';

/**
 * POST /api/subscribe — create a subscription for the logged-in user.
 * Paid website/WhatsApp orders are fulfilled server-side from the payment
 * record (see lib/order-fulfillment.ts); this route remains for manual /
 * wallet-funded subscriptions.
 */
export async function POST(request: Request) {
    const guard = requireSession(request);
    if (guard.response) return guard.response;

    try {
        const body = await request.json();
        const {
            recipientName,
            recipientWhatsApp,
            recipientAddress,
            recipientSuburb,
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

        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
            return NextResponse.json({ success: false, error: 'Invalid amount.' }, { status: 400 });
        }

        const db = getPrisma();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Subscription service is temporarily unavailable' }, { status: 503 });
        }

        const sender = await db.user.findUnique({ where: { id: guard.session.uid }, select: { id: true, name: true } });
        if (!sender) {
            return NextResponse.json({ success: false, error: 'Please log in to subscribe.' }, { status: 401 });
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

        const resolvedHamperName = String(hamperName || hamperId || 'Hexad Market Hamper').trim().slice(0, 200);
        const curr = String(currency || 'USD').toUpperCase();
        const hamper = await db.hamper.upsert({
            where: { name: resolvedHamperName },
            update: {},
            create: {
                name: resolvedHamperName,
                description: `Meat hamper pack: ${resolvedHamperName}`,
                priceUSD: curr === 'USD' ? parsedAmount : 0,
                priceZAR: curr === 'ZAR' ? parsedAmount : 0,
                priceGBP: curr === 'GBP' ? parsedAmount : 0,
            }
        });

        const validFrequency = frequency === 'BI_WEEKLY' || frequency === 'MONTHLY' ? frequency : 'WEEKLY';
        const nextDelivery = nextDeliveryDate();

        const subscription = await db.subscription.create({
            data: {
                senderId: sender.id,
                recipientId: recipient.id,
                hamperId: hamper.id,
                frequency: validFrequency,
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

        if (paymentMethod === 'wallet' && parsedAmount > 0) {
            const walletField = curr === 'ZAR' ? 'walletZAR' : curr === 'GBP' ? 'walletGBP' : 'walletUSD';
            const current = await db.user.findUnique({ where: { id: sender.id }, select: { [walletField]: true } }) as Record<string, number> | null;
            if (!current || (current[walletField] ?? 0) < parsedAmount) {
                await db.delivery.deleteMany({ where: { subscriptionId: subscription.id } });
                await db.subscription.delete({ where: { id: subscription.id } });
                return NextResponse.json({ success: false, error: 'Insufficient wallet balance.' }, { status: 402 });
            }

            await db.user.update({
                where: { id: sender.id },
                data: { [walletField]: { decrement: parsedAmount } }
            });

            await db.transaction.create({
                data: {
                    userId: sender.id,
                    amount: parsedAmount,
                    type: 'DEDUCTION',
                    description: `Subscription for ${recipientName} (${validFrequency})`,
                    reference: `SUB-${subscription.id.slice(-6).toUpperCase()}`
                }
            });
        }

        const dateLabel = nextDelivery.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
        await whatsappService.sendMessage({
            to: String(recipientWhatsApp).trim(),
            text: `Hi ${recipientName}! 🥩 ${sender.name} has set up a meat delivery for you from Hexad Market. Your first delivery is scheduled for ${dateLabel}. We'll message you when it's on its way.`
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
