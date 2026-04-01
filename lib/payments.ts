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
        error?: string;
    }> {
        console.log(`[ZB API] Initiating transaction: ${request.currencyCode} ${request.amount} | Order: ${request.orderReference}`);

        try {
            const response = await fetch(`${ZB_CONFIG.apiUrl}/payments/payment-request/initiate-transaction`, {
                method: 'POST',
                headers: getZBHeaders(),
                body: JSON.stringify(request),
            });

            const data = await response.json();
            console.log('[ZB API] Response:', JSON.stringify(data), '| HTTP Status:', response.status);

            if (response.ok && data.paymentUrl && data.transactionReference) {
                return {
                    success: true,
                    paymentUrl: data.paymentUrl,
                    transactionReference: data.transactionReference,
                };
            }

            return {
                success: false,
                error: data.message || data.responseMessage || `ZB API error (HTTP ${response.status})`,
            };
        } catch (error) {
            console.error('[ZB API] Network error:', error);
            return {
                success: false,
                error: 'Could not connect to ZB payment gateway',
            };
        }
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
