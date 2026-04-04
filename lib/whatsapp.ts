import https from 'https';

/**
 * WhatsApp Business API Service (Meta Cloud API)
 */

type MessageType = 'RECEIVER_HEADS_UP' | 'SENDER_PROOF_OF_LOVE' | 'OTP' | 'MENU_GREETING' | 'HAMPER_LIST' | 'ORDER_CONFIRMATION' | 'PAYMENT_LINK';

interface SendMessageOptions {
    to: string;
    type?: MessageType;
    text?: string;
    template?: string;
    params?: Record<string, string>;
    interactive?: any;
}

const API_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = 'v20.0';

export const whatsappService = {
    /**
     * Send a WhatsApp message using the Meta Cloud API
     */
    async sendMessage(options: SendMessageOptions) {
        const { to, type, text, interactive } = options;

        let payload: any = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to.replace(/\D/g, ''), // Ensure numbers only
        };

        if (interactive) {
            payload.type = "interactive";
            payload.interactive = interactive;
        } else if (text) {
            payload.type = "text";
            payload.text = { body: text };
        } else if (type) {
            // For template messages or pre-defined logic
            const content = this.getTemplate(type, options.params || {});
            payload.type = "text";
            payload.text = { body: content };
        }

        console.log(`[WhatsApp API] Sending message to ${to}...`);

        if (!API_TOKEN || !PHONE_NUMBER_ID) {
            console.warn('[WhatsApp API] Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID. Logging to console instead.');
            console.log(`[WhatsApp API] Payload:`, JSON.stringify(payload, null, 2));
            return { success: true, messageId: 'mock_id', status: 'mock_sent' };
        }

        return new Promise((resolve, reject) => {
            const data = JSON.stringify(payload);
            const reqOptions = {
                hostname: 'graph.facebook.com',
                port: 443,
                path: `/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Length': data.length
                }
            };

            const req = https.request(reqOptions, (res) => {
                let responseData = '';
                res.on('data', (chunk) => { responseData += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(responseData);
                        if (res.statusCode === 200) {
                            console.log(`[WhatsApp API] ✅ Message sent to ${to}`);
                            resolve({ success: true, messageId: json.messages?.[0]?.id, status: 'sent' });
                        } else {
                            console.error(`[WhatsApp API] ❌ API Error:`, json);
                            resolve({ success: false, error: json.error?.message || 'Unknown error' });
                        }
                    } catch (e) {
                        reject(new Error('Failed to parse WhatsApp API response'));
                    }
                });
            });

            req.on('error', (error) => {
                console.error(`[WhatsApp API] ❌ Connection error:`, error);
                reject(error);
            });

            req.write(data);
            req.end();
        });
    },

    /**
     * Generate content for simple text messages
     */
    getTemplate(type: MessageType, params: Record<string, string>): string {
        switch (type) {
            case 'RECEIVER_HEADS_UP':
                return `Hi ${params.recipientName}! 🍗 Your meat pack from ${params.senderName} is arriving today between 10 AM and 12 PM. Please ensure someone is home to receive it. Thank you for using Hexad Market!`;

            case 'SENDER_PROOF_OF_LOVE':
                return `Good news! Your family's weekly meat pack has been delivered to ${params.recipientName}. ✅ Thank you for using Hexad Market!`;

            case 'MENU_GREETING':
                return `Welcome to Hexad Market! 🥩 Feeding families in Harare with love from the Diaspora.\n\nReply with a number:\n1. 🛍️ Shop Meat Packs\n2. 🚚 Track Order\n3. 💬 Talk to Support`;

            case 'ORDER_CONFIRMATION':
                return `Order Received! ✅ We are processing your request for ${params.hamperName}. We'll notify you once it's out for delivery.`;

            default:
                return '';
        }
    }
};
