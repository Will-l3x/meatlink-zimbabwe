import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { paymentService, mapZBStatus } from '@/lib/payments';
import { initiatePayment, resolveBaseUrl } from '@/lib/payment-initiation';
import { settlePayment } from '@/lib/payment-settlement';
import { fulfilledSubscriptionId } from '@/lib/order-fulfillment';
import { requireSession } from '@/lib/session';

/**
 * POST /api/payments/zb-smilenpay
 * Start a ZB Smile & Pay checkout for the logged-in user.
 */
export async function POST(request: Request) {
    const guard = requireSession(request);
    if (guard.response) return guard.response;

    try {
        const body = await request.json();
        const { amount, currency, purpose, description, metadata } = body;

        console.log('[ZB Payment] Received request:', JSON.stringify({ amount, currency, purpose, userId: guard.session.uid }));

        if (amount === undefined || amount === null || !currency) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: amount, currency' },
                { status: 400 }
            );
        }

        const result = await initiatePayment({
            amount: Number(amount),
            currency: String(currency),
            userId: guard.session.uid,
            purpose: purpose === 'WALLET_TOPUP' ? 'WALLET_TOPUP' : 'ORDER',
            description: typeof description === 'string' ? description : undefined,
            metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
            baseUrl: resolveBaseUrl(request),
            firstName: typeof body.firstName === 'string' ? body.firstName : undefined,
            lastName: typeof body.lastName === 'string' ? body.lastName : undefined,
            email: typeof body.email === 'string' ? body.email : undefined,
            mobilePhoneNumber: typeof body.mobilePhoneNumber === 'string' ? body.mobilePhoneNumber : undefined,
        });

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: result.status });
        }

        return NextResponse.json({
            success: true,
            paymentId: result.paymentId,
            checkoutUrl: result.checkoutUrl,
            transactionReference: result.transactionReference,
            orderReference: result.orderReference,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[ZB Payment] Error:', message, error instanceof Error ? error.stack : undefined);
        return NextResponse.json(
            { success: false, error: 'Failed to start payment. Please try again.' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/payments/zb-smilenpay?paymentId=xxx&orderRef=xxx
 * Check (and, if ZB reports a final state, settle) a payment.
 * Used by the return page, including for WhatsApp customers who have no
 * website session, so it is keyed on the unguessable payment id.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const paymentId = searchParams.get('paymentId');
        const orderRef = searchParams.get('orderRef');

        const db = getPrisma();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Payment service is unavailable' }, { status: 503 });
        }

        let payment =
            paymentId && paymentId !== 'none' && /^[a-f0-9]{24}$/i.test(paymentId)
                ? await db.payment.findUnique({ where: { id: paymentId } })
                : orderRef
                    ? await db.payment.findFirst({ where: { orderReference: orderRef } })
                    : null;

        if (!payment) {
            return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
        }

        if (payment.status === 'PENDING') {
            const reference = payment.orderReference || orderRef;
            if (reference) {
                const zbStatus = await paymentService.checkTransactionStatus(reference);
                if (zbStatus.success) {
                    const mapped = mapZBStatus(zbStatus.status);
                    if (mapped !== 'PENDING') {
                        payment = (await settlePayment(payment.id, mapped, zbStatus.data)) ?? payment;
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                amount: payment.amount,
                currency: payment.currency,
                purpose: payment.purpose,
                orderReference: payment.orderReference,
                subscriptionId: fulfilledSubscriptionId(payment.metadata),
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[ZB Payment] Status check error:', message);
        return NextResponse.json(
            { success: false, error: 'Status check failed' },
            { status: 500 }
        );
    }
}
