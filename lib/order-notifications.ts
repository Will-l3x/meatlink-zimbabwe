import { getPrisma } from '@/lib/prisma';
import { whatsappService } from '@/lib/whatsapp';

/** Owner WhatsApp (E.164 without +). Override with ORDER_NOTIFY_WHATSAPP in production. */
const DEFAULT_OWNER_WHATSAPP = '27765762104';

type CartLine = { id?: string; title: string; kg: number; price?: number };

type OrderPaymentMetadata = {
    source?: string;
    cart?: CartLine[];
    cartItems?: CartLine[];
    recipientName?: string;
    recipientWhatsApp?: string;
    recipientAddress?: string;
    recipientSuburb?: string;
    senderName?: string;
    ownerPlacedNotifiedAt?: string;
    orderNotificationsSentAt?: string;
};

function ownerWhatsAppNumber(): string {
    return (process.env.ORDER_NOTIFY_WHATSAPP || DEFAULT_OWNER_WHATSAPP).replace(/\D/g, '');
}

function parseMetadata(raw: string | null | undefined): OrderPaymentMetadata {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? (parsed as OrderPaymentMetadata) : {};
    } catch {
        return {};
    }
}

function formatCartLines(meta: OrderPaymentMetadata): string[] {
    const items = meta.cart?.length ? meta.cart : meta.cartItems || [];
    return items.map((i) => {
        const pricePart =
            i.price != null ? ` × $${i.price.toFixed(2)}/kg = $${(i.price * i.kg).toFixed(2)}` : '';
        return `• ${i.title} — ${i.kg}kg${pricePart}`;
    });
}

function buildOrderMessage(params: {
    orderReference: string | null | undefined;
    amount: number;
    currency: string;
    meta: OrderPaymentMetadata;
    customerName?: string | null;
    customerEmail?: string | null;
    customerWhatsApp?: string | null;
    stage: 'placed' | 'paid';
}): string {
    const { orderReference, amount, currency, meta, customerName, customerEmail, customerWhatsApp, stage } = params;
    const lines = formatCartLines(meta);
    const source = meta.source === 'whatsapp_bot' ? 'WhatsApp bot' : 'Website checkout';

    const headline =
        stage === 'paid'
            ? '✅ *Order paid — ready to fulfill*'
            : '🛒 *New order placed* (awaiting payment)';

    let msg =
        `${headline}\n\n` +
        `Ref: *${orderReference || 'N/A'}*\n` +
        `Total: *${currency.toUpperCase()} ${amount.toFixed(2)}*\n` +
        `Channel: ${source}\n\n`;

    if (lines.length) {
        msg += `*Items:*\n${lines.join('\n')}\n\n`;
    }

    if (meta.recipientName || meta.recipientWhatsApp || meta.recipientAddress) {
        msg +=
            `*Delivery:*\n` +
            `${meta.recipientName || '—'}\n` +
            `📱 ${meta.recipientWhatsApp || '—'}\n` +
            `📍 ${meta.recipientAddress || '—'}${meta.recipientSuburb ? `, ${meta.recipientSuburb}` : ''}\n\n`;
    }

    if (customerName || customerEmail || customerWhatsApp) {
        msg += `*Ordered by:*\n`;
        if (customerName) msg += `${customerName}\n`;
        if (customerEmail) msg += `✉️ ${customerEmail}\n`;
        if (customerWhatsApp) msg += `📱 ${customerWhatsApp}\n`;
    }

    return msg.trim();
}

async function sendOwnerWhatsApp(text: string) {
    const to = ownerWhatsAppNumber();
    if (!to) {
        console.warn('[Order Notify] No owner WhatsApp number configured');
        return false;
    }

    const result = await whatsappService.sendMessage({ to, text });
    if (!result.success) {
        console.error('[Order Notify] Owner WhatsApp failed:', result.error);
        return false;
    }

    console.log('[Order Notify] Owner WhatsApp sent to', to);
    return true;
}

async function loadOrderPayment(paymentId: string) {
    const db = getPrisma();
    if (!db) return null;

    return db.payment.findUnique({
        where: { id: paymentId },
        include: { user: { select: { name: true, email: true, whatsappId: true } } },
    });
}

/**
 * Notify owner when customer places an order (checkout / payment link created).
 */
export async function notifyOwnerOrderPlaced(paymentId: string): Promise<void> {
    const payment = await loadOrderPayment(paymentId);
    if (!payment || payment.purpose !== 'ORDER') return;

    const meta = parseMetadata(payment.metadata);
    if (meta.ownerPlacedNotifiedAt) return;

    const body = buildOrderMessage({
        orderReference: payment.orderReference,
        amount: payment.amount,
        currency: payment.currency,
        meta,
        customerName: meta.senderName || payment.user.name,
        customerEmail: payment.user.email,
        customerWhatsApp: payment.user.whatsappId,
        stage: 'placed',
    });

    await sendOwnerWhatsApp(body);

    const db = getPrisma();
    if (!db) return;

    meta.ownerPlacedNotifiedAt = new Date().toISOString();
    await db.payment.update({
        where: { id: paymentId },
        data: { metadata: JSON.stringify(meta) },
    });
}

/**
 * Notify owner when ORDER payment is completed (customer paid).
 */
export async function notifyOrderPaymentCompleted(paymentId: string): Promise<void> {
    const db = getPrisma();
    if (!db) return;

    const payment = await loadOrderPayment(paymentId);
    if (!payment || payment.purpose !== 'ORDER' || payment.status !== 'COMPLETED') {
        return;
    }

    const meta = parseMetadata(payment.metadata);
    if (meta.orderNotificationsSentAt) {
        return;
    }

    const whatsappBody = buildOrderMessage({
        orderReference: payment.orderReference,
        amount: payment.amount,
        currency: payment.currency,
        meta,
        customerName: meta.senderName || payment.user.name,
        customerEmail: payment.user.email,
        customerWhatsApp: payment.user.whatsappId,
        stage: 'paid',
    });

    await sendOwnerWhatsApp(whatsappBody);

    meta.orderNotificationsSentAt = new Date().toISOString();
    await db.payment.update({
        where: { id: paymentId },
        data: { metadata: JSON.stringify(meta) },
    });
}
