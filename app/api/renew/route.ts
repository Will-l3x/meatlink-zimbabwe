import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { initiatePayment, resolveBaseUrl } from '@/lib/payment-initiation';
import { PLAN_ID, verifyRenewalToken } from '@/lib/plans';
import { planDeliveriesLabel, planFrequency, PLAN_FREQUENCIES } from '@/lib/delivery';

export const dynamic = 'force-dynamic';

type CartLine = { title: string; kg: number };

/**
 * Renewal links for prepaid plans.
 * Authorised by the signed token in the link (so it works straight from a
 * WhatsApp message, on any device) or by being the plan owner's session.
 */
async function loadPlan(request: Request, subId: string | null, token: string | null) {
    if (!subId || !/^[a-f0-9]{24}$/i.test(subId)) return { error: 'This renewal link is not valid.', status: 404 } as const;
    const db = getPrisma();
    if (!db) return { error: 'Payments are temporarily unavailable.', status: 503 } as const;

    const sub = await db.subscription.findUnique({
        where: { id: subId },
        include: {
            recipient: { select: { name: true, suburb: true, whatsapp: true, address: true } },
            sender: { select: { id: true, name: true, email: true } },
        },
    });
    if (!sub || sub.plan !== PLAN_ID) return { error: 'This renewal link is not valid.', status: 404 } as const;

    const session = getSession(request);
    const allowed = verifyRenewalToken(sub.id, token) || session?.uid === sub.senderId;
    if (!allowed) return { error: 'This renewal link is not valid.', status: 404 } as const;
    return { sub } as const;
}

function parseCart(raw: string | null): CartLine[] {
    try {
        const parsed = JSON.parse(raw || '[]');
        return Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.title === 'string') : [];
    } catch {
        return [];
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const loaded = await loadPlan(request, searchParams.get('sub'), searchParams.get('t'));
    if ('error' in loaded) return NextResponse.json({ success: false, error: loaded.error }, { status: loaded.status });
    const { sub } = loaded;

    return NextResponse.json({
        success: true,
        plan: {
            id: sub.id,
            // First name only, no address: the link may be forwarded.
            recipientName: sub.recipient.name.split(' ')[0],
            items: parseCart(sub.cart).map((l) => ({ title: l.title, kg: l.kg })),
            frequency: planFrequency(sub.frequency),
            deliveriesPerCycle: sub.deliveriesPerCycle ?? PLAN_FREQUENCIES[planFrequency(sub.frequency)].deliveries,
            amount: sub.cycleAmount ?? 0,
            currency: (sub.cycleCurrency || 'USD').toUpperCase(),
            deliveriesLeft: Math.max(0, sub.deliveriesLeft ?? 0),
            renewalDue: !!sub.renewalDueAt,
            isActive: sub.isActive,
            nextDelivery: sub.nextDelivery.toISOString(),
        },
    });
}

export async function POST(request: Request) {
    let body: { sub?: string; t?: string } = {};
    try {
        body = await request.json();
    } catch {
        // fall through to validation
    }
    const loaded = await loadPlan(request, body.sub ?? null, body.t ?? null);
    if ('error' in loaded) return NextResponse.json({ success: false, error: loaded.error }, { status: loaded.status });
    const { sub } = loaded;

    if (!sub.cycleAmount || sub.cycleAmount <= 0) {
        return NextResponse.json({ success: false, error: 'This plan has no price set. Please contact support.' }, { status: 400 });
    }

    const freq = planFrequency(sub.frequency);
    const perCycle = sub.deliveriesPerCycle ?? PLAN_FREQUENCIES[freq].deliveries;
    const items = parseCart(sub.cart);
    const [firstName, ...rest] = (sub.sender.name || 'Hexad Customer').split(' ');

    const result = await initiatePayment({
        amount: sub.cycleAmount,
        currency: sub.cycleCurrency || 'USD',
        userId: sub.senderId,
        purpose: 'ORDER',
        description: `Plan renewal: ${planDeliveriesLabel(freq, perCycle)} for ${sub.recipient.name}`,
        baseUrl: resolveBaseUrl(request),
        retryPath: `/renew?sub=${sub.id}&t=${encodeURIComponent(body.t || '')}`,
        firstName,
        lastName: rest.join(' ') || 'Customer',
        email: sub.sender.email || undefined,
        mobilePhoneNumber: (sub.payerWhatsApp || sub.recipient.whatsapp).replace(/\D/g, '').slice(-10) || undefined,
        metadata: {
            source: 'plan_renewal',
            renewalOf: sub.id,
            plan: PLAN_ID,
            planFrequency: freq,
            cartItems: items,
            recipientName: sub.recipient.name,
            recipientWhatsApp: sub.recipient.whatsapp,
            recipientAddress: sub.recipient.address,
            recipientSuburb: sub.recipient.suburb,
            senderName: sub.sender.name,
        },
    });

    if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, checkoutUrl: result.checkoutUrl, paymentId: result.paymentId });
}
