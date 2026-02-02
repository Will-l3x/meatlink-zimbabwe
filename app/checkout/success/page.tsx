"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import Button from '@/components/ui/Button';

function SuccessContent() {
    const searchParams = useSearchParams();
    const subId = searchParams.get('subId');

    return (
        <div className={styles.container}>
            <div className={styles.successIcon}>✓</div>
            <header className={styles.header}>
                <h1>Payment Successful!</h1>
                <p>
                    Your family pack has been ordered. The recipeint in Harare has been notified via WhatsApp and will receive their first delivery this upcoming Wednesday.
                </p>
            </header>

            <div className={styles.details}>
                <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Order Status</span>
                    <span className={styles.detailValue} style={{ color: '#4caf50' }}>ACTIVE</span>
                </div>
                <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Subscription ID</span>
                    <span className={styles.detailValue}>#{subId?.substr(-8).toUpperCase()}</span>
                </div>
                <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Next Delivery</span>
                    <span className={styles.detailValue}>Coming Wednesday</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <Button href="/dashboard" fullWidth>Go to Dashboard</Button>
                <Button href="/shop" variant="secondary" fullWidth>Order More</Button>
            </div>

            <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                A confirmation email has been sent to your registered address.
            </p>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div>Loading Success...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
