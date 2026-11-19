"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { whatsappLink } from '@/lib/contact';
import { readStoredJson, writeStoredJson, removeStoredItem } from '@/lib/storage';
import { planDeliveriesLabel, planFrequency, PLAN_FREQUENCIES } from '@/lib/delivery';

type Outcome = { status: 'processing' | 'success' | 'failed'; message: string; title?: string };

interface PaymentInfo {
    id: string;
    status: string;
    amount?: number;
    currency?: string;
    purpose?: string;
    orderReference?: string | null;
    subscriptionId?: string | null;
    kind?: 'single' | 'plan' | 'renewal';
    planFrequency?: string;
}

interface PendingOrder {
    senderId?: string;
    recipientName?: string;
    recipientSuburb?: string;
    cartItems?: Array<{ title: string; kg: number }>;
}

interface StoredUser {
    id?: string;
    walletUSD?: number;
    walletZAR?: number;
    walletGBP?: number;
    [key: string]: unknown;
}

interface LocalDelivery {
    id: string;
    recipientName: string;
    date: string;
    location: string;
    status: string;
    pack: string;
}

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;

function nextWednesdayLabel(): string {
    const d = new Date();
    d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7 || 7));
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Mirror the confirmed payment into this browser's local dashboard data.
 * Returns the recipient's name (if known) for the confirmation message.
 */
function recordLocalOutcome(payment: PaymentInfo): string | undefined {
    const user = readStoredJson<StoredUser | null>('hexad_user', null);

    if (payment.purpose === 'WALLET_TOPUP') {
        if (user && payment.amount) {
            const curr = (payment.currency || 'USD').toUpperCase();
            const key = curr === 'ZAR' ? 'walletZAR' : curr === 'GBP' ? 'walletGBP' : 'walletUSD';
            user[key] = (Number(user[key]) || 0) + payment.amount;
            writeStoredJson('hexad_user', user);
        }
        return undefined;
    }

    // A plan renewal was paid from a link: the cart and checkout draft belong to something else.
    if (payment.kind === 'renewal') return undefined;

    const pending = readStoredJson<PendingOrder | null>('hexad_pending_zb_order', null);
    const senderId = pending?.senderId || user?.id;
    if (senderId) {
        const key = `hexad_deliveries_${senderId}`;
        const history = readStoredJson<LocalDelivery[]>(key, []);
        const entryId = payment.subscriptionId || payment.id;
        if (!history.some((d) => d.id === entryId)) {
            history.unshift({
                id: entryId,
                recipientName: pending?.recipientName || 'Recipient',
                date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                location: `${pending?.recipientSuburb || 'Harare'}, Harare`,
                status: 'Scheduled',
                pack: pending?.cartItems?.map((i) => `${i.title} (${i.kg}kg)`).join(', ') || 'Hexad Market Order',
            });
            writeStoredJson(key, history);
        }
    }

    removeStoredItem('hexad_cart');
    removeStoredItem('hexad_pending_zb_order');
    removeStoredItem('hexad_checkout_draft');
    return pending?.recipientName;
}

function ZBReturnContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const paymentId = searchParams.get('paymentId') || '';
    const orderRef = searchParams.get('orderRef') || '';
    const urlStatus = searchParams.get('status') || '';
    // Renewal payments come back with their own "try again" page instead of the cart.
    const retryRaw = searchParams.get('retry') || '';
    const retryPath = retryRaw.startsWith('/renew?') ? retryRaw : '';

    // Outcomes we can determine from the URL alone, without polling.
    const urlOutcome = useMemo<Outcome | null>(() => {
        if (urlStatus === 'cancelled') return { status: 'failed', message: 'You cancelled the payment, so nothing was charged.' };
        if (urlStatus === 'failed') return { status: 'failed', message: 'The payment didn\'t go through, so nothing was charged. You can try again or use another payment method.' };
        if (!paymentId && !orderRef) return { status: 'failed', message: 'Invalid payment session. No payment reference found.' };
        return null;
    }, [urlStatus, paymentId, orderRef]);

    const [polledOutcome, setPolledOutcome] = useState<Outcome | null>(null);
    const view: Outcome = urlOutcome ?? polledOutcome ?? { status: 'processing', message: 'Processing your payment...' };

    useEffect(() => {
        if (urlOutcome) return;

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let attempts = 0;

        const finish = (outcome: Outcome) => {
            if (!cancelled) setPolledOutcome(outcome);
        };

        const checkStatus = async () => {
            if (cancelled) return;
            attempts++;
            try {
                const params = new URLSearchParams();
                if (paymentId) params.set('paymentId', paymentId);
                if (orderRef) params.set('orderRef', orderRef);
                const res = await fetch(`/api/payments/zb-smilenpay?${params.toString()}`, { cache: 'no-store' });
                const data = await res.json();

                if (data.success && data.payment) {
                    const payment = data.payment as PaymentInfo;
                    if (payment.status === 'COMPLETED') {
                        const recipientName = recordLocalOutcome(payment) || 'the recipient';
                        let message: string;
                        let title = 'Order confirmed';
                        if (payment.purpose === 'WALLET_TOPUP') {
                            message = 'Your wallet has been topped up successfully!';
                        } else if (payment.kind === 'renewal') {
                            const freq = planFrequency(payment.planFrequency);
                            title = 'Plan renewed';
                            message = `Thank you. ${planDeliveriesLabel(freq)} more ${freq === 'MONTHLY' ? 'is' : 'are'} paid for and will carry on ${PLAN_FREQUENCIES[freq].cadence}. You can follow them under My orders.`;
                        } else if (payment.kind === 'plan') {
                            const freq = planFrequency(payment.planFrequency);
                            title = `${PLAN_FREQUENCIES[freq].label} plan set up`;
                            message = `${recipientName} will get this order ${PLAN_FREQUENCIES[freq].cadence}, starting ${nextWednesdayLabel()}. ` +
                                `You've paid for the next 4 weeks (${planDeliveriesLabel(freq)}). We'll WhatsApp ${recipientName} before each delivery, ` +
                                `and before the paid deliveries run out you'll get a link to pay for the next 4 weeks.`;
                        } else {
                            message = `Your order is confirmed for delivery on ${nextWednesdayLabel()}. ` +
                                `We'll WhatsApp ${recipientName} when it's on the way, and you can follow it under My orders.`;
                        }
                        finish({ status: 'success', title, message });
                        return;
                    }
                    if (payment.status === 'FAILED' || payment.status === 'EXPIRED') {
                        finish({ status: 'failed', message: 'Payment was not completed. Please try again.' });
                        return;
                    }
                } else if (res.status === 404) {
                    finish({ status: 'failed', message: 'We could not find this payment. Please contact support if you were charged.' });
                    return;
                }
            } catch (error) {
                console.error('ZB return polling error:', error);
            }

            if (attempts >= MAX_ATTEMPTS) {
                finish({ status: 'failed', message: 'Payment verification timed out. If you were charged, please contact support with your reference.' });
                return;
            }
            timer = setTimeout(checkStatus, POLL_INTERVAL_MS);
        };

        timer = setTimeout(checkStatus, 1500);
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [paymentId, orderRef, urlOutcome]);

    return (
        <div style={{
            maxWidth: '520px',
            margin: '0 auto',
            padding: '4rem 2rem',
            textAlign: 'center',
        }}>
            <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius)',
                padding: '3rem 2rem',
                boxShadow: 'var(--card-shadow)',
            }}>
                <div style={{
                    fontSize: '4rem',
                    marginBottom: '1.5rem',
                    animation: view.status === 'processing' ? 'pulse 1.5s infinite' : 'none',
                }}>
                    {view.status === 'processing' && '⏳'}
                    {view.status === 'success' && '✅'}
                    {view.status === 'failed' && '❌'}
                </div>

                <h1 style={{
                    fontSize: '1.75rem',
                    marginBottom: '0.75rem',
                    color: view.status === 'success'
                        ? 'var(--success, #22c55e)'
                        : view.status === 'failed'
                            ? 'var(--error, #ef4444)'
                            : 'var(--foreground)',
                }}>
                    {view.status === 'processing' && 'Confirming your payment…'}
                    {view.status === 'success' && (view.title || 'Order confirmed')}
                    {view.status === 'failed' && 'Payment not completed'}
                </h1>

                <p style={{
                    color: 'var(--text-muted)',
                    marginBottom: '1rem',
                    lineHeight: 1.6,
                    fontSize: '0.95rem',
                }}>
                    {view.message}
                </p>

                {orderRef && (
                    <div style={{
                        background: 'var(--background)',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        marginBottom: '2rem',
                        fontFamily: 'monospace',
                    }}>
                        Ref: {orderRef}
                    </div>
                )}

                {view.status !== 'processing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                        {view.status === 'success' && (
                            <>
                                <Button fullWidth onClick={() => router.push('/dashboard')}>
                                    View my orders
                                </Button>
                                <Button fullWidth variant="secondary" onClick={() => router.push('/shop')}>
                                    Order something else
                                </Button>
                            </>
                        )}
                        {view.status === 'failed' && (
                            <>
                                <Button fullWidth onClick={() => router.push(retryPath || '/checkout')}>
                                    {retryPath ? 'Try again' : 'Try again (your cart is saved)'}
                                </Button>
                                <Button fullWidth variant="secondary" href={whatsappLink(`Hi, I had a problem paying for my order${orderRef ? ` (ref ${orderRef})` : ''}.`)}>
                                    Get help on WhatsApp
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {view.status === 'processing' && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '2rem',
                    }}>
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: 'var(--primary)',
                                    opacity: 0.3,
                                    animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                @keyframes dotPulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.3); }
                }
            `}</style>
        </div>
    );
}

export default function ZBReturnPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 2rem' }}>
                <p>Loading payment status...</p>
            </div>
        }>
            <ZBReturnContent />
        </Suspense>
    );
}
