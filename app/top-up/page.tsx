"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button';

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
    const [currency, setCurrency] = useState<Currency>('USD');
    const [amount, setAmount] = useState<number | ''>('');
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleZBPayment = async () => {
        if (!amount || amount <= 0) return;
        setProcessing(true);

        try {
            const storedUser = localStorage.getItem('hexad_user');
            const user = storedUser ? JSON.parse(storedUser) : null;

            if (!user?.id || user.id === 'guest') {
                alert('Please log in to top up your wallet.');
                router.push('/login');
                return;
            }

            const res = await fetch('/api/payments/zb-smilenpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    currency,
                    userId: user.id,
                    purpose: 'WALLET_TOPUP',
                    description: `Wallet top-up: ${CURRENCY_SYMBOLS[currency]}${amount}`,
                }),
            });

            const data = await res.json();
            if (data.success && data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            } else {
                alert(data.error || 'Failed to initiate ZB payment. Please try again.');
            }
        } catch (err) {
            console.error(err);
            alert('Could not connect to ZB payment gateway. Please try again.');
        } finally {
            setProcessing(false);
        }
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

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <header className={styles.header}>
                    <h1>Fund Your Wallet</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Choose your top-up amount
                    </p>
                </header>

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

                {/* ZB Payment Content */}
                <div className={styles.stripeSection}>
                    <div className={styles.secureNote}>
                        <span>🇿🇼</span>
                        <span>Pay securely via ZB Smile & Pay.</span>
                    </div>
                    
                    <Button
                        fullWidth
                        onClick={handleZBPayment}
                        style={{ marginTop: '1.5rem' }}
                    >
                        {processing
                            ? 'Connecting to ZB...'
                            : amount
                                ? `Pay ${CURRENCY_SYMBOLS[currency]}${amount} via ZB Smile & Pay`
                                : 'Enter an amount above'
                        }
                    </Button>
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <Button fullWidth variant="secondary" href="/dashboard">Back to Dashboard</Button>
                </div>
            </div>
        </div>
    );
}
