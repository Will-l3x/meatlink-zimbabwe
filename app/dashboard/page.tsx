"use client";

import styles from './page.module.css';
import Button from '@/components/ui/Button';

export default function DashboardPage() {
    const pods: any[] = [];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <span className={styles.label}>Dashboard</span>
                    <h1>Your Account</h1>
                </div>
                <Button href="/shop">Send New Pack</Button>
            </header>

            <div className={styles.stats}>
                <div className={`${styles.card} ${styles.walletCard}`}>
                    <span className={styles.label}>Wallet Balance</span>
                    <div className={styles.value}>$0.00</div>
                    <Button fullWidth onClick={() => { }}>Top Up Funds</Button>
                </div>

                <div className={`${styles.card} ${styles.deliveryCard}`}>
                    <div className={styles.status}>NO ACTIVE DELIVERY</div>
                    <span className={styles.label}>Subscription Status</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.5rem 0' }}>No active subscription</div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                        Browse the shop to start feeding your family in Harare.
                    </div>
                </div>
            </div>

            <div className={styles.grid}>
                <div className={styles.mainFeed}>
                    <div className={styles.feedHeader}>
                        <h3>Proof of Delivery Feed</h3>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Recent handovers will appear here</p>
                    </div>

                    <div className={styles.gallery}>
                        {pods.length === 0 ? (
                            <div className={styles.emptyState}>No deliveries yet.</div>
                        ) : (
                            pods.map(pod => (
                                <div key={pod.id} className={styles.podCard}>
                                    <div className={styles.podImage}>[Handover Photo]</div>
                                    <div className={styles.podInfo}>
                                        <h4>{pod.recipient}</h4>
                                        <span>{pod.date} • {pod.location}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className={styles.sidePanel}>
                    <h3>Saved Recipients</h3>
                    <div className={styles.recipientList}>
                        <div className={styles.emptyState} style={{ fontSize: '0.85rem' }}>No saved recipients yet.</div>
                    </div>

                    <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Need Help?</h4>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4' }}>
                            Chat with our Harare logistics team via WhatsApp for real-time delivery updates.
                        </p>
                        <Button variant="secondary" fullWidth style={{ marginTop: '1rem' }}>WhatsApp Us</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
