"use client";

import React, { useState } from 'react';
import styles from './page.module.css';
import Button from '@/components/ui/Button';

export default function TopUpPage() {
    const [isUploaded, setIsUploaded] = useState(false);

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <header className={styles.header}>
                    <h1>Fund Your Wallet</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>Manual South African Bank Transfer</p>
                </header>

                <div className={styles.bankDetails}>
                    <h3>Our SA Bank Details</h3>
                    <div className={styles.detailRow}>
                        <span>Bank Name</span>
                        <span>Standard Bank</span>
                    </div>
                    <div className={styles.detailRow}>
                        <span>Account Holder</span>
                        <span>MeatLink Zimbabwe (Pty) Ltd</span>
                    </div>
                    <div className={styles.detailRow}>
                        <span>Account Number</span>
                        <span>123 456 789</span>
                    </div>
                    <div className={styles.detailRow}>
                        <span>Reference</span>
                        <span>MLZ-TAFARA-M</span>
                    </div>
                </div>

                {!isUploaded ? (
                    <>
                        <div className={styles.uploadArea} onClick={() => setIsUploaded(true)}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📷</div>
                            <p>Click to upload proof of payment</p>
                            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
                                Supported formats: JPG, PNG, PDF
                            </p>
                        </div>
                        <Button fullWidth variant="secondary">Back to Dashboard</Button>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '3rem', color: '#4caf50', marginBottom: '1rem' }}>✓</div>
                        <h2>Transfer Logged!</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem', lineHeight: '1.6' }}>
                            Our admin team will verify your deposit within 2-4 hours. You will receive a WhatsApp notification once your Wallet Balance is updated.
                        </p>
                        <Button fullWidth href="/dashboard" style={{ marginTop: '2rem' }}>Return to Dashboard</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
