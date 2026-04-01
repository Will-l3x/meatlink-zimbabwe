import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/payments/zb-smilenpay/callback
 * Handle ZB Smile & Pay result URL callbacks.
 * ZB sends a POST to this endpoint after payment completes.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('[ZB Callback] Received:', JSON.stringify(body));

        // ZB sends transaction data including reference, orderReference, status, amount
        const reference = body.reference || body.transactionReference;
        const orderReference = body.orderReference;
        const status = (body.status || '').toUpperCase();

        if (!reference && !orderReference) {
            console.error('[ZB Callback] No reference in callback payload');
            return NextResponse.json(
                { success: false, error: 'Missing transaction reference' },
                { status: 400 }
            );
        }

        // Find the payment by external ref or order reference
        let payment = null;
        if (orderReference) {
            payment = await prisma.payment.findFirst({
                where: { orderReference }
            });
        }
        if (!payment && reference) {
            payment = await prisma.payment.findFirst({
                where: { externalRef: reference }
            });
        }

        if (!payment) {
            console.error(`[ZB Callback] Payment not found for ref: ${reference} / order: ${orderReference}`);
            return NextResponse.json(
                { success: false, error: 'Payment not found' },
                { status: 404 }
            );
        }

        // Skip if already processed
        if (payment.status === 'COMPLETED' || payment.status === 'FAILED') {
            console.log(`[ZB Callback] Payment ${payment.id} already ${payment.status}, skipping`);
            return NextResponse.json({ success: true, message: 'Already processed' });
        }

        // Determine the new status
        let newStatus: 'COMPLETED' | 'FAILED' = 'FAILED';
        if (['SUCCESS', 'PAID', 'COMPLETED'].includes(status)) {
            newStatus = 'COMPLETED';
        }

        // Update payment record
        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: newStatus,
                callbackData: JSON.stringify(body),
            }
        });

        console.log(`[ZB Callback] Payment ${payment.id} → ${newStatus}`);

        // If completed, credit wallet for top-ups
        if (newStatus === 'COMPLETED' && payment.purpose === 'WALLET_TOPUP') {
            const curr = payment.currency.toUpperCase();
            const walletField = curr === 'ZAR' ? 'walletZAR' : curr === 'GBP' ? 'walletGBP' : 'walletUSD';

            await prisma.user.update({
                where: { id: payment.userId },
                data: { [walletField]: { increment: payment.amount } }
            });

            await prisma.transaction.create({
                data: {
                    userId: payment.userId,
                    amount: payment.amount,
                    type: 'DEPOSIT',
                    description: `Wallet top-up via ZB Smile & Pay (${curr})`,
                    reference: `ZB-${payment.orderReference || payment.id.slice(-6)}`,
                }
            });

            console.log(`[ZB Callback] Wallet credited: ${curr} ${payment.amount} for user ${payment.userId}`);
        }

        return NextResponse.json({
            success: true,
            status: newStatus,
            paymentId: payment.id,
        });

    } catch (error) {
        console.error('[ZB Callback] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Callback processing failed' },
            { status: 500 }
        );
    }
}
