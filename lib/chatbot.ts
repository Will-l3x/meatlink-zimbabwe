import { getPrisma } from '@/lib/prisma';
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

type SessionData = { cart: Array<{ id: string; title: string; kg: number; price: number }>; [key: string]: unknown };

function parseSessionData(raw: string | null | undefined): SessionData {
    if (!raw) return { cart: [] };
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            const data = parsed as SessionData;
            if (!Array.isArray(data.cart)) data.cart = [];
            return data;
        }
    } catch (e) {
        console.warn('[WhatsApp Bot] Invalid session.data JSON, resetting cart:', e);
    }
    return { cart: [] };
}

function suburbSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-');
}

function cutTagLabel(tag: string) {
    const parts = tag.trim().split(/\s+/);
    return parts[parts.length - 1] || tag;
}

const WHATSAPP_MAX_LIST_ROWS = 10;

function getCategoryLabels(): string[] {
    return [...new Set(MEAT_CUTS.map((c) => cutTagLabel(c.tag)))];
}

function getCutsForCategory(category: string) {
    const key = category.toUpperCase();
    return MEAT_CUTS.filter((c) => cutTagLabel(c.tag).toUpperCase() === key);
}

function categoryPayloadId(label: string) {
    return `cat_${label.toUpperCase()}`;
}

/** WhatsApp allows max 10 rows total per list message (all sections combined). */
function clampListSections(
    sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>
) {
    let remaining = WHATSAPP_MAX_LIST_ROWS;
    const out: typeof sections = [];
    for (const section of sections) {
        if (remaining <= 0) break;
        const rows = section.rows.slice(0, remaining);
        if (rows.length) out.push({ title: section.title, rows });
        remaining -= rows.length;
    }
    return out;
}

export const chatbotService = {
    async handleMessage(from: string, text: string, payload?: string, contactName?: string) {
        try {
            const db = getPrisma();
            if (!db) {
                await whatsappService.sendMessage({ to: from, text: 'The WhatsApp service is temporarily unavailable. Please try again later.' });
                return;
            }

            const session = await db.chatSession.upsert({
                where: { phoneNumber: from },
                create: { phoneNumber: from, state: 'START' },
                update: {},
            });

            const state = session.state;
            const data = parseSessionData(session.data);
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
                        await this.sendCutCategoryPicker(from, data);
                        await this.updateSession(from, 'BROWSING', data);
                    } else if (clean === '2' || clean.includes('track') || payload === 'menu_track') {
                        await this.send(from, "🚚 Order tracking is coming soon! For now, check your dashboard at hexad.market or WhatsApp us for a manual update.");
                        await this.sendMainMenu(from, contactName);
                    } else if (clean === '3' || clean.includes('support') || clean.includes('help') || payload === 'menu_support') {
                        await this.send(from, "💬 One of our human agents will get back to you shortly! You can also call us on +263 78 215 4206.");
                        await this.sendMainMenu(from, contactName);
                    } else {
                        await this.sendMainMenu(from, contactName);
                    }
                    break;

                case 'BROWSING':
                    if (payload === 'browse_done' || clean === 'done' || clean === 'checkout' || clean === 'pay') {
                        if (data.cart && data.cart.length > 0) {
                            await this.sendCartReview(from, data);
                            await this.updateSession(from, 'CART_REVIEW', data);
                        } else {
                            await this.send(from, "Your cart is empty! Pick a cut from the menu first.");
                            await this.sendCutCategoryPicker(from, data);
                        }
                        break;
                    }

                    if (payload === 'browse_categories') {
                        await this.sendCutCategoryPicker(from, data);
                        break;
                    }

                    if (payload?.startsWith('cat_')) {
                        const cat = payload.slice(4);
                        if (getCutsForCategory(cat).length) {
                            await this.sendCutsInCategory(from, cat, data);
                        } else {
                            await this.sendCutCategoryPicker(from, data);
                        }
                        break;
                    }

                    let cut = null;
                    if (payload?.startsWith('cut_')) {
                        const cutId = payload.slice(4);
                        cut = MEAT_CUTS.find((c) => c.id === cutId) || null;
                    }
                    if (!cut) {
                        const cutIndex = parseInt(clean) - 1;
                        if (!isNaN(cutIndex) && cutIndex >= 0 && cutIndex < MEAT_CUTS.length) {
                            cut = MEAT_CUTS[cutIndex];
                        } else {
                            cut = MEAT_CUTS.find((c) => c.title.toLowerCase().includes(clean)) || null;
                        }
                    }

                    if (cut) {
                        data.pendingCut = cut;
                        await this.sendKgPicker(from, cut);
                        await this.updateSession(from, 'SELECTING_KG', data);
                    } else {
                        await this.send(from, "Choose a *category* from the menu, or *Checkout* if your cart is ready.");
                        await this.sendCutCategoryPicker(from, data);
                    }
                    break;

                case 'SELECTING_KG':
                    let kg: number | null = null;
                    if (payload?.startsWith('kg_')) {
                        const kgPart = payload.slice(3);
                        if (kgPart !== 'other') {
                            kg = parseInt(kgPart, 10);
                        }
                    }
                    if (kg === null) kg = parseInt(clean, 10);
                    if (isNaN(kg) || kg < 1 || kg > 50) {
                        const pendingForKg = data.pendingCut as { title: string; price: number } | undefined;
                        if (pendingForKg) {
                            await this.send(from, "Choose a weight from the list, or type a number from *1* to *50* kg.");
                            await this.sendKgPicker(from, pendingForKg as { id: string; title: string; price: number });
                        } else {
                            await this.send(from, 'Please choose a valid weight (1–50 kg).');
                        }
                        return;
                    }
                    const pendingCut = data.pendingCut as { id: string; title: string; price: number } | undefined;
                    if (!pendingCut?.id) {
                        await this.send(from, "Let's pick a cut again.");
                        await this.sendCutCategoryPicker(from, data);
                        await this.updateSession(from, 'BROWSING', { ...data, cart: data.cart ?? [] });
                        return;
                    }
                    if (!data.cart) data.cart = [];
                    const addedCut = pendingCut;
                    data.cart.push({ id: addedCut.id, title: addedCut.title, kg, price: addedCut.price });
                    delete data.pendingCut;

                    const total = data.cart.reduce((s: number, i: any) => s + i.price * i.kg, 0);
                    await this.send(from,
                        `✅ Added *${kg}kg ${addedCut.title}* ($${(addedCut.price * kg).toFixed(2)})\n\n` +
                        `🛒 Cart: ${data.cart.length} item(s) · $${total.toFixed(2)}\n\n` +
                        `Pick another cut from the menu, or tap *Checkout* when ready.`
                    );
                    await this.sendCutsCatalog(from, data);
                    await this.updateSession(from, 'BROWSING', data);
                    break;

                case 'CART_REVIEW':
                    if (clean === 'yes' || clean === 'y' || clean === 'proceed' || payload === 'cart_yes') {
                        await this.send(from, "📦 *Delivery Details*\n\nWho is receiving this order in Harare?\n\nPlease type the *recipient's full name*:");
                        await this.updateSession(from, 'RECIPIENT_NAME', data);
                    } else if (clean === 'add' || clean === 'more' || payload === 'cart_add') {
                        await this.sendCutCategoryPicker(from, data);
                        await this.updateSession(from, 'BROWSING', data);
                    } else if (clean === 'clear' || clean === 'cancel' || payload === 'cart_clear') {
                        data.cart = [];
                        await this.send(from, "🗑 Cart cleared. Let me show you the menu again.");
                        await this.sendMainMenu(from, contactName);
                        await this.updateSession(from, 'MENU', data);
                    } else {
                        await this.sendCartReview(from, data);
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
                    await this.sendSuburbPicker(from);
                    await this.updateSession(from, 'RECIPIENT_SUBURB', data);
                    break;

                case 'RECIPIENT_SUBURB':
                    if (payload === 'suburb_page_2') {
                        await this.sendSuburbPicker(from, 2);
                        return;
                    }
                    let suburb = '';
                    if (payload === 'suburb_other') {
                        await this.send(from, 'Please type your suburb name:');
                        await this.updateSession(from, 'RECIPIENT_SUBURB_CUSTOM', data);
                        return;
                    }
                    if (payload?.startsWith('suburb_')) {
                        const slug = payload.slice(7);
                        if (slug !== 'page_2') {
                            suburb = SUBURBS.find((s) => suburbSlug(s) === slug) || '';
                        }
                    }
                    if (!suburb) {
                        const subIdx = parseInt(clean, 10) - 1;
                        if (!isNaN(subIdx) && subIdx >= 0 && subIdx < SUBURBS.length) {
                            suburb = SUBURBS[subIdx];
                        } else if (!isNaN(subIdx) && subIdx === SUBURBS.length) {
                            await this.send(from, 'Please type your suburb name:');
                            await this.updateSession(from, 'RECIPIENT_SUBURB_CUSTOM', data);
                            return;
                        } else {
                            const matched = SUBURBS.find((s) => s.toLowerCase().includes(clean));
                            suburb = matched || text.trim();
                        }
                    }
                    data.recipientSuburb = suburb;

                    await this.sendConfirmActions(from, data);
                    await this.updateSession(from, 'CONFIRMING', data);
                    break;

                case 'CONFIRMING':
                    if (clean === 'pay' || clean === 'confirm' || payload === 'confirm_pay') {
                        await this.send(from, "💳 Generating your secure payment link...");
                        await this.handlePayment(from, data);
                    } else if (clean === 'edit' || payload === 'confirm_edit') {
                        await this.send(from, "Let's start the delivery details again.\n\nPlease type the *recipient's full name*:");
                        await this.updateSession(from, 'RECIPIENT_NAME', data);
                    } else if (clean === 'cancel' || payload === 'confirm_cancel') {
                        data.cart = [];
                        await this.send(from, "❌ Order cancelled. Let me show you the menu again.");
                        await this.sendMainMenu(from, contactName);
                        await this.updateSession(from, 'MENU', data);
                    } else {
                        await this.sendConfirmActions(from, data);
                    }
                    break;

                case 'RECIPIENT_SUBURB_CUSTOM':
                    data.recipientSuburb = text.trim();
                    await this.sendConfirmActions(from, data);
                    await this.updateSession(from, 'CONFIRMING', data);
                    break;

                case 'PAYMENT_RETRY':
                    if (clean === 'retry' || clean === 'pay' || payload === 'payment_retry') {
                        await this.send(from, "💳 Retrying payment link generation...");
                        await this.handlePayment(from, data);
                    } else if (clean === 'cancel' || payload === 'payment_cancel') {
                        data.cart = [];
                        await this.send(from, "❌ Order cancelled. Let me show you the menu again.");
                        await this.sendMainMenu(from, contactName);
                        await this.updateSession(from, 'MENU', data);
                    } else {
                        await this.sendPaymentRetryActions(from);
                    }
                    break;

                default:
                    await this.sendMainMenu(from, contactName);
                    await this.updateSession(from, 'MENU', { cart: [] });
            }
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            console.error(`[WhatsApp Bot] Error in handleMessage (from=${from}):`, detail, error);
            try {
                await this.send(from, "Oops! Something went wrong. Please try again by saying *Hi*.");
            } catch (e) { /* last resort */ }
        }
    },

    // ── Helpers ───────────────────────────────────────────────

    async send(to: string, text: string) {
        await whatsappService.sendMessage({ to, text });
    },

    async sendInteractive(to: string, interactive: Record<string, unknown>) {
        const res = await whatsappService.sendMessage({ to, interactive });
        if (!res.success) {
            console.warn('[WhatsApp Bot] Interactive send failed:', res.error);
        }
        return res.success;
    },

    async sendButtons(to: string, body: string, buttons: Array<{ id: string; title: string }>) {
        const ok = await this.sendInteractive(to, {
            type: 'button',
            body: { text: body.slice(0, 1024) },
            action: {
                buttons: buttons.slice(0, 3).map((b) => ({
                    type: 'reply',
                    reply: { id: b.id, title: b.title.slice(0, 20) },
                })),
            },
        });
        if (!ok) await this.send(to, body);
    },

    async sendList(
        to: string,
        body: string,
        listButtonLabel: string,
        sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>,
        fallbackText?: string
    ) {
        const clamped = clampListSections(sections);
        const ok = await this.sendInteractive(to, {
            type: 'list',
            body: { text: body.slice(0, 4096) },
            action: {
                button: listButtonLabel.slice(0, 20),
                sections: clamped.map((s) => ({
                    title: s.title.slice(0, 24),
                    rows: s.rows.map((r) => ({
                        id: r.id.slice(0, 200),
                        title: r.title.slice(0, 24),
                        ...(r.description ? { description: r.description.slice(0, 72) } : {}),
                    })),
                })),
            },
        });
        if (!ok) await this.send(to, fallbackText || body);
    },

    async updateSession(from: string, state: string, data?: any) {
        const db = getPrisma();
        if (!db) return;

        await db.chatSession.upsert({
            where: { phoneNumber: from },
            create: {
                phoneNumber: from,
                state,
                ...(data !== undefined ? { data: JSON.stringify(data) } : {}),
            },
            update: {
                state,
                ...(data !== undefined ? { data: JSON.stringify(data) } : {}),
            },
        });
    },

    async sendMainMenu(to: string, name?: string) {
        const greeting = name ? `Hi ${name}! ` : '';
        const body =
            `${greeting}Welcome to *Hexad Market* 🥩\n` +
            `Feeding families in Harare with love from the Diaspora.\n\n` +
            `What would you like to do? Tap a button below.`;

        await this.sendButtons(to, body, [
            { id: 'menu_shop', title: 'Shop cuts' },
            { id: 'menu_track', title: 'Track order' },
            { id: 'menu_support', title: 'Support' },
        ]);
    },

    /** WhatsApp allows 3 reply buttons per message — batch larger menus. */
    async sendReplyButtonGroups(
        to: string,
        intro: string,
        options: Array<{ id: string; title: string }>
    ) {
        if (intro.trim()) await this.send(to, intro);
        for (let i = 0; i < options.length; i += 3) {
            const chunk = options.slice(i, i + 3);
            const prompt = i === 0 ? 'Choose an option:' : 'More options:';
            await this.sendButtons(to, prompt, chunk);
        }
    },

    async sendCutCategoryPicker(to: string, data?: SessionData) {
        const cartCount = data?.cart?.length ?? 0;
        const intro =
            '*🥩 Premium Cuts* (USD per kg)\n\n' +
            'Choose a category, then pick your cut.' +
            (cartCount > 0 ? `\n\n🛒 *${cartCount}* item(s) in your cart.` : '');

        const options = getCategoryLabels().map((cat) => ({
            id: categoryPayloadId(cat),
            title: cat.slice(0, 20),
        }));

        if (cartCount > 0) {
            options.push({ id: 'browse_done', title: 'Checkout' });
        }

        await this.sendReplyButtonGroups(to, intro, options);
    },

    async sendCutsInCategory(to: string, category: string, data?: SessionData) {
        const cuts = getCutsForCategory(category);
        const intro = `*${category}* — pick a cut (USD/kg):`;

        const options = cuts.map((c) => ({
            id: `cut_${c.id}`,
            title: c.title.slice(0, 20),
        }));
        options.push({ id: 'browse_categories', title: 'All categories' });

        await this.sendReplyButtonGroups(to, intro, options);
    },

    /** @deprecated Use sendCutCategoryPicker */
    async sendCutsCatalog(to: string, data?: SessionData) {
        await this.sendCutCategoryPicker(to, data);
    },

    async sendKgPicker(to: string, cut: { id: string; title: string; price: number }) {
        const intro = `*${cut.title}* — $${cut.price.toFixed(2)}/kg\n\nHow many kilograms?`;
        const common = [1, 2, 3, 5, 10, 15, 20];
        await this.sendReplyButtonGroups(
            to,
            intro,
            common.map((n) => ({ id: `kg_${n}`, title: `${n} kg` }))
        );
        await this.send(to, 'Need a different amount? Type a number from *1* to *50* kg.');
    },

    async sendCartReview(to: string, data: SessionData) {
        await this.sendCartSummary(to, data);
        await this.sendButtons(to, 'Ready for delivery details?', [
            { id: 'cart_yes', title: 'Proceed' },
            { id: 'cart_add', title: 'Add more' },
            { id: 'cart_clear', title: 'Clear cart' },
        ]);
    },

    async sendSuburbPicker(to: string, page: 1 | 2 = 1) {
        if (page === 2) {
            const suburbs = SUBURBS.slice(9);
            const options = [
                ...suburbs.map((s) => ({
                    id: `suburb_${suburbSlug(s)}`,
                    title: s.slice(0, 20),
                })),
                { id: 'suburb_other', title: 'Other suburb' },
            ];
            await this.sendReplyButtonGroups(to, '📍 *More suburbs* — tap your area:', options);
            return;
        }

        const firstPage = SUBURBS.slice(0, 9);
        const options = firstPage.map((s) => ({
            id: `suburb_${suburbSlug(s)}`,
            title: s.slice(0, 20),
        }));
        await this.sendReplyButtonGroups(to, '📍 *Delivery suburb* — tap your area:', options);
        await this.sendButtons(to, 'Not listed above?', [{ id: 'suburb_page_2', title: 'More suburbs' }]);
    },

    async sendConfirmActions(to: string, data: SessionData) {
        await this.sendOrderSummary(to, data);
        await this.sendButtons(to, 'Confirm your order?', [
            { id: 'confirm_pay', title: 'Pay now' },
            { id: 'confirm_edit', title: 'Edit details' },
            { id: 'confirm_cancel', title: 'Cancel' },
        ]);
    },

    async sendPaymentRetryActions(to: string) {
        await this.sendButtons(to, 'Payment link could not be created. Try again?', [
            { id: 'payment_retry', title: '🔄 Retry pay' },
            { id: 'payment_cancel', title: '❌ Cancel' },
        ]);
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

    async sendOrderSummary(to: string, data: any) {
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
            `📍 ${data.recipientAddress}, ${data.recipientSuburb}\n\n` +
            `Reply *PAY* to get your payment link\n` +
            `Reply *EDIT* to change details\n` +
            `Reply *CANCEL* to start over`;

        await this.send(to, summary);
    },

    async handlePayment(from: string, data: any) {
        const db = getPrisma();
        if (!db) {
            await this.send(from, 'The WhastApp payment service is temporarily unavailable. Please try again later.');
            return;
        }

        let user = await db.user.findFirst({ where: { whatsappId: from } });
        if (!user) {
            user = await db.user.create({
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
                // Reset session after successful payment link
                await this.updateSession(from, 'START', { cart: [] });
            } else {
                await this.send(from,
                    `😔 Sorry, I couldn't generate a payment link right now.\n\n` +
                    `Your order for *${description}* has been saved.`
                );
                await this.sendPaymentRetryActions(from);
                await this.updateSession(from, 'PAYMENT_RETRY', data);
            }
        } catch (err) {
            console.error('[WhatsApp Bot] Payment error:', err);
            await this.send(from, '😔 Something went wrong with the payment system.');
            await this.sendPaymentRetryActions(from);
            await this.updateSession(from, 'PAYMENT_RETRY', data);
        }
    }
};
