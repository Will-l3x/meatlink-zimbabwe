import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { paymentService, mapZBStatus } from '@/lib/payments';
import { settlePayment } from '@/lib/payment-settlement';

/**
 * POST /api/payments/zb-smilenpay/callback
 * ZB Smile & Pay result URL. The posted body is treated only as a hint:
 * the final status is always re-read from ZB before anything is settled,
 * so a forged callback cannot mark an order as paid.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        console.log('[ZB Callback] Received:', JSON.stringify(body));

        const reference = body.reference || body.transactionReference;
        const orderReference = body.orderReference;

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
            payment = await db.payment.findFirst({ where: { orderReference: String(orderReference) } });
        }
        if (!payment && reference) {
            payment = await db.payment.findFirst({ where: { externalRef: String(reference) } });
        }

        if (!payment) {
            console.error(`[ZB Callback] Payment not found for ref: ${reference} / order: ${orderReference}`);
            return NextResponse.json(
                { success: false, error: 'Payment not found' },
                { status: 404 }
            );
        }

        if (payment.status !== 'PENDING') {
            console.log(`[ZB Callback] Payment ${payment.id} already ${payment.status}`);
            // Re-run idempotent fulfilment in case it was missed earlier.
            await settlePayment(payment.id, payment.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED', body);
            return NextResponse.json({ success: true, message: 'Already processed' });
        }

        const verifyRef = payment.orderReference || String(orderReference || '');
        const verified = await paymentService.checkTransactionStatus(verifyRef);
        if (!verified.success) {
            console.warn(`[ZB Callback] Could not verify ${verifyRef} with ZB; leaving PENDING`);
            return NextResponse.json(
                { success: false, error: 'Could not verify transaction with ZB' },
                { status: 202 }
            );
        }

        const mapped = mapZBStatus(verified.status);
        if (mapped === 'PENDING') {
            return NextResponse.json({ success: true, status: 'PENDING' });
        }

        const settled = await settlePayment(payment.id, mapped, { callback: body, verified: verified.data });

        return NextResponse.json({
            success: true,
            status: settled?.status ?? mapped,
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
