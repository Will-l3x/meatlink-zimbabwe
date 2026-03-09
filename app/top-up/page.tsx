"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button';

type PaymentMethod = 'stripe' | 'eft';
type Currency = 'USD' | 'ZAR' | 'GBP';

const PRESET_AMOUNTS: Record<Currency, number[]> = {
    USD: [25, 50, 100, 200],
    ZAR: [500, 1000, 2000, 4000],
    GBP: [20, 40, 80, 160]
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
    USD: '$', ZAR: 'R', GBP: '£'
};

export default function TopUpPage() {
    const router = useRouter();
    const [method, setMethod] = useState<PaymentMethod>('stripe');
    const [currency, setCurrency] = useState<Currency>('USD');
    const [amount, setAmount] = useState<number | ''>('');
    const [processing, setProcessing] = useState(false);
    const [eftUploaded, setEftUploaded] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleStripePayment = async () => {
        if (!amount || amount <= 0) return;
        setProcessing(true);

        try {
            const storedUser = localStorage.getItem('hexad_user');
            const user = storedUser ? JSON.parse(storedUser) : null;

            const res = await fetch('/api/wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    currency,
                    userId: user?.id || 'guest',
                    provider: 'stripe'
                })
            });

            const data = await res.json();
            if (data.success) {
                if (user) {
                    user.walletUSD = data.walletUSD;
                    user.walletZAR = data.walletZAR;
                    user.walletGBP = data.walletGBP;
                    localStorage.setItem('hexad_user', JSON.stringify(user));
                }
                setSuccess(true);
            }
        } catch (err) {
            console.error(err);
            alert('Payment failed. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const handleEftUpload = () => {
        if (!amount || amount <= 0) return;
        const storedUser = localStorage.getItem('hexad_user');
        const user = storedUser ? JSON.parse(storedUser) : null;

        // EFT is pending admin approval, so we don't update balance yet
        setEftUploaded(true);
    };

    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
                        <h2>Wallet Funded!</h2>
                        <p style={{ color: 'var(--text-muted)', margin: '1rem 0', lineHeight: '1.6' }}>
                            {CURRENCY_SYMBOLS[currency]}{amount} has been added to your wallet balance.
                            You can now subscribe to a meat pack for your family.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <Button fullWidth href="/dashboard">Go to Dashboard</Button>
                            <Button fullWidth variant="secondary" href="/shop">Shop Packs</Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (eftUploaded) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📋</div>
                        <h2>Transfer Logged!</h2>
                        <p style={{ color: 'var(--text-muted)', margin: '1rem 0', lineHeight: '1.6' }}>
                            Our admin team will verify your {CURRENCY_SYMBOLS[currency]}{amount} deposit within 2-4 hours.
                            You will receive a WhatsApp notification once your Wallet Balance is updated.
                        </p>
                        <Button fullWidth href="/dashboard" style={{ marginTop: '1rem' }}>Return to Dashboard</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <header className={styles.header}>
                    <h1>Fund Your Wallet</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Choose your preferred payment method
                    </p>
                </header>

                {/* Payment Method Tabs */}
                <div className={styles.methodTabs}>
                    <button
                        className={`${styles.methodTab} ${method === 'stripe' ? styles.methodTabActive : ''}`}
                        onClick={() => setMethod('stripe')}
                    >
                        <span style={{ fontSize: '1.2rem' }}>💳</span>
                        <span>Card / Stripe</span>
                    </button>
                    <button
                        className={`${styles.methodTab} ${method === 'eft' ? styles.methodTabActive : ''}`}
                        onClick={() => setMethod('eft')}
                    >
                        <span style={{ fontSize: '1.2rem' }}>🏦</span>
                        <span>Bank Transfer (EFT)</span>
                    </button>
                </div>

                {/* Currency Selector */}
                <div className={styles.currencyRow}>
                    <label>Currency</label>
                    <div className={styles.currencyToggle}>
                        {(['USD', 'ZAR', 'GBP'] as Currency[]).map(c => (
                            <button
                                key={c}
                                className={`${styles.currBtn} ${currency === c ? styles.currBtnActive : ''}`}
                                onClick={() => { setCurrency(c); setAmount(''); }}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Amount Section */}
                <div className={styles.amountSection}>
                    <label>Amount</label>
                    <div className={styles.presets}>
                        {PRESET_AMOUNTS[currency].map(preset => (
                            <button
                                key={preset}
                                className={`${styles.presetBtn} ${amount === preset ? styles.presetBtnActive : ''}`}
                                onClick={() => setAmount(preset)}
                            >
                                {CURRENCY_SYMBOLS[currency]}{preset}
                            </button>
                        ))}
                    </div>
                    <div className={styles.customAmount}>
                        <span className={styles.currSymbol}>{CURRENCY_SYMBOLS[currency]}</span>
                        <input
                            type="number"
                            placeholder="Custom amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                            min={1}
                        />
                    </div>
                </div>

                {/* Method-specific content */}
                {method === 'stripe' ? (
                    <div className={styles.stripeSection}>
                        <div className={styles.secureNote}>
                            <span>🔒</span>
                            <span>Secure payment processed by Stripe. Your card details are never stored on our servers.</span>
                        </div>
                        <Button
                            fullWidth
                            onClick={handleStripePayment}
                        >
                            {processing
                                ? 'Processing...'
                                : amount
                                    ? `Pay ${CURRENCY_SYMBOLS[currency]}${amount} with Stripe`
                                    : 'Enter an amount above'
                            }
                        </Button>
                    </div>
                ) : (
                    <div>
                        <div className={styles.bankDetails}>
                            <h3>SA Bank Details</h3>
                            <div className={styles.detailRow}>
                                <span>Bank</span>
                                <span>Standard Bank</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span>Account Holder</span>
                                <span>Hexad Market (Pty) Ltd</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span>Account Number</span>
                                <span>123 456 789</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span>Branch Code</span>
                                <span>051001</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span>Reference</span>
                                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Your email address</span>
                            </div>
                        </div>

                        <div className={styles.uploadArea} onClick={handleEftUpload}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📷</div>
                            <p style={{ fontWeight: 600 }}>Upload proof of payment</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                                JPG, PNG, or PDF — Max 5MB
                            </p>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '1rem' }}>
                    <Button fullWidth variant="secondary" href="/dashboard">Back to Dashboard</Button>
                </div>
            </div>
        </div>
    );
}
