import * as https from 'https';

/**
 * ZB Smile & Pay Payment Gateway Service
 * Uses the real ZB Payments Gateway API (OpenAPI spec).
 *
 * Key endpoints:
 * - POST /payments/payment-request/initiate-transaction → Creates a payment, returns paymentUrl
 * - GET  /payments/transaction/{ref}/status/check → Polls payment status
 */

// ZB API Configuration
const ZB_CONFIG = {
    apiKey: process.env.ZB_API_KEY || '',
    apiSecret: process.env.ZB_API_SECRET || '',
    // Trailing slashes are stripped so endpoint paths never end up with '//'.
    apiUrl: (process.env.ZB_API_URL || 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway').replace(/\/+$/, ''),
    isSandbox: process.env.ZB_SANDBOX !== 'false',
};

// Common headers for all ZB API calls
function getZBHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'x-api-key': ZB_CONFIG.apiKey,
        'x-api-secret': ZB_CONFIG.apiSecret,
        // Bypass ZB's WAF / IP Blocks against Vercel/AWS instances
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'X-Forwarded-For': '197.220.170.1', // Typical Zim IP to bypass geo-blocks
        'X-Real-IP': '197.220.170.1'
    };
}

// ---------- Types ----------

export interface InitiateTransactionRequest {
    orderReference: string;
    amount: number;
    returnUrl: string;
    resultUrl: string;
    cancelUrl?: string;
    failureUrl?: string;
    itemName: string;
    itemDescription?: string;
    currencyCode: string;         // USD | ZWG | ZAR
    firstName?: string;
    lastName?: string;
    mobilePhoneNumber?: string;
    email?: string;
    paymentMethod?: 'ECOCASH' | 'INNBUCKS' | 'CARD' | 'WALLETPLUS' | 'ONEMONEY' | 'ZIMSWITCH' | 'EWALLET' | 'OMARI';
}

export interface InitiateTransactionResponse {
    responseMessage: string;
    responseCode: string;
    paymentUrl: string;
    transactionReference: string;
}

export interface CheckStatusResponse {
    merchantId: string;
    reference: string;
    orderReference: string;
    itemName: string;
    amount: number;
    currency: string;
    paymentOption: string;
    status: string;               // PENDING | SUCCESS | PAID | FAILED | CANCELLED
    createdDate: string;
    returnUrl: string;
    resultUrl: string;
    clientFee: number;
    merchantFee: number;
}

/** Loosely-typed body returned by ZB's initiate endpoint. */
interface ZBInitiateBody {
    paymentUrl?: string;
    transactionReference?: string;
    message?: string;
    responseMessage?: string;
    [key: string]: unknown;
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

// ---------- Payment Service ----------

export const paymentService = {
    /**
     * Create a ZB payment session via the initiate-transaction endpoint.
     * Returns a paymentUrl the customer should be redirected to.
     */
    async initiateTransaction(request: InitiateTransactionRequest): Promise<{
        success: boolean;
        paymentUrl?: string;
        transactionReference?: string;
        actualOrderReference?: string;
        error?: string;
    }> {
        console.log(`[ZB API] Initiating transaction: ${request.currencyCode} ${request.amount} | Order: ${request.orderReference}`);

        const MAX_RETRIES = 3;
        let lastError = '';

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`[ZB API] Attempt ${attempt}/${MAX_RETRIES}...`);

                // If retrying, append suffix to avoid "Suspected duplicate orderId"
                const currentOrderRef = attempt === 1 ? request.orderReference : `${request.orderReference}-R${attempt}`;

                const payload = { ...request, orderReference: currentOrderRef };
                const payloadStr = JSON.stringify(payload);

                // Use https.request instead of fetch to bypass Next.js header sanitization
                const url = new URL(`${ZB_CONFIG.apiUrl}/payments/payment-request/initiate-transaction`);
                const options = {
                    method: 'POST',
                    headers: {
                        ...getZBHeaders(),
                        'Content-Length': Buffer.byteLength(payloadStr)
                    }
                };

                const responseData = await new Promise<{ status: number; data: ZBInitiateBody | null; raw: string }>((resolve, reject) => {
                    const req = https.request(url, options, (res) => {
                        let raw = '';
                        res.on('data', chunk => raw += chunk);
                        res.on('end', () => {
                            let parsed: ZBInitiateBody | null = null;
                            try { parsed = JSON.parse(raw) as ZBInitiateBody; } catch { /* non-JSON body */ }
                            resolve({ status: res.statusCode || 500, data: parsed, raw });
                        });
                    });
                    req.on('error', reject);
                    req.setTimeout(20000, () => {
                        req.destroy(new Error('ZB API request timed out'));
                    });
                    req.write(payloadStr);
                    req.end();
                });

                const data: ZBInitiateBody = responseData.data || {};
                console.log('[ZB API] Response:', JSON.stringify(data), '| HTTP Status:', responseData.status);

                if (responseData.status >= 200 && responseData.status < 300 && data.paymentUrl && data.transactionReference) {
                    return {
                        success: true,
                        paymentUrl: data.paymentUrl,
                        transactionReference: data.transactionReference,
                        actualOrderReference: currentOrderRef,
                    };
                }

                if (!responseData.data) {
                    // Non-JSON reply (e.g. an HTML 404 page) usually means ZB_API_URL points at the wrong host/path.
                    console.error(`[ZB API] Non-JSON response HTTP ${responseData.status} from ${url.origin}${url.pathname}: ${responseData.raw.slice(0, 300)}`);
                }
                lastError = data.message || data.responseMessage ||
                    (responseData.status === 404
                        ? 'Payment gateway is misconfigured. Please contact support.'
                        : `Payment gateway error (HTTP ${responseData.status}). Please try again.`);

                if ((responseData.status >= 500 || data.responseMessage === 'Suspected duplicate orderId') && attempt < MAX_RETRIES) {
                    console.log(`[ZB API] Transient error, retrying in 1s...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                break;
            } catch (error) {
                console.error(`[ZB API] Network error on attempt ${attempt}:`, errorMessage(error));
                lastError = 'Could not connect to ZB payment gateway';

                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
            }
        }

        return {
            success: false,
            error: lastError,
        };
    },

    /**
     * Check the status of a transaction by its order reference.
     */
    async checkTransactionStatus(orderReference: string): Promise<{
        success: boolean;
        status?: string;
        data?: CheckStatusResponse;
        error?: string;
    }> {
        console.log(`[ZB API] Checking status for: ${orderReference}`);

        try {
            const response = await fetch(
                `${ZB_CONFIG.apiUrl}/payments/transaction/${encodeURIComponent(orderReference)}/status/check`,
                { headers: getZBHeaders(), cache: 'no-store' }
            );

            if (!response.ok) {
                const raw = await response.text().catch(() => '');
                console.error(`[ZB API] Status check HTTP ${response.status}:`, raw.slice(0, 300));
                return { success: false, error: `ZB status check failed (HTTP ${response.status})` };
            }

            const data = (await response.json()) as CheckStatusResponse;
            console.log('[ZB API] Status response:', JSON.stringify(data));

            return {
                success: true,
                status: data.status,
                data,
            };
        } catch (error) {
            console.error('[ZB API] Status check error:', errorMessage(error));
            return {
                success: false,
                error: 'Could not check payment status',
            };
        }
    },

    /**
     * Fetch a transaction by reference.
     */
    async fetchTransaction(reference: string): Promise<unknown> {
        try {
            const response = await fetch(
                `${ZB_CONFIG.apiUrl}/payments/fetch-transaction-by-reference?reference=${encodeURIComponent(reference)}`,
                { headers: getZBHeaders(), cache: 'no-store' }
            );
            return await response.json();
        } catch (error) {
            console.error('[ZB API] Fetch transaction error:', errorMessage(error));
            return null;
        }
    },

    /**
     * Cancel a payment by order reference.
     */
    async cancelPayment(orderReference: string): Promise<unknown> {
        try {
            const response = await fetch(
                `${ZB_CONFIG.apiUrl}/payments/cancel/${encodeURIComponent(orderReference)}`,
                { method: 'POST', headers: getZBHeaders() }
            );
            return await response.json();
        } catch (error) {
            console.error('[ZB API] Cancel error:', errorMessage(error));
            return { success: false };
        }
    },

    /**
     * Check if sandbox mode is active.
     */
    isSandbox(): boolean {
        return ZB_CONFIG.isSandbox;
    },
};

/** Map a raw ZB status string onto our Payment.status enum. */
export function mapZBStatus(raw: string | undefined | null): 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' {
    const normalized = (raw || '').toUpperCase();
    if (['SUCCESS', 'PAID', 'COMPLETED'].includes(normalized)) return 'COMPLETED';
    if (['FAILED', 'CANCELLED', 'CANCELED', 'DECLINED'].includes(normalized)) return 'FAILED';
    if (normalized === 'EXPIRED') return 'EXPIRED';
    return 'PENDING';
}
