"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button';

interface UserData {
    id: string;
    name: string;
    email: string;
    walletBalance: number;
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
        const storedUser = localStorage.getItem('meatlink_user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        // Load saved recipients (scoped to this user)
        const savedRecipients = localStorage.getItem(`meatlink_recipients_${parsed.id}`);
        if (savedRecipients) {
            setRecipients(JSON.parse(savedRecipients));
        }

        // Load delivery history (scoped to this user)
        const savedDeliveries = localStorage.getItem(`meatlink_deliveries_${parsed.id}`);
        if (savedDeliveries) {
            setDeliveries(JSON.parse(savedDeliveries));
        }

        setLoading(false);
    }, [router]);

    const handleAddRecipient = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRecipient.name || !newRecipient.whatsapp || !newRecipient.address || !newRecipient.suburb) return;

        const recipient: Recipient = {
            id: 'rec_' + Date.now().toString(36),
            ...newRecipient
        };

        const updated = [...recipients, recipient];
        setRecipients(updated);
        localStorage.setItem(`meatlink_recipients_${user?.id}`, JSON.stringify(updated));
        setNewRecipient({ name: '', whatsapp: '', address: '', suburb: '' });
        setShowAddRecipient(false);
    };

    const handleRemoveRecipient = (id: string) => {
        const updated = recipients.filter(r => r.id !== id);
        setRecipients(updated);
        localStorage.setItem(`meatlink_recipients_${user?.id}`, JSON.stringify(updated));
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
                    <span className={styles.label}>Dashboard</span>
                    <h1>Welcome, {user?.name?.split(' ')[0] || 'User'} 👋</h1>
                </div>
                <Button href="/shop">Send New Pack</Button>
            </header>

            {/* Stats Cards */}
            <div className={styles.stats}>
                <div className={`${styles.card} ${styles.walletCard}`}>
                    <span className={styles.label}>Wallet Balance</span>
                    <div className={styles.value}>${(user?.walletBalance || 0).toFixed(2)}</div>
                    <Button fullWidth href="/top-up">Top Up Funds</Button>
                </div>

                <div className={`${styles.card} ${styles.deliveryCard}`}>
                    <div className={styles.status}>
                        {deliveries.length > 0 ? 'ACTIVE SUBSCRIPTION' : 'NO ACTIVE SUBSCRIPTION'}
                    </div>
                    <span className={styles.label}>Delivery Status</span>
                    {deliveries.length > 0 ? (
                        <>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.5rem 0' }}>
                                {deliveries[0].pack} — Weekly
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Next delivery: Wednesday • Recipient: {deliveries[0].recipientName}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0.5rem 0', color: 'var(--text)' }}>
                                No active subscription yet
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Add a recipient below, then visit the shop to start feeding your family.
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Main Grid */}
            <div className={styles.grid}>
                {/* Delivery Feed */}
                <div className={styles.mainFeed}>
                    <div className={styles.feedHeader}>
                        <h3>Proof of Delivery Feed</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Delivery photos will appear here once your first pack is sent
                        </p>
                    </div>

                    <div className={styles.gallery}>
                        {deliveries.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📦</div>
                                <p>No deliveries yet</p>
                                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-light)' }}>
                                    Once you subscribe, delivery confirmations with photos will show here.
                                </p>
                            </div>
                        ) : (
                            deliveries.map(del => (
                                <div key={del.id} className={styles.podCard}>
                                    <div className={styles.podImage}>
                                        <span style={{ fontSize: '2rem' }}>📸</span>
                                    </div>
                                    <div className={styles.podInfo}>
                                        <h4>{del.recipientName}</h4>
                                        <span>{del.date} • {del.location}</span>
                                        <span style={{
                                            display: 'inline-block',
                                            marginTop: '0.25rem',
                                            padding: '0.15rem 0.5rem',
                                            background: 'rgba(45, 106, 79, 0.1)',
                                            color: 'var(--success)',
                                            borderRadius: '50px',
                                            fontSize: '0.7rem',
                                            fontWeight: 600
                                        }}>
                                            ✓ {del.status}
                                        </span>
                                    </div>
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
                        <h4 style={{ color: 'var(--secondary)', marginBottom: '0.5rem' }}>Need Help?</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                            Chat with our Harare logistics team via WhatsApp for real-time delivery updates.
                        </p>
                        <Button variant="secondary" fullWidth style={{ marginTop: '1rem' }}>WhatsApp Us</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
