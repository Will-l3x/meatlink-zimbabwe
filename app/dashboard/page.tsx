"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button';
import { whatsappLink } from '@/lib/contact';

interface UserData {
    id: string;
    name: string;
    email: string;
    walletBalance: number;
    walletUSD: number;
    walletZAR: number;
    walletGBP: number;
    role?: string;
}

interface Recipient {
    id: string;
    name: string;
    whatsapp: string;
    address: string;
    suburb: string;
}

interface Delivery {
    id: string;
    recipientName: string;
    date: string;
    location: string;
    status: string;
    pack: string;
    deliveryDate?: string;
    plan?: PlanSummary | null;
}

interface PlanSummary {
    weeks: number;
    deliveriesLeft: number;
    autoRenew: boolean;
    amount: number;
    currency: string;
    state: 'active' | 'renewal_due' | 'ended';
    renewPath: string;
}

function money(amount: number, currency: string) {
    const sym = currency === 'ZAR' ? 'R' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : `${currency} `;
    return `${sym}${amount.toFixed(2)}`;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [showAddRecipient, setShowAddRecipient] = useState(false);
    const [newRecipient, setNewRecipient] = useState({
        name: '', whatsapp: '', address: '', suburb: ''
    });

    useEffect(() => {
        const storedUser = localStorage.getItem('hexad_user');
        if (!storedUser) {
            router.push('/login?next=/dashboard');
            return;
        }
        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        // Load saved recipients (scoped to this user)
        const savedRecipients = localStorage.getItem(`hexad_recipients_${parsed.id}`);
        if (savedRecipients) {
            setRecipients(JSON.parse(savedRecipients));
        }

        // Load delivery history (scoped to this user)
        const savedDeliveries = localStorage.getItem(`hexad_deliveries_${parsed.id}`);
        if (savedDeliveries) {
            setDeliveries(JSON.parse(savedDeliveries));
        }

        setLoading(false);

        // Orders from the server (any device, live delivery status) replace the local copy.
        let cancelled = false;
        fetch('/api/my-orders', { cache: 'no-store' })
            .then(async (res) => {
                if (res.status === 401) {
                    localStorage.removeItem('hexad_user');
                    router.push('/login?next=/dashboard');
                    return;
                }
                const data = await res.json();
                if (!cancelled && data.success && Array.isArray(data.orders) && data.orders.length > 0) {
                    setDeliveries(data.orders);
                }
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, [router]);

    const [planBusy, setPlanBusy] = useState('');
    const [planError, setPlanError] = useState('');

    /** Turn the renewal link for one weekly plan on or off. */
    const setAutoRenew = async (orderId: string, autoRenew: boolean) => {
        setPlanBusy(orderId);
        setPlanError('');
        try {
            const res = await fetch('/api/my-orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: orderId, autoRenew }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setDeliveries((list) => list.map((d) => (d.id === orderId && d.plan ? { ...d, plan: { ...d.plan, autoRenew } } : d)));
        } catch {
            setPlanError('We couldn\'t update your plan. Please try again.');
        } finally {
            setPlanBusy('');
        }
    };

    const duePlans = deliveries.filter((d) => d.plan?.state === 'renewal_due');

    const handleAddRecipient = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRecipient.name || !newRecipient.whatsapp || !newRecipient.address || !newRecipient.suburb) return;

        const recipient: Recipient = {
            id: 'rec_' + Date.now().toString(36),
            ...newRecipient
        };

        const updated = [...recipients, recipient];
        setRecipients(updated);
        localStorage.setItem(`hexad_recipients_${user?.id}`, JSON.stringify(updated));
        setNewRecipient({ name: '', whatsapp: '', address: '', suburb: '' });
        setShowAddRecipient(false);
    };

    const handleRemoveRecipient = (id: string) => {
        const updated = recipients.filter(r => r.id !== id);
        setRecipients(updated);
        localStorage.setItem(`hexad_recipients_${user?.id}`, JSON.stringify(updated));
    };

    if (loading) {
        return (
            <div className={styles.container} style={{ textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <span className={styles.label}>My orders</span>
                    <h1>Welcome, {user?.name?.split(' ')[0] || 'User'} 👋</h1>
                </div>
                <Button href="/shop">New order</Button>
            </header>

            {duePlans.map((d) => d.plan && (
                <div key={d.id} className={styles.renewBanner} role="status">
                    <div>
                        <strong>{d.recipientName}&apos;s weekly plan needs paying for next month</strong>
                        <span>The {d.plan.weeks} prepaid deliveries are used up after {d.deliveryDate || 'this Wednesday'}.</span>
                    </div>
                    <Button href={d.plan.renewPath}>Pay {money(d.plan.amount, d.plan.currency)} →</Button>
                </div>
            ))}

            {/* Stats Cards */}
            <div className={styles.stats}>
                <div className={`${styles.card} ${styles.deliveryCard}`}>
                    <span className={styles.label}>Latest order</span>
                    {deliveries.length > 0 ? (
                        <>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.5rem 0' }}>
                                {deliveries[0].pack}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                For {deliveries[0].recipientName} · {deliveries[0].status} · delivery {deliveries[0].deliveryDate || 'on Wednesday'}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0.5rem 0', color: 'var(--text)' }}>
                                No orders yet
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Pick cuts in the shop, add the delivery details, and pay. It takes about two minutes, and delivery in Harare is free.
                            </div>
                            <Button href="/shop" style={{ marginTop: '1rem' }}>Start your first order →</Button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Grid */}
            <div className={styles.grid}>
                {/* Delivery Feed */}
                <div className={styles.mainFeed}>
                    <div className={styles.feedHeader}>
                        <h3>Order history</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Your family gets a WhatsApp message when each order is on the way and when it&apos;s delivered.
                        </p>
                    </div>

                    {planError && <p role="alert" style={{ color: 'var(--error)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{planError}</p>}
                    <div className={styles.gallery}>
                        {deliveries.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📦</div>
                                <p>No deliveries yet</p>
                                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-light)' }}>
                                    Your orders will appear here after checkout.
                                </p>
                            </div>
                        ) : (
                            deliveries.map(del => (
                                <div key={del.id} className={styles.orderRow}>
                                    <div className={styles.orderAvatar} aria-hidden="true">
                                        {del.recipientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </div>
                                    <div className={styles.orderInfo}>
                                        <h4>{del.pack}</h4>
                                        <span>For {del.recipientName} · {del.location}</span>
                                        <span>Ordered {del.date}{del.deliveryDate ? ` · ${del.plan ? 'next delivery' : 'delivery'} ${del.deliveryDate}` : ''}</span>
                                        {del.plan && (
                                            <div className={styles.planBox}>
                                                <span className={styles.planLine}>
                                                    📅 Weekly plan ·{' '}
                                                    {del.plan.state === 'ended'
                                                        ? 'ended'
                                                        : del.plan.deliveriesLeft > 0
                                                            ? `${del.plan.deliveriesLeft} of ${del.plan.weeks} paid deliveries to come`
                                                            : 'all paid deliveries used'}
                                                </span>
                                                <div className={styles.planActions}>
                                                    {del.plan.state !== 'active' ? (
                                                        <Button href={del.plan.renewPath} style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}>
                                                            {del.plan.state === 'ended' ? 'Restart' : 'Pay'} {money(del.plan.amount, del.plan.currency)} for {del.plan.weeks} more weeks
                                                        </Button>
                                                    ) : (
                                                        <a href={del.plan.renewPath} className={styles.planLink}>Pay ahead</a>
                                                    )}
                                                    {del.plan.state !== 'ended' && (
                                                        <button
                                                            type="button"
                                                            className={styles.planLink}
                                                            disabled={planBusy === del.id}
                                                            onClick={() => setAutoRenew(del.id, !del.plan!.autoRenew)}
                                                        >
                                                            {del.plan.autoRenew ? 'Stop after these deliveries' : 'Keep it going (send renewal link)'}
                                                        </button>
                                                    )}
                                                </div>
                                                {del.plan.state === 'active' && (
                                                    <span className={styles.planHint}>
                                                        {del.plan.autoRenew
                                                            ? 'We\'ll send you a link to pay for the next month when these run out.'
                                                            : 'This plan ends after the last paid delivery.'}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <span className={styles.orderStatus}>{del.status}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Side Panel — Recipients */}
                <div className={styles.sidePanel}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3>Saved Recipients</h3>
                        <button
                            type="button"
                            aria-label={showAddRecipient ? 'Close add recipient form' : 'Add recipient'}
                            onClick={() => setShowAddRecipient(!showAddRecipient)}
                            style={{
                                background: 'var(--secondary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '28px',
                                height: '28px',
                                fontSize: '1.1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                lineHeight: 1
                            }}
                            title="Add recipient"
                        >
                            {showAddRecipient ? '×' : '+'}
                        </button>
                    </div>

                    {/* Add Recipient Form */}
                    {showAddRecipient && (
                        <form onSubmit={handleAddRecipient} className={styles.addRecipientForm}>
                            <input
                                type="text"
                                placeholder="Recipient name"
                                value={newRecipient.name}
                                onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                                required
                            />
                            <input
                                type="text"
                                placeholder="WhatsApp (+263 7...)"
                                value={newRecipient.whatsapp}
                                onChange={(e) => setNewRecipient({ ...newRecipient, whatsapp: e.target.value })}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Delivery address"
                                value={newRecipient.address}
                                onChange={(e) => setNewRecipient({ ...newRecipient, address: e.target.value })}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Suburb (e.g. Mabelreign)"
                                value={newRecipient.suburb}
                                onChange={(e) => setNewRecipient({ ...newRecipient, suburb: e.target.value })}
                                required
                            />
                            <Button fullWidth variant="primary">Save Recipient</Button>
                        </form>
                    )}

                    {/* Recipients List */}
                    <div className={styles.recipientList}>
                        {recipients.length === 0 && !showAddRecipient ? (
                            <div className={styles.emptyState} style={{ fontSize: '0.85rem' }}>
                                <p>No saved recipients yet.</p>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                                    Click + to add your family in Harare.
                                </p>
                            </div>
                        ) : (
                            recipients.map(r => (
                                <div key={r.id} className={styles.recipientCard}>
                                    <div className={styles.recipientAvatar}>
                                        {r.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </div>
                                    <div className={styles.recipientInfo}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {r.suburb}, Harare • {r.whatsapp}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <a
                                            href={`/shop`}
                                            style={{
                                                padding: '0.3rem 0.6rem',
                                                background: 'var(--secondary)',
                                                color: '#fff',
                                                borderRadius: '6px',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                textDecoration: 'none'
                                            }}
                                        >
                                            Send Pack
                                        </a>
                                        <button
                                            onClick={() => handleRemoveRecipient(r.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                color: 'var(--text-light)',
                                                padding: '0.3rem'
                                            }}
                                            title="Remove recipient"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Help Box */}
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        background: 'var(--secondary-light)',
                        borderRadius: '12px',
                        border: '1px solid var(--card-border)'
                    }}>
                        <h4 style={{ color: 'var(--foreground)', marginBottom: '0.5rem' }}>Need Help? 💬</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                            Chat with our Harare logistics team via WhatsApp for real-time delivery updates.
                        </p>
                        <a
                            href={whatsappLink()}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                marginTop: '1rem',
                                padding: '0.75rem',
                                background: '#25D366',
                                color: '#fff',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                textDecoration: 'none',
                                transition: 'opacity 0.15s'
                            }}
                        >
                            💬 WhatsApp Us
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
