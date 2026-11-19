"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { whatsappLink } from '@/lib/contact';

interface PlanInfo {
    id: string;
    recipientName: string;
    suburb: string;
    items: Array<{ title: string; kg: number }>;
    weeks: number;
    amount: number;
    currency: string;
    deliveriesLeft: number;
    renewalDue: boolean;
    isActive: boolean;
    nextDelivery: string;
}

function money(amount: number, currency: string) {
    const sym = currency === 'ZAR' ? 'R' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : `${currency} `;
    return `${sym}${amount.toFixed(2)}`;
}

const card: React.CSSProperties = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: 'var(--radius)',
    padding: '2rem 1.5rem',
    boxShadow: 'var(--card-shadow)',
};

function RenewContent() {
    const params = useSearchParams();
    const sub = params.get('sub') || '';
    const token = params.get('t') || '';

    const [plan, setPlan] = useState<PlanInfo | null>(null);
    const [loadError, setLoadError] = useState('');
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const q = new URLSearchParams({ sub, t: token });
        fetch(`/api/renew?${q.toString()}`, { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return;
                if (data.success) setPlan(data.plan);
                else setLoadError(data.error || 'This renewal link is not valid.');
            })
            .catch(() => !cancelled && setLoadError('We couldn\'t load this plan. Check your connection and try again.'));
        return () => { cancelled = true; };
    }, [sub, token]);

    const pay = async () => {
        setPaying(true);
        setPayError('');
        try {
            const res = await fetch('/api/renew', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sub, t: token }),
            });
            const data = await res.json();
            if (data.success && data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
                return;
            }
            setPayError(data.error || 'We couldn\'t start the payment. Please try again.');
        } catch {
            setPayError('We couldn\'t reach the payment service. Check your connection and try again.');
        }
        setPaying(false);
    };

    if (loadError) {
        return (
            <div style={card}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Link not valid</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{loadError}</p>
                <Button fullWidth href="/dashboard">Go to My orders</Button>
                <Button fullWidth variant="secondary" href={whatsappLink('Hi, my plan renewal link is not working.')} style={{ marginTop: '0.75rem' }}>
                    Get help on WhatsApp
                </Button>
            </div>
        );
    }

    if (!plan) {
        return <div style={{ ...card, color: 'var(--text-muted)' }}>Loading your plan…</div>;
    }

    const lastDrop = new Date(plan.nextDelivery).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const status = !plan.isActive
        ? `This plan has ended. Paying restarts ${plan.weeks} weekly deliveries from the next Wednesday.`
        : plan.renewalDue
            ? `The prepaid deliveries are used up. The last one is on ${lastDrop}. Pay now to keep them coming every Wednesday.`
            : `Deliveries are already paid up to ${plan.deliveriesLeft === 0 ? lastDrop : 'the coming weeks'}. Paying now adds ${plan.weeks} more, straight after those.`;

    return (
        <div style={card}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                Weekly plan
            </p>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>
                Keep {plan.recipientName}&apos;s deliveries going
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>{status}</p>

            <div style={{ background: 'var(--background)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Every Wednesday · {plan.suburb}, Harare</div>
                {plan.items.map((i) => (
                    <div key={i.title} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.95rem' }}>
                        <span>{i.title}</span>
                        <span>{i.kg} kg</span>
                    </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', marginTop: '0.75rem', paddingTop: '0.75rem', fontWeight: 800 }}>
                    <span>{plan.weeks} weekly deliveries</span>
                    <span>{money(plan.amount, plan.currency)}</span>
                </div>
            </div>

            {payError && <p role="alert" style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>{payError}</p>}

            <Button fullWidth onClick={pay} disabled={paying}>
                {paying ? 'Connecting to ZB…' : <>Pay {money(plan.amount, plan.currency)} →</>}
            </Button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                Secure payment with ZB Smile &amp; Pay: Ecocash, InnBucks, Visa/Mastercard or Zimswitch. Nothing is charged automatically.
            </p>
        </div>
    );
}

export default function RenewPage() {
    return (
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '3rem 1rem', textAlign: 'center' }}>
            <Suspense fallback={<p>Loading…</p>}>
                <RenewContent />
            </Suspense>
        </div>
    );
}
