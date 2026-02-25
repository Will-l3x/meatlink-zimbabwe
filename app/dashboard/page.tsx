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
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('meatlink_user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setLoading(false);
    }, [router]);

    // Mock delivery feed data for demo
    const pods = [
        {
            id: '1',
            recipient: 'Mrs. Moyo',
            date: 'Wed, 19 Feb',
            location: 'Mabelreign',
            status: 'Delivered'
        },
        {
            id: '2',
            recipient: 'Mr. Chikomo',
            date: 'Wed, 12 Feb',
            location: 'Borrowdale',
            status: 'Delivered'
        }
    ];

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

            <div className={styles.stats}>
                <div className={`${styles.card} ${styles.walletCard}`}>
                    <span className={styles.label}>Wallet Balance</span>
                    <div className={styles.value}>${(user?.walletBalance || 0).toFixed(2)}</div>
                    <Button fullWidth href="/top-up">Top Up Funds</Button>
                </div>

                <div className={`${styles.card} ${styles.deliveryCard}`}>
                    <div className={styles.status}>
                        {pods.length > 0 ? 'ACTIVE SUBSCRIPTION' : 'NO ACTIVE DELIVERY'}
                    </div>
                    <span className={styles.label}>Subscription Status</span>
                    {pods.length > 0 ? (
                        <>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.5rem 0' }}>
                                The Gogo Pack — Weekly
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Next delivery: Wednesday • Recipient: Mrs. Moyo
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.5rem 0' }}>No active subscription</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Browse the shop to start feeding your family in Harare.
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className={styles.grid}>
                <div className={styles.mainFeed}>
                    <div className={styles.feedHeader}>
                        <h3>Proof of Delivery Feed</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Recent handovers will appear here</p>
                    </div>

                    <div className={styles.gallery}>
                        {pods.length === 0 ? (
                            <div className={styles.emptyState}>No deliveries yet.</div>
                        ) : (
                            pods.map(pod => (
                                <div key={pod.id} className={styles.podCard}>
                                    <div className={styles.podImage}>
                                        <span style={{ fontSize: '2rem' }}>📦</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Delivery Photo</span>
                                    </div>
                                    <div className={styles.podInfo}>
                                        <h4>{pod.recipient}</h4>
                                        <span>{pod.date} • {pod.location}</span>
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
                                            ✓ {pod.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className={styles.sidePanel}>
                    <h3>Saved Recipients</h3>
                    <div className={styles.recipientList}>
                        <div style={{
                            padding: '1rem',
                            background: 'var(--secondary-light)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'var(--secondary)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 700
                            }}>MM</div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Mrs. Moyo</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mabelreign, Harare</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--secondary-light)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
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
