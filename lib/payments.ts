/**
 * ZB Smile & Pay Payment Gateway Service
 * Uses the real ZB Payments Gateway API (OpenAPI spec).
 * 
 * Key endpoints:
 * - POST /payments/initiate-transaction → Creates a payment, returns paymentUrl
 * - GET  /payments/transaction/{ref}/status/check → Polls payment status
 * - POST /payments/ecocash-payment → Direct Ecocash payment
 * - POST /payments/innbucks-payment → Direct InnBucks payment
 */

// ZB API Configuration
const ZB_CONFIG = {
    apiKey: process.env.ZB_API_KEY || '',
    apiSecret: process.env.ZB_API_SECRET || '',
    apiUrl: process.env.ZB_API_URL || 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway',
    isSandbox: process.env.ZB_SANDBOX !== 'false',
};

// Common headers for all ZB API calls
function getZBHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'x-api-key': ZB_CONFIG.apiKey,
        'x-api-secret': ZB_CONFIG.apiSecret,
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

// ---------- Payment Service ----------

export const paymentService = {
    /**
     * Create a ZB payment session via the /payments/initiate-transaction endpoint.
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
                
                // Deep clone and update the order reference
                const payload = { ...request, orderReference: currentOrderRef };

                const response = await fetch(`${ZB_CONFIG.apiUrl}/payments/payment-request/initiate-transaction`, {
                    method: 'POST',
                    headers: getZBHeaders(),
                    body: JSON.stringify(payload),
                });

                const data = await response.json();
                console.log('[ZB API] Response:', JSON.stringify(data), '| HTTP Status:', response.status);

                if (response.ok && data.paymentUrl && data.transactionReference) {
                    return {
                        success: true,
                        paymentUrl: data.paymentUrl,
                        transactionReference: data.transactionReference,
                        actualOrderReference: currentOrderRef,
                    };
                }

                lastError = data.message || data.responseMessage || `ZB API error (HTTP ${response.status})`;

                // Handle server errors OR duplicate order error by retrying
                if ((response.status >= 500 || data.responseMessage === 'Suspected duplicate orderId') && attempt < MAX_RETRIES) {
                    console.log(`[ZB API] Transient error, retrying in 1s...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                break;
            } catch (error: any) {
                console.error(`[ZB API] Network error on attempt ${attempt}:`, error.message);
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
                `${ZB_CONFIG.apiUrl}/payments/transaction/${orderReference}/status/check`,
                { headers: getZBHeaders() }
            );

            const data: CheckStatusResponse = await response.json();
            console.log('[ZB API] Status response:', JSON.stringify(data));

            return {
                success: true,
                status: data.status,
                data,
            };
        } catch (error) {
            console.error('[ZB API] Status check error:', error);
            return {
                success: false,
                error: 'Could not check payment status',
            };
        }
    },

    /**
     * Fetch a transaction by reference.
     */
    async fetchTransaction(reference: string) {
        try {
            const response = await fetch(
                `${ZB_CONFIG.apiUrl}/payments/fetch-transaction-by-reference?reference=${reference}`,
                { headers: getZBHeaders() }
            );
            return await response.json();
        } catch (error) {
            console.error('[ZB API] Fetch transaction error:', error);
            return null;
        }
    },

    /**
     * Cancel a payment by order reference.
     */
    async cancelPayment(orderReference: string) {
        try {
            const response = await fetch(
                `${ZB_CONFIG.apiUrl}/payments/cancel/${orderReference}`,
                { method: 'POST', headers: getZBHeaders() }
            );
            return await response.json();
        } catch (error) {
            console.error('[ZB API] Cancel error:', error);
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
