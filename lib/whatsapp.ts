/**
 * WhatsApp Business API Service (Mock)
 * This service handles sending notifications to recipients in Harare
 * and delivery confirmations to senders in the Diaspora.
 */

type MessageType = 'RECEIVER_HEADS_UP' | 'SENDER_PROOF_OF_LOVE';

interface SendMessageOptions {
    to: string;
    type: MessageType;
    params: Record<string, string>;
}

export const whatsappService = {
    /**
     * Send a WhatsApp message using a template
     */
    async sendMessage({ to, type, params }: SendMessageOptions) {
        const template = this.getTemplate(type, params);

        // In a real implementation, we would call the WhatsApp Business API here
        // e.g., using Twilio, Meta API, or a specialized provider like Bird

        console.log(`[WhatsApp API] Sending ${type} to ${to}`);
        console.log(`[WhatsApp API] Message Content: "${template}"`);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        return {
            success: true,
            messageId: `wa_${Math.random().toString(36).substr(2, 9)}`,
            status: 'sent'
        };
    },

    /**
     * Generate message content from templates
     */
    getTemplate(type: MessageType, params: Record<string, string>): string {
        switch (type) {
            case 'RECEIVER_HEADS_UP':
                return `Hi ${params.recipientName}! 🍗 Your meat pack from ${params.senderName} is arriving today between 10 AM and 12 PM. Please ensure someone is home to receive it. Please reply 'DELAY' if there is a power outage.`;

            case 'SENDER_PROOF_OF_LOVE':
                return `Good news! Your family's weekly meat pack has been delivered to ${params.recipientName}. ✅ Here is a photo of the handover: ${params.photoUrl}. Thank you for using MeatLink Zimbabwe!`;

            default:
                return '';
        }
    }
};
