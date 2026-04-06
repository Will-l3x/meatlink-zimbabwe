import https from 'https';

/**
 * WhatsApp Business API Service (Meta Cloud API)
 * Sends messages via the Meta Graph API.
 */

interface SendMessageOptions {
    to: string;
    text?: string;
    interactive?: any;
}

export const whatsappService = {
    /**
     * Send a WhatsApp message using the Meta Cloud API
     */
    async sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
        // Read env vars at call time (not module load time) for serverless compatibility
        const API_TOKEN = process.env.WHATSAPP_TOKEN;
        const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const API_VERSION = 'v20.0';

        const { to, text, interactive } = options;
        const cleanNumber = to.replace(/\D/g, '');

        const payload: any = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanNumber,
        };

        if (interactive) {
            payload.type = "interactive";
            payload.interactive = interactive;
        } else if (text) {
            payload.type = "text";
            payload.text = { preview_url: false, body: text };
        } else {
            console.warn('[WhatsApp API] No text or interactive content provided');
            return { success: false, error: 'No message content' };
        }

        // If credentials are missing, log and return (don't crash)
        if (!API_TOKEN || !PHONE_NUMBER_ID) {
            console.error(`[WhatsApp API] ❌ MISSING CREDENTIALS - Token: ${API_TOKEN ? 'SET' : 'MISSING'}, PhoneID: ${PHONE_NUMBER_ID ? 'SET' : 'MISSING'}`);
            console.log(`[WhatsApp API] Would have sent to ${cleanNumber}:`, text?.slice(0, 100));
            return { success: false, error: 'WhatsApp credentials not configured' };
        }

        console.log(`[WhatsApp API] Sending to ${cleanNumber} via ${PHONE_NUMBER_ID}...`);

        return new Promise((resolve) => {
            const body = JSON.stringify(payload);
            const reqOptions = {
                hostname: 'graph.facebook.com',
                port: 443,
                path: `/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Length': Buffer.byteLength(body)
                }
            };

            const req = https.request(reqOptions, (res) => {
                let responseData = '';
                res.on('data', (chunk) => { responseData += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(responseData);
                        if (res.statusCode === 200) {
                            console.log(`[WhatsApp API] ✅ Sent to ${cleanNumber}, msgId: ${json.messages?.[0]?.id}`);
                            resolve({ success: true, messageId: json.messages?.[0]?.id });
                        } else {
                            console.error(`[WhatsApp API] ❌ HTTP ${res.statusCode}:`, JSON.stringify(json));
                            resolve({ success: false, error: json.error?.message || `HTTP ${res.statusCode}` });
                        }
                    } catch (e) {
                        console.error(`[WhatsApp API] ❌ Parse error. Raw response:`, responseData.slice(0, 500));
                        resolve({ success: false, error: 'Failed to parse API response' });
                    }
                });
            });

            req.on('error', (error) => {
                console.error(`[WhatsApp API] ❌ Network error:`, error.message);
                resolve({ success: false, error: error.message });
            });

            req.setTimeout(15000, () => {
                console.error(`[WhatsApp API] ❌ Timeout after 15s`);
                req.destroy();
                resolve({ success: false, error: 'Request timed out' });
            });

            req.write(body);
            req.end();
        });
    }
};
