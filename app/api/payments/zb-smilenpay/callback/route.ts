import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { notifyOrderPaymentCompleted } from '@/lib/order-notifications';

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

        const db = getPrisma();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Payment callback service is unavailable' }, { status: 503 });
        }

        let payment = null;
        if (orderReference) {
            payment = await db.payment.findFirst({
                where: { orderReference }
            });
        }
        if (!payment && reference) {
            payment = await db.payment.findFirst({
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

        // Skip if already processed (still attempt order notifications if missed)
        if (payment.status === 'COMPLETED' || payment.status === 'FAILED') {
            console.log(`[ZB Callback] Payment ${payment.id} already ${payment.status}, skipping`);
            if (payment.status === 'COMPLETED' && payment.purpose === 'ORDER') {
                await notifyOrderPaymentCompleted(payment.id);
            }
            return NextResponse.json({ success: true, message: 'Already processed' });
        }

        // Determine the new status
        let newStatus: 'COMPLETED' | 'FAILED' = 'FAILED';
        if (['SUCCESS', 'PAID', 'COMPLETED'].includes(status)) {
            newStatus = 'COMPLETED';
        }

        // Update payment record
        await db.payment.update({
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

            await db.user.update({
                where: { id: payment.userId },
                data: { [walletField]: { increment: payment.amount } }
            });

            await db.transaction.create({
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

        if (newStatus === 'COMPLETED' && payment.purpose === 'ORDER') {
            await notifyOrderPaymentCompleted(payment.id);
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
