import { prisma } from '@/lib/prisma';
import { whatsappService } from '@/lib/whatsapp';

/**
 * Hexad Market WhatsApp Chatbot
 * Mirrors the website flow: Browse Cuts → Select kg → Delivery Details → Payment
 */

// ── The exact same catalog from the website ──────────────────
const MEAT_CUTS = [
    { id: 'pork-chops', title: 'Pork Chops', tag: '🐖 PORK', price: 5.45 },
    { id: 'pork-trotters', title: 'Pork Trotters', tag: '🐖 PORK', price: 3.75 },
    { id: 'pork-shoulder', title: 'Pork Shoulder', tag: '🐖 PORK', price: 5.00 },
    { id: 'pork-belly', title: 'Pork Belly', tag: '🐖 PORK', price: 6.00 },
    { id: 'pork-ribs', title: 'Pork Ribs', tag: '🐖 PORK', price: 5.00 },
    { id: 't-bone-steak', title: 'T-Bone Steak', tag: '🥩 BEEF', price: 7.20 },
    { id: 'blade', title: 'Blade', tag: '🥩 BEEF', price: 6.55 },
    { id: 'brisket', title: 'Brisket', tag: '🥩 BEEF', price: 6.00 },
    { id: 'full-chicken', title: 'Full Chicken', tag: '🍗 POULTRY', price: 6.89 },
    { id: 'chicken-breast', title: 'Chicken Breast', tag: '🍗 POULTRY', price: 4.62 },
    { id: 'mixed-portions', title: 'Mixed Portions', tag: '🍗 POULTRY', price: 5.00 },
    { id: 'oxtail', title: 'Oxtail', tag: '⭐ PREMIUM', price: 12.86 },
    { id: 'beef-short-ribs', title: 'Beef Short Ribs', tag: '🥩 BEEF', price: 6.00 },
    { id: 'beef-trotters', title: 'Beef Trotters', tag: '🥩 BEEF', price: 4.50 },
    { id: 'liver', title: 'Liver', tag: '🔥 SPECIALTY', price: 7.50 },
    { id: 'goat-meat', title: 'Goat Meat', tag: '🔥 SPECIALTY', price: 6.92 },
];

const SUBURBS = [
    'Avondale', 'Borrowdale', 'Budiriro', 'Chitungwiza', 'Glen Lorne', 'Greendale',
    'Harare CBD', 'Highlands', 'Kuwadzana', 'Mabelreign', 'Mbare', 'Mount Pleasant',
    'Msasa', 'Newlands', 'Tynwald', 'Waterfalls', 'Westgate', 'Zimre Park'
];

export const chatbotService = {
    async handleMessage(from: string, text: string, payload?: string, contactName?: string) {
        try {
            // 1. Find or create session
            let session = await prisma.chatSession.findUnique({ where: { phoneNumber: from } });
            if (!session) {
                session = await prisma.chatSession.create({ data: { phoneNumber: from, state: 'START' } });
            }

            const state = session.state;
            const data = session.data ? JSON.parse(session.data) : { cart: [] };
            const clean = text.toLowerCase().trim();

            // ── Global resets ──
            const isReset = ['hi', 'hello', 'hey', 'menu', 'start', 'restart', 'reset', '0'].includes(clean);
            if (isReset && state !== 'START') {
                await this.sendMainMenu(from, contactName);
                await this.updateSession(from, 'MENU', { cart: [] });
                return;
            }

            // ── State machine ──
            switch (state) {
                case 'START':
                    await this.sendMainMenu(from, contactName);
                    await this.updateSession(from, 'MENU', { cart: [] });
                    break;

                case 'MENU':
                    if (clean === '1' || clean.includes('shop') || clean.includes('order') || clean.includes('buy') || payload === 'menu_shop') {
                        await this.sendCutsCatalog(from);
                        await this.updateSession(from, 'BROWSING', data);
                    } else if (clean === '2' || clean.includes('track') || payload === 'menu_track') {
                        await this.send(from, "🚚 Order tracking is coming soon! For now, check your dashboard at hexad.market or WhatsApp us for a manual update.");
                        await this.sendMainMenu(from, contactName);
                    } else if (clean === '3' || clean.includes('support') || clean.includes('help') || payload === 'menu_support') {
                        await this.send(from, "💬 One of our human agents will get back to you shortly! You can also call us on +263 78 215 4206.");
                    } else {
                        await this.sendMainMenu(from, contactName);
                    }
                    break;

                case 'BROWSING':
                    // Find the cut by number or name
                    const cutIndex = parseInt(clean) - 1;
                    let cut = null;
                    if (!isNaN(cutIndex) && cutIndex >= 0 && cutIndex < MEAT_CUTS.length) {
                        cut = MEAT_CUTS[cutIndex];
                    } else {
                        cut = MEAT_CUTS.find(c => c.title.toLowerCase().includes(clean));
                    }

                    if (cut) {
                        data.pendingCut = cut;
                        await this.send(from, `*${cut.title}* — $${cut.price.toFixed(2)}/kg\n\nHow many kilograms would you like? (e.g. reply *2* or *5*)`);
                        await this.updateSession(from, 'SELECTING_KG', data);
                    } else if (clean === 'done' || clean === 'checkout' || clean === 'pay') {
                        if (data.cart && data.cart.length > 0) {
                            await this.sendCartSummary(from, data);
                            await this.send(from, "Reply *YES* to proceed to delivery details, or *ADD* to add more cuts.");
                            await this.updateSession(from, 'CART_REVIEW', data);
                        } else {
                            await this.send(from, "Your cart is empty! Pick a cut from the list first.");
                        }
                    } else {
                        await this.send(from, "I didn't find that cut. Please reply with a *number* from the list (e.g. *1* for Pork Chops) or type *DONE* to checkout.");
                    }
                    break;

                case 'SELECTING_KG':
                    const kg = parseInt(clean);
                    if (isNaN(kg) || kg < 1 || kg > 50) {
                        await this.send(from, "Please enter a valid number of kilograms (1-50).");
                        return;
                    }
                    if (!data.cart) data.cart = [];
                    const addedCut = data.pendingCut;
                    data.cart.push({ id: addedCut.id, title: addedCut.title, kg, price: addedCut.price });
                    delete data.pendingCut;

                    const total = data.cart.reduce((s: number, i: any) => s + i.price * i.kg, 0);
                    await this.send(from,
                        `✅ Added *${kg}kg ${addedCut.title}* ($${(addedCut.price * kg).toFixed(2)})\n\n` +
                        `🛒 Cart: ${data.cart.length} item(s) · $${total.toFixed(2)}\n\n` +
                        `Reply with another *number* to add more cuts, or type *DONE* to proceed to checkout.`
                    );
                    await this.sendCutsCatalog(from);
                    await this.updateSession(from, 'BROWSING', data);
                    break;

                case 'CART_REVIEW':
                    if (clean === 'yes' || clean === 'y' || clean === 'proceed') {
                        await this.send(from, "📦 *Delivery Details*\n\nWho is receiving this order in Harare?\n\nPlease type the *recipient's full name*:");
                        await this.updateSession(from, 'RECIPIENT_NAME', data);
                    } else if (clean === 'add' || clean === 'more') {
                        await this.sendCutsCatalog(from);
                        await this.updateSession(from, 'BROWSING', data);
                    } else if (clean === 'clear' || clean === 'cancel') {
                        data.cart = [];
                        await this.send(from, "🗑 Cart cleared. Let me show you the menu again.");
                        await this.sendMainMenu(from, contactName);
                        await this.updateSession(from, 'MENU', data);
                    } else {
                        await this.send(from, "Reply *YES* to proceed, *ADD* to add more cuts, or *CLEAR* to start over.");
                    }
                    break;

                case 'RECIPIENT_NAME':
                    data.recipientName = text.trim();
                    await this.send(from, `Got it: *${data.recipientName}*\n\n📱 What is their WhatsApp number?\n(e.g. 0771234567 or +263771234567)`);
                    await this.updateSession(from, 'RECIPIENT_WHATSAPP', data);
                    break;

                case 'RECIPIENT_WHATSAPP':
                    data.recipientWhatsApp = text.trim();
                    await this.send(from, `📍 What is the delivery address?\n(e.g. 123 Main Street)`);
                    await this.updateSession(from, 'RECIPIENT_ADDRESS', data);
                    break;

                case 'RECIPIENT_ADDRESS':
                    data.recipientAddress = text.trim();
                    // Show suburbs as numbered list
                    let suburbList = "*Select a suburb:*\n\n";
                    SUBURBS.forEach((s, i) => { suburbList += `${i + 1}. ${s}\n`; });
                    suburbList += "\nReply with the *number* of the suburb.";
                    await this.send(from, suburbList);
                    await this.updateSession(from, 'RECIPIENT_SUBURB', data);
                    break;

                case 'RECIPIENT_SUBURB':
                    const subIdx = parseInt(clean) - 1;
                    let suburb = '';
                    if (!isNaN(subIdx) && subIdx >= 0 && subIdx < SUBURBS.length) {
                        suburb = SUBURBS[subIdx];
                    } else {
                        suburb = SUBURBS.find(s => s.toLowerCase().includes(clean)) || '';
                    }
                    if (!suburb) {
                        await this.send(from, "I didn't find that suburb. Please reply with a *number* from the list.");
                        return;
                    }
                    data.recipientSuburb = suburb;

                    // Show final order summary
                    const cartTotal = data.cart.reduce((s: number, i: any) => s + i.price * i.kg, 0);
                    const totalKg = data.cart.reduce((s: number, i: any) => s + i.kg, 0);
                    const itemLines = data.cart.map((i: any) => `  • ${i.title} — ${i.kg}kg × $${i.price.toFixed(2)} = $${(i.price * i.kg).toFixed(2)}`).join('\n');

                    const summary =
                        `*🧾 Order Summary*\n\n` +
                        `${itemLines}\n\n` +
                        `*Total:* ${totalKg}kg — *$${cartTotal.toFixed(2)} USD*\n` +
                        `*Delivery:* FREE 🚚\n\n` +
                        `*📦 Delivering to:*\n` +
                        `${data.recipientName}\n` +
                        `📱 ${data.recipientWhatsApp}\n` +
                        `📍 ${data.recipientAddress}, ${suburb}\n\n` +
                        `Reply *PAY* to get your payment link\n` +
                        `Reply *EDIT* to change details\n` +
                        `Reply *CANCEL* to start over`;

                    await this.send(from, summary);
                    await this.updateSession(from, 'CONFIRMING', data);
                    break;

                case 'CONFIRMING':
                    if (clean === 'pay' || clean === 'confirm') {
                        await this.send(from, "💳 Generating your secure payment link...");
                        await this.handlePayment(from, data);
                        await this.updateSession(from, 'START', { cart: [] });
                    } else if (clean === 'edit') {
                        await this.send(from, "Let's start the delivery details again.\n\nPlease type the *recipient's full name*:");
                        await this.updateSession(from, 'RECIPIENT_NAME', data);
                    } else if (clean === 'cancel') {
                        data.cart = [];
                        await this.send(from, "❌ Order cancelled. Let me show you the menu again.");
                        await this.sendMainMenu(from, contactName);
                        await this.updateSession(from, 'MENU', data);
                    } else {
                        await this.send(from, "Reply *PAY* to confirm, *EDIT* to change details, or *CANCEL* to start over.");
                    }
                    break;

                default:
                    await this.sendMainMenu(from, contactName);
                    await this.updateSession(from, 'MENU', { cart: [] });
            }
        } catch (error) {
            console.error('[WhatsApp Bot] Error in handleMessage:', error);
            try {
                await this.send(from, "Oops! Something went wrong. Please try again by saying *Hi*.");
            } catch (e) { /* last resort */ }
        }
    },

    // ── Helpers ───────────────────────────────────────────────

    async send(to: string, text: string) {
        await whatsappService.sendMessage({ to, text });
    },

    async updateSession(from: string, state: string, data?: any) {
        await prisma.chatSession.update({
            where: { phoneNumber: from },
            data: {
                state,
                ...(data !== undefined ? { data: JSON.stringify(data) } : {}),
            }
        });
    },

    async sendMainMenu(to: string, name?: string) {
        const greeting = name ? `Hi ${name}! ` : '';
        await this.send(to,
            `${greeting}Welcome to *Hexad Market* 🥩\n` +
            `Feeding families in Harare with love from the Diaspora.\n\n` +
            `What would you like to do?\n\n` +
            `*1.* 🛍️ Shop Premium Cuts\n` +
            `*2.* 🚚 Track My Order\n` +
            `*3.* 💬 Talk to Support\n\n` +
            `Reply with *1*, *2*, or *3*`
        );
    },

    async sendCutsCatalog(to: string) {
        let msg = "*🥩 Premium Cuts — Price per kg (USD)*\n\n";
        MEAT_CUTS.forEach((c, i) => {
            msg += `*${i + 1}.* ${c.title} — $${c.price.toFixed(2)}/kg  _${c.tag}_\n`;
        });
        msg += "\nReply with the *number* of the cut you want.\nType *DONE* when you're ready to checkout.";
        await this.send(to, msg);
    },

    async sendCartSummary(to: string, data: any) {
        const items = data.cart || [];
        const total = items.reduce((s: number, i: any) => s + i.price * i.kg, 0);
        const totalKg = items.reduce((s: number, i: any) => s + i.kg, 0);
        let msg = "*🛒 Your Cart*\n\n";
        items.forEach((i: any) => {
            msg += `• ${i.title} — ${i.kg}kg × $${i.price.toFixed(2)} = *$${(i.price * i.kg).toFixed(2)}*\n`;
        });
        msg += `\n*Total:* ${totalKg}kg — *$${total.toFixed(2)} USD*`;
        await this.send(to, msg);
    },

    async handlePayment(from: string, data: any) {
        // Find or create a guest user for this phone number
        let user = await prisma.user.findFirst({ where: { whatsappId: from } });
        if (!user) {
            user = await prisma.user.create({
                data: { name: data.recipientName || 'WhatsApp Customer', whatsappId: from, role: 'SENDER' }
            });
        }

        const cartTotal = data.cart.reduce((s: number, i: any) => s + i.price * i.kg, 0);
        const description = data.cart.map((i: any) => `${i.title} (${i.kg}kg)`).join(', ').slice(0, 240);
        const host = process.env.NEXT_PUBLIC_BASE_URL || 'https://meatlink-zimbabwe.vercel.app';

        try {
            const response = await fetch(`${host}/api/payments/zb-smilenpay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: cartTotal,
                    currency: 'USD',
                    userId: user.id,
                    purpose: 'ORDER',
                    description: `Hexad Market: ${description}`,
                    metadata: {
                        source: 'whatsapp_bot',
                        cart: data.cart,
                        recipientName: data.recipientName,
                        recipientWhatsApp: data.recipientWhatsApp,
                        recipientAddress: data.recipientAddress,
                        recipientSuburb: data.recipientSuburb
                    }
                })
            });

            const result = await response.json();
            if (result.success && result.checkoutUrl) {
                await this.send(from,
                    `✅ *Payment Link Ready!*\n\n` +
                    `💳 Pay *$${cartTotal.toFixed(2)} USD* securely:\n${result.checkoutUrl}\n\n` +
                    `Accepts: Ecocash · InnBucks · Visa/MC · Zimswitch\n\n` +
                    `We'll notify *${data.recipientName}* once the delivery is on its way! 🚚`
                );
            } else {
                await this.send(from, "😔 Sorry, I couldn't generate a payment link right now. Please try again later or visit hexad.market to complete your order.");
            }
        } catch (err) {
            console.error('[WhatsApp Bot] Payment error:', err);
            await this.send(from, "😔 Something went wrong with the payment system. Please try again or visit hexad.market");
        }
    }
};
