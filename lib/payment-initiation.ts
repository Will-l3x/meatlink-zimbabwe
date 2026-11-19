import { getPrisma } from '@/lib/prisma';
import { paymentService } from '@/lib/payments';
import { notifyOwnerOrderPlaced } from '@/lib/order-notifications';

/**
 * Shared "start a ZB Smile & Pay checkout" logic, used by both the
 * website checkout API route and the WhatsApp bot (which calls it in-process
 * rather than over HTTP).
 */

export type PaymentPurpose = 'ORDER' | 'WALLET_TOPUP';

export interface InitiatePaymentInput {
    amount: number;
    currency: string;
    userId: string;
    purpose: PaymentPurpose;
    description?: string;
    metadata?: Record<string, unknown>;
    baseUrl: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    mobilePhoneNumber?: string;
    /** Where "Try again" on the return page should go (a site path), e.g. a renewal link. */
    retryPath?: string;
}

export type InitiatePaymentResult =
    | {
        success: true;
        paymentId: string;
        checkoutUrl: string;
        transactionReference?: string;
        orderReference: string;
    }
    | { success: false; error: string; status: number };

const SUPPORTED_CURRENCIES = ['USD', 'ZAR', 'GBP', 'ZWG'];

/** Work out the public origin for redirect URLs. */
export function resolveBaseUrl(request?: Request): string {
    if (request) {
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
        if (host) {
            const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
            return `${protocol}://${host}`;
        }
    }
    if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'http://localhost:3000';
}

export async function initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, error: 'Invalid amount', status: 400 };
    }

    const currency = String(input.currency || 'USD').toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
        return { success: false, error: `Unsupported currency: ${currency}`, status: 400 };
    }

    const db = getPrisma();
    if (!db) {
        return { success: false, error: 'Payment service is temporarily unavailable', status: 503 };
    }

    const roundedAmount = Math.round(amount * 100) / 100;
    const orderRef = `HM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const payment = await db.payment.create({
        data: {
            userId: input.userId,
            amount: roundedAmount,
            currency,
            provider: 'zb_smilenpay',
            status: 'PENDING',
            purpose: input.purpose,
            orderReference: orderRef,
            metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        },
    });

    console.log(`[ZB Payment] Calling ZB API: ${currency} ${roundedAmount} | Ref: ${orderRef} | Payment ${payment.id}`);

    const description = (input.description || 'Hexad Market order').slice(0, 240);
    const retry = input.retryPath ? `&retry=${encodeURIComponent(input.retryPath)}` : '';
    const zbResult = await paymentService.initiateTransaction({
        orderReference: orderRef,
        amount: roundedAmount,
        currencyCode: currency,
        returnUrl: `${input.baseUrl}/checkout/zb-return?paymentId=${payment.id}&orderRef=${orderRef}${retry}`,
        resultUrl: `${input.baseUrl}/api/payments/zb-smilenpay/callback`,
        cancelUrl: `${input.baseUrl}/checkout/zb-return?paymentId=${payment.id}&status=cancelled${retry}`,
        failureUrl: `${input.baseUrl}/checkout/zb-return?paymentId=${payment.id}&status=failed${retry}`,
        itemName: description,
        itemDescription: description,
        firstName: input.firstName || 'Hexad',
        lastName: input.lastName || 'Customer',
        email: input.email || 'support@hexadmarket.com',
        mobilePhoneNumber: input.mobilePhoneNumber || '0770000000',
    });

    if (!zbResult.success || !zbResult.paymentUrl) {
        await db.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } }).catch(() => undefined);
        return { success: false, error: zbResult.error || 'Failed to initiate ZB payment', status: 502 };
    }

    const finalOrderRef = zbResult.actualOrderReference || orderRef;
    await db.payment.update({
        where: { id: payment.id },
        data: {
            externalRef: zbResult.transactionReference,
            paymentUrl: zbResult.paymentUrl,
            orderReference: finalOrderRef,
        },
    });

    if (input.purpose === 'ORDER') {
        notifyOwnerOrderPlaced(payment.id).catch((e) =>
            console.error('[ZB Payment] Owner order notification failed:', e)
        );
    }

    console.log(`[ZB Payment] ✅ Session created → URL: ${zbResult.paymentUrl}`);

    return {
        success: true,
        paymentId: payment.id,
        checkoutUrl: zbResult.paymentUrl,
        transactionReference: zbResult.transactionReference,
        orderReference: finalOrderRef,
    };
}
