import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { paymentService, mapZBStatus } from '@/lib/payments';
import { initiatePayment, resolveBaseUrl } from '@/lib/payment-initiation';
import { settlePayment } from '@/lib/payment-settlement';
import { fulfilledSubscriptionId } from '@/lib/order-fulfillment';
import { requireSession } from '@/lib/session';
import { priceCart, type Currency } from '@/lib/catalog';
import { PLAN_ID } from '@/lib/plans';
import { fullAddress, planDeliveriesLabel, planFrequency, PLAN_FREQUENCIES } from '@/lib/delivery';

/**
 * POST /api/payments/zb-smilenpay
 * Start a ZB Smile & Pay checkout for the logged-in user.
 */
const ORDER_CURRENCIES: Currency[] = ['USD', 'ZAR', 'GBP'];
const MAX_TOPUP = 5000;

function text(value: unknown, max = 200): string {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

type BuiltOrder =
    | { ok: true; amount: number; metadata: Record<string, unknown>; description: string }
    | { ok: false; error: string; status: number };

/**
 * Work out an ORDER's price on the server from the catalogue, and build its
 * metadata from known fields only. Never trust the browser's amount, prices or
 * extra metadata keys (e.g. a forged `renewalOf` would top up a plan for free).
 */
function buildOrder(body: Record<string, unknown>, currency: Currency): BuiltOrder {
    const meta = (body.metadata && typeof body.metadata === 'object' ? body.metadata : {}) as Record<string, unknown>;

    const priced = priceCart(meta.cartItems ?? meta.cart, currency);
    if (!priced.ok) return { ok: false, error: priced.error, status: 400 };

    const recipientName = text(meta.recipientName, 100);
    const recipientWhatsApp = text(meta.recipientWhatsApp, 30);
    // One full address (house number, street, suburb); older clients may still send the suburb separately.
    const recipientAddress = fullAddress(text(meta.recipientAddress, 300), text(meta.recipientSuburb, 100));
    const digits = recipientWhatsApp.replace(/\D/g, '').length;
    if (!recipientName || !recipientAddress || digits < 9 || digits > 15) {
        return { ok: false, error: 'Please check the delivery details and try again.', status: 400 };
    }

    const isPlan = meta.plan === PLAN_ID;
    const freq = planFrequency(meta.planFrequency);
    const deliveries = isPlan ? PLAN_FREQUENCIES[freq].deliveries : 1;
    const amount = Math.round(priced.total * deliveries * 100) / 100;

    // The customer confirmed a total on screen; if it doesn't match, don't charge something else.
    const shown = Number(body.amount);
    if (!Number.isFinite(shown) || Math.abs(shown - amount) > 0.02) {
        return {
            ok: false,
            status: 409,
            error: `Prices have been updated since you added these items. The correct total is ${currency} ${amount.toFixed(2)}. Please refresh the page and try again.`,
        };
    }

    const autoRenew = isPlan ? meta.autoRenew !== false : undefined;
    const metadata: Record<string, unknown> = {
        source: 'website_checkout',
        cartItems: priced.lines.map(({ id, title, kg, price }) => ({ id, title, kg, price })),
        recipientName,
        recipientWhatsApp,
        recipientAddress,
        senderName: text(meta.senderName, 100),
        ...(isPlan ? { plan: PLAN_ID, planFrequency: freq, autoRenew, payerWhatsApp: autoRenew ? text(meta.payerWhatsApp, 30) : '' } : {}),
    };
    const items = priced.lines.map((l) => `${l.title} (${l.kg}kg)`).join(', ');
    const description = `${isPlan ? `Plan, ${planDeliveriesLabel(freq)}: ` : ''}${items}`.slice(0, 240);
    return { ok: true, amount, metadata, description };
}

/**
 * POST /api/payments/zb-smilenpay
 * Start a ZB Smile & Pay checkout for the logged-in user.
 */
export async function POST(request: Request) {
    const guard = requireSession(request);
    if (guard.response) return guard.response;

    try {
        const body = (await request.json()) as Record<string, unknown>;
        const purpose = body.purpose === 'WALLET_TOPUP' ? 'WALLET_TOPUP' : 'ORDER';
        const currency = String(body.currency || 'USD').toUpperCase() as Currency;

        console.log('[ZB Payment] Received request:', JSON.stringify({ amount: body.amount, currency, purpose, userId: guard.session.uid }));

        let amount: number;
        let metadata: Record<string, unknown> | undefined;
        let description: string;

        if (purpose === 'ORDER') {
            if (!ORDER_CURRENCIES.includes(currency)) {
                return NextResponse.json({ success: false, error: `Unsupported currency: ${currency}` }, { status: 400 });
            }
            const order = buildOrder(body, currency);
            if (!order.ok) {
                return NextResponse.json({ success: false, error: order.error }, { status: order.status });
            }
            ({ amount, metadata, description } = order);
        } else {
            // Wallet top-ups: the customer chooses the amount, within limits.
            amount = Math.round(Number(body.amount) * 100) / 100;
            if (!Number.isFinite(amount) || amount < 1 || amount > MAX_TOPUP) {
                return NextResponse.json({ success: false, error: `Top-ups must be between 1 and ${MAX_TOPUP}.` }, { status: 400 });
            }
            description = `Hexad Market wallet top-up (${currency})`;
        }

        const result = await initiatePayment({
            amount,
            currency,
            userId: guard.session.uid,
            purpose,
            description,
            metadata,
            baseUrl: resolveBaseUrl(request),
            firstName: text(body.firstName, 60) || undefined,
            lastName: text(body.lastName, 60) || undefined,
            email: text(body.email, 120) || undefined,
            mobilePhoneNumber: text(body.mobilePhoneNumber, 20) || undefined,
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

function planFrequencyOf(metadata: string | null) {
    try {
        return planFrequency(JSON.parse(metadata || '{}')?.planFrequency);
    } catch {
        return planFrequency(null);
    }
}

/** What the return page should say: a one-off order, a new plan, or a plan renewal. */
function orderKind(metadata: string | null): 'single' | 'plan' | 'renewal' {
    try {
        const meta = JSON.parse(metadata || '{}');
        if (meta?.renewalOf) return 'renewal';
        if (meta?.plan === 'MONTHLY') return 'plan';
    } catch {
        // treat unreadable metadata as a single order
    }
    return 'single';
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
                kind: orderKind(payment.metadata),
                planFrequency: planFrequencyOf(payment.metadata),
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
