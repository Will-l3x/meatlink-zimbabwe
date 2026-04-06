import { prisma } from '@/lib/prisma';
import { whatsappService } from '@/lib/whatsapp';

/**
 * Chatbot Logic Core (State Machine)
 */

export const chatbotService = {
    /**
     * Entry point for incoming messages from WhatsApp webhook
     */
    async handleMessage(from: string, text: string, payload?: string, contactName?: string) {
        // 1. Find or create session
        let session = await prisma.chatSession.findUnique({
            where: { phoneNumber: from }
        });

        if (!session) {
            session = await prisma.chatSession.create({
                data: {
                    phoneNumber: from,
                    state: 'START'
                }
            });
        }

        const state = session.state;
        const data = session.data ? JSON.parse(session.data) : {};

        // 1.5 Global Keywords (Allow reset at any time)
        const cleanText = text.toLowerCase().trim();
        const resetKeywords = ['hi', 'hello', 'hey', 'menu', 'start', 'restart', 'reset', '0'];
        
        if (resetKeywords.includes(cleanText) || payload === 'menu_greeting') {
            await this.sendGreeting(from, contactName);
            await this.updateSession(from, 'MENU', {});
            return;
        }

        // 2. State Machine Switch
        switch (state) {
            case 'START':
                await this.sendGreeting(from, contactName);
                await this.updateSession(from, 'MENU');
                break;

            case 'MENU':
                // Handle menu selection
                if (text === '1' || payload === 'menu_shop' || text.toLowerCase().includes('shop')) {
                    await this.sendHamperList(from);
                    await this.updateSession(from, 'SELECTING_HAMPER');
                } else if (text === '2' || payload === 'menu_track') {
                    await whatsappService.sendMessage({ to: from, text: "Feature coming soon! 🚚 Use the website dashboard to track your orders for now." });
                    await this.sendGreeting(from, contactName);
                } else if (text === '3' || payload === 'menu_support') {
                    await whatsappService.sendMessage({ to: from, text: "One of our human agents will get back to you shortly! 💬" });
                } else {
                    await this.sendGreeting(from, contactName);
                }
                break;

            case 'SELECTING_HAMPER':
                // User selected a meat pack (hamper)
                const hamperIdOrName = payload || text;
                
                // Only search by ID if it's a valid 24-char hex string
                const isValidId = /^[0-9a-fA-F]{24}$/.test(hamperIdOrName);
                
                const hamper = await prisma.hamper.findFirst({
                    where: {
                        OR: [
                            ...(isValidId ? [{ id: hamperIdOrName }] : []),
                            { name: { contains: hamperIdOrName, mode: 'insensitive' } }
                        ]
                    }
                });

                if (hamper) {
                    data.hamperId = hamper.id;
                    data.hamperName = hamper.name;
                    data.price = hamper.priceUSD; // Default to USD for now
                    await whatsappService.sendMessage({ to: from, text: `Great choice! ${hamper.name} ($${hamper.priceUSD}). 🥩\n\nWho is receiving this in Harare? (Please reply with their full name)` });
                    await this.updateSession(from, 'RECIPIENT_NAME', data);
                } else {
                    await whatsappService.sendMessage({ to: from, text: "I didn't catch that. Please select a pack from the list." });
                    await this.sendHamperList(from);
                }
                break;

            case 'RECIPIENT_NAME':
                data.recipientName = text;
                await whatsappService.sendMessage({ to: from, text: `Got it: ${text}. 📱 What is their WhatsApp phone number?` });
                await this.updateSession(from, 'RECIPIENT_WHATSAPP', data);
                break;

            case 'RECIPIENT_WHATSAPP':
                data.recipientWhatsApp = text;
                await whatsappService.sendMessage({ to: from, text: `Perfect. 📍 What is the delivery address in Harare?` });
                await this.updateSession(from, 'RECIPIENT_ADDRESS', data);
                break;

            case 'RECIPIENT_ADDRESS':
                data.recipientAddress = text;
                await whatsappService.sendMessage({ to: from, text: `And finally, what is the suburb? (e.g. Mabelreign, Borrowdale, Highlands)` });
                await this.updateSession(from, 'RECIPIENT_SUBURB', data);
                break;

            case 'RECIPIENT_SUBURB':
                data.recipientSuburb = text;
                // Final Summary
                const summary = `*Order Summary* 🧾\n\n` +
                                `Pack: ${data.hamperName}\n` +
                                `Total: $${parseFloat(data.price).toFixed(2)} USD\n\n` +
                                `*Recipient:* ${data.recipientName}\n` +
                                `*WhatsApp:* ${data.recipientWhatsApp}\n` +
                                `*Address:* ${data.recipientAddress}, ${data.recipientSuburb}\n\n` +
                                `Reply *PAY* to get the payment link or *RESTART* to cancel.`;
                await whatsappService.sendMessage({ to: from, text: summary });
                await this.updateSession(from, 'CONFIRMING_ORDER', data);
                break;

            case 'CONFIRMING_ORDER':
                if (text.toUpperCase() === 'PAY') {
                    // Logic to generate payment link via existing service
                    await this.handlePaymentGeneration(from, data);
                    await this.updateSession(from, 'START', {}); // Reset after link sent
                } else if (text.toUpperCase() === 'RESTART') {
                    await this.sendGreeting(from, contactName);
                    await this.updateSession(from, 'MENU', {});
                } else {
                    await whatsappService.sendMessage({ to: from, text: "Please reply with *PAY* to confirm or *RESTART* to start over." });
                }
                break;

            default:
                await this.sendGreeting(from, contactName);
                await this.updateSession(from, 'MENU');
        }
    },

    async updateSession(from: string, state: string, data: any = null) {
        await prisma.chatSession.update({
            where: { phoneNumber: from },
            data: {
                state,
                data: data ? JSON.stringify(data) : undefined,
                updatedAt: new Date()
            }
        });
    },

    async sendGreeting(to: string, name?: string) {
        await whatsappService.sendMessage({ 
            to, 
            type: 'MENU_GREETING',
            params: { name: name || 'Customer' }
        });
    },

    async sendHamperList(to: string) {
        const hampers = await prisma.hamper.findMany({ take: 10 });
        
        let hamperText = "*Select a Meat Pack:* 🥩\n\n";
        hampers.forEach((h, i) => {
            hamperText += `${i + 1}. *${h.name}* - $${h.priceUSD}\n`;
        });
        hamperText += "\nReply with the name or number of the pack.";

        await whatsappService.sendMessage({ to, text: hamperText });
    },

    async handlePaymentGeneration(from: string, data: any) {
        // Here we'd link a user if possible, or create a guest payment
        // For now, let's assume we find/create a Guest User for this phone number
        let user = await prisma.user.findFirst({ where: { whatsappId: from } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    name: data.recipientName || 'WhatsApp Customer',
                    whatsappId: from,
                    role: 'SENDER'
                }
            });
        }

        // Logic to hit our internal checkout API or call services directly
        // Re-using the payment initiation logic from /api/payments/zb-smilenpay
        const host = process.env.NEXT_PUBLIC_BASE_URL || 'https://hexad-market.vercel.app';
        
        try {
            const response = await fetch(`${host}/api/payments/zb-smilenpay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: data.price,
                    currency: 'USD',
                    userId: user.id,
                    purpose: 'ORDER',
                    description: `Hexad Market: ${data.hamperName} for ${data.recipientName}`,
                    metadata: {
                        source: 'whatsapp_bot',
                        hamperId: data.hamperId,
                        recipientName: data.recipientName,
                        recipientWhatsApp: data.recipientWhatsApp,
                        recipientAddress: data.recipientAddress,
                        recipientSuburb: data.recipientSuburb
                    }
                })
            });

            const result = await response.json();
            if (result.success) {
                await whatsappService.sendMessage({ 
                    to: from, 
                    text: `Perfect! 💳 Use this secure link to pay via ZB Smile & Pay: ${result.checkoutUrl}\n\nWe'll confirm your order as soon as payment is received.` 
                });
            } else {
                await whatsappService.sendMessage({ to: from, text: "Sorry, I had trouble generating a payment link. Please try again later or visit our website: hexad.market" });
            }
        } catch (err) {
            console.error('[WhatsApp Bot] Payment gen error:', err);
            await whatsappService.sendMessage({ to: from, text: "Oops! Something went wrong while creating your payment. Please try again or visit hexad.market" });
        }
    }
};
