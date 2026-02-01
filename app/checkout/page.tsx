"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button';

const HAMPERS = {
    'gogo-pack': { title: 'The Gogo Pack', usd: 45, zar: 850, gbp: 35 },
    'family-pack': { title: 'The Family Feast', usd: 85, zar: 1600, gbp: 65 },
    'braai-pack': { title: 'Harare Braai Master', usd: 120, zar: 2200, gbp: 95 },
    'monthly-saver': { title: 'Monthly Saver', usd: 180, zar: 3350, gbp: 140 },
};

function CheckoutContent() {
    const searchParams = useSearchParams();
    const packId = searchParams.get('pack') || 'gogo-pack';
    const pack = HAMPERS[packId as keyof typeof HAMPERS] || HAMPERS['gogo-pack'];

    const [currency, setCurrency] = useState<'usd' | 'zar' | 'gbp'>('usd');

    const getPriceLabel = () => {
        if (currency === 'zar') return `R${pack.zar}`;
        if (currency === 'gbp') return `£${pack.gbp}`;
        return `$${pack.usd}`;
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Checkout</h1>
                <p>Complete your subscription and feed your loved ones.</p>
            </header>

            <div className={styles.grid}>
                <div className={styles.main}>
                    <div className={styles.section}>
                        <h2>1. Recipient Details</h2>
                        <div className={styles.formGroup}>
                            <label>Recipient Name (Harare)</label>
                            <input type="text" placeholder="e.g. Mrs. Moyo" />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Recipient WhatsApp Number</label>
                            <input type="text" placeholder="+263 7..." />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Delivery Address</label>
                            <textarea rows={3} placeholder="House number, Street, Suburb (Harare)" />
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2>2. Delivery Settings</h2>
                        <div className={styles.formGroup}>
                            <label>Frequency</label>
                            <select defaultValue="weekly">
                                <option value="weekly">Every Week (Recommended for power cuts)</option>
                                <option value="bi-weekly">Every 2 Weeks</option>
                                <option value="monthly">Every Month</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2>3. Payment Method</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <Button variant="primary">Stripe / Card</Button>
                            <Button variant="secondary">Manual EFT (SA Banks)</Button>
                        </div>
                        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                            For manual EFT, you will be prompted to upload a proof-of-payment screenshot.
                        </p>
                    </div>
                </div>

                <aside className={styles.summary}>
                    <h3>Order Summary</h3>
                    <div className={styles.currencyToggle}>
                        {(['usd', 'zar', 'gbp'] as const).map(curr => (
                            <button
                                key={curr}
                                className={`${styles.toggleBtn} ${currency === curr ? styles.toggleBtnActive : ''}`}
                                onClick={() => setCurrency(curr)}
                            >
                                {curr.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className={styles.summaryItem}>
                        <span>Selected Pack</span>
                        <span>{pack.title}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span>First Delivery</span>
                        <span>Upcoming Wednesday</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span>Processing Fee</span>
                        <span>Free</span>
                    </div>

                    <div className={styles.total}>
                        <span>Monthly Total</span>
                        <span>{getPriceLabel()}</span>
                    </div>

                    <Button fullWidth style={{ marginTop: '2rem' }}>
                        Confirm & Pay
                    </Button>

                    <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: '1.4' }}>
                        By clicking "Confirm & Pay", you agree to fund your Wallet Balance for monthly deliveries. You can pause or skip weeks anytime from your dashboard.
                    </p>
                </aside>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className={styles.container}>Loading Checkout...</div>}>
            <CheckoutContent />
        </Suspense>
    );
}
