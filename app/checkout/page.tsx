"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button';

const HAMPERS: Record<string, { title: string; usd: number; zar: number; gbp: number }> = {
    'pork-chops': { title: 'Pork Chops', usd: 5.45, zar: 101, gbp: 4.30 },
    'pork-trotters': { title: 'Pork Trotters', usd: 3.75, zar: 69, gbp: 2.96 },
    'pork-shoulder': { title: 'Pork Shoulder', usd: 5.00, zar: 93, gbp: 3.95 },
    'pork-belly': { title: 'Pork Belly', usd: 6.00, zar: 111, gbp: 4.74 },
    'pork-ribs': { title: 'Pork Ribs', usd: 5.00, zar: 93, gbp: 3.95 },
    't-bone-steak': { title: 'T-Bone Steak', usd: 7.20, zar: 133, gbp: 5.69 },
    'blade': { title: 'Blade', usd: 6.55, zar: 121, gbp: 5.17 },
    'brisket': { title: 'Brisket', usd: 6.00, zar: 111, gbp: 4.74 },
    'full-chicken': { title: 'Full Chicken', usd: 6.89, zar: 127, gbp: 5.44 },
    'chicken-breast': { title: 'Chicken Breast', usd: 4.62, zar: 85, gbp: 3.65 },
    'mixed-portions': { title: 'Mixed Portions', usd: 5.00, zar: 93, gbp: 3.95 },
    'oxtail': { title: 'Oxtail', usd: 12.86, zar: 238, gbp: 10.16 },
    'beef-short-ribs': { title: 'Beef Short Ribs', usd: 6.00, zar: 111, gbp: 4.74 },
    'beef-trotters': { title: 'Beef Trotters', usd: 4.50, zar: 83, gbp: 3.56 },
    'liver': { title: 'Liver', usd: 7.50, zar: 139, gbp: 5.93 },
    'goat-meat': { title: 'Goat Meat', usd: 6.92, zar: 128, gbp: 5.47 },
};

type PaymentMethod = 'wallet' | 'stripe' | 'eft';

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const packId = searchParams.get('pack') || 'pork-chops';
    const pack = HAMPERS[packId] || HAMPERS['pork-chops'];

    const [currency, setCurrency] = useState<'usd' | 'zar' | 'gbp'>('usd');
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
    const [savedRecipients, setSavedRecipients] = useState<Array<{ id: string, name: string, whatsapp: string, address: string, suburb: string }>>([]);
    const [walletBalances, setWalletBalances] = useState({ usd: 0, zar: 0, gbp: 0 });
    const [formData, setFormData] = useState({
        recipientName: '',
        recipientWhatsApp: '',
        recipientAddress: '',
        recipientSuburb: '',
        frequency: 'WEEKLY'
    });

    // Load saved recipients and wallet balance
    React.useEffect(() => {
        const storedUser = localStorage.getItem('hexad_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setWalletBalances({
                usd: user.walletUSD || 0,
                zar: user.walletZAR || 0,
                gbp: user.walletGBP || 0
            });

            // Load recipients specific to this user
            const saved = localStorage.getItem(`hexad_recipients_${user.id}`);
            if (saved) setSavedRecipients(JSON.parse(saved));
        }
    }, []);

    const selectSavedRecipient = (id: string) => {
        const r = savedRecipients.find(r => r.id === id);
        if (r) {
            setFormData({
                ...formData,
                recipientName: r.name,
                recipientWhatsApp: r.whatsapp,
                recipientAddress: r.address,
                recipientSuburb: r.suburb
            });
        }
    };

    const getFrequencyMultiplier = () => {
        if (formData.frequency === 'BI_WEEKLY') return 2;
        if (formData.frequency === 'MONTHLY') return 4;
        return 1; // WEEKLY
    };

    const getFrequencyLabel = () => {
        if (formData.frequency === 'BI_WEEKLY') return '2kg';
        if (formData.frequency === 'MONTHLY') return '4kg';
        return '1kg';
    };

    const getBasePrice = () => {
        if (currency === 'zar') return pack.zar;
        if (currency === 'gbp') return pack.gbp;
        return pack.usd;
    };

    const getPrice = () => {
        return getBasePrice() * getFrequencyMultiplier();
    };

    const getPriceLabel = () => {
        const total = getPrice();
        if (currency === 'zar') return `R${total.toFixed(2)}`;
        if (currency === 'gbp') return `£${total.toFixed(2)}`;
        return `$${total.toFixed(2)}`;
    };

    const getBasePriceLabel = () => {
        if (currency === 'zar') return `R${pack.zar.toFixed(2)}`;
        if (currency === 'gbp') return `£${pack.gbp.toFixed(2)}`;
        return `$${pack.usd.toFixed(2)}`;
    };

    const getCurrencySymbol = () => {
        if (currency === 'zar') return 'R';
        if (currency === 'gbp') return '£';
        return '$';
    };

    const handleConfirm = async () => {
        // Validate form
        if (!formData.recipientName || !formData.recipientWhatsApp || !formData.recipientAddress || !formData.recipientSuburb) {
            alert('Please fill in all recipient details.');
            return;
        }

        const storedUser = localStorage.getItem('hexad_user');
        if (!storedUser) {
            alert('Please log in or register to place an order.');
            router.push('/login');
            return;
        }

        const user = JSON.parse(storedUser);
        const price = getPrice();

        // Wallet payment: check balance for the selected currency
        if (paymentMethod === 'wallet') {
            const currBal = currency === 'zar' ? (user.walletZAR || 0) : currency === 'gbp' ? (user.walletGBP || 0) : (user.walletUSD || 0);
            if (currBal < price) {
                alert(`Insufficient ${currency.toUpperCase()} wallet balance. You have ${getCurrencySymbol()}${currBal.toFixed(2)} but need ${getPriceLabel()}. Please top up your wallet first.`);
                return;
            }
        }

        setLoading(true);

        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    senderId: user.id,
                    senderName: user.name,
                    hamperId: packId,
                    amount: price,
                    currency: currency.toUpperCase(),
                    paymentMethod
                })
            });

            const data = await res.json();
            if (data.success) {
                // Wallet payment: deduct from the correct currency balance
                if (paymentMethod === 'wallet') {
                    const walletKey = currency === 'zar' ? 'walletZAR' : currency === 'gbp' ? 'walletGBP' : 'walletUSD';
                    user[walletKey] = (user[walletKey] || 0) - price;
                    localStorage.setItem('hexad_user', JSON.stringify(user));
                }

                // Save delivery to localStorage for dashboard feed
                const deliveries = JSON.parse(localStorage.getItem(`hexad_deliveries_${user.id}`) || '[]');
                deliveries.unshift({
                    id: data.subscriptionId,
                    recipientName: formData.recipientName,
                    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                    location: `${formData.recipientSuburb}, Harare`,
                    status: 'Scheduled',
                    pack: pack.title
                });
                localStorage.setItem(`hexad_deliveries_${user.id}`, JSON.stringify(deliveries));

                router.push(`/checkout/success?subId=${data.subscriptionId}`);
            } else {
                alert(data.error || 'Checkout failed. Please try again.');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred during checkout. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const currentWalletBalance = walletBalances[currency];
    const hasEnoughBalance = currentWalletBalance >= getPrice();

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

                        {savedRecipients.length > 0 && (
                            <div className={styles.formGroup}>
                                <label>Saved Recipients</label>
                                <select
                                    onChange={(e) => selectSavedRecipient(e.target.value)}
                                    defaultValue=""
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--card-border)',
                                        background: 'var(--background)',
                                        fontFamily: 'inherit',
                                        fontSize: '0.9rem',
                                        color: 'var(--text)',
                                        cursor: 'pointer',
                                        marginBottom: '0.5rem'
                                    }}
                                >
                                    <option value="" disabled>Select a saved recipient...</option>
                                    {savedRecipients.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.name} — {r.suburb}, Harare
                                        </option>
                                    ))}
                                </select>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                    Or fill in details manually below
                                </p>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label>Recipient Name (Harare)</label>
                            <input
                                type="text"
                                placeholder="e.g. Mrs. Moyo"
                                value={formData.recipientName}
                                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Recipient WhatsApp Number</label>
                            <input
                                type="text"
                                placeholder="+263 7..."
                                value={formData.recipientWhatsApp}
                                onChange={(e) => setFormData({ ...formData, recipientWhatsApp: e.target.value })}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Delivery Address</label>
                            <textarea
                                rows={3}
                                placeholder="House number, Street, Suburb (Harare)"
                                value={formData.recipientAddress}
                                onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Suburb</label>
                            <input
                                type="text"
                                placeholder="e.g. Mabelreign"
                                value={formData.recipientSuburb}
                                onChange={(e) => setFormData({ ...formData, recipientSuburb: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2>2. Delivery Frequency</h2>
                        <div className={styles.formGroup}>
                            <label>Frequency</label>
                            <select
                                value={formData.frequency}
                                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                            >
                                <option value="WEEKLY">Every Week (Recommended for power cuts)</option>
                                <option value="BI_WEEKLY">Every 2 Weeks</option>
                                <option value="MONTHLY">Every Month</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2>3. Payment Method</h2>

                        <div className={styles.paymentMethods}>
                            {/* Wallet Option */}
                            <button
                                className={`${styles.paymentOption} ${paymentMethod === 'wallet' ? styles.paymentOptionActive : ''}`}
                                onClick={() => setPaymentMethod('wallet')}
                            >
                                <div className={styles.paymentIcon}>💰</div>
                                <div className={styles.paymentInfo}>
                                    <div className={styles.paymentLabel}>Hexad Wallet</div>
                                    <div className={styles.paymentDesc}>
                                        Balance: {getCurrencySymbol()}{currentWalletBalance.toFixed(2)}
                                        {!hasEnoughBalance && (
                                            <span style={{ color: 'var(--error)', fontWeight: 600 }}> — Insufficient</span>
                                        )}
                                    </div>
                                </div>
                                <div className={`${styles.paymentRadio} ${paymentMethod === 'wallet' ? styles.paymentRadioActive : ''}`} />
                            </button>

                            {/* Stripe Option */}
                            <button
                                className={`${styles.paymentOption} ${paymentMethod === 'stripe' ? styles.paymentOptionActive : ''}`}
                                onClick={() => setPaymentMethod('stripe')}
                            >
                                <div className={styles.paymentIcon}>💳</div>
                                <div className={styles.paymentInfo}>
                                    <div className={styles.paymentLabel}>Credit / Debit Card</div>
                                    <div className={styles.paymentDesc}>Processed securely via Stripe</div>
                                </div>
                                <div className={`${styles.paymentRadio} ${paymentMethod === 'stripe' ? styles.paymentRadioActive : ''}`} />
                            </button>

                            {/* EFT Option */}
                            <button
                                className={`${styles.paymentOption} ${paymentMethod === 'eft' ? styles.paymentOptionActive : ''}`}
                                onClick={() => setPaymentMethod('eft')}
                            >
                                <div className={styles.paymentIcon}>🏦</div>
                                <div className={styles.paymentInfo}>
                                    <div className={styles.paymentLabel}>Bank Transfer (EFT)</div>
                                    <div className={styles.paymentDesc}>SA banks — upload proof of payment</div>
                                </div>
                                <div className={`${styles.paymentRadio} ${paymentMethod === 'eft' ? styles.paymentRadioActive : ''}`} />
                            </button>
                        </div>

                        {paymentMethod === 'wallet' && !hasEnoughBalance && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                background: 'rgba(193, 41, 46, 0.06)',
                                borderRadius: '10px',
                                border: '1px solid rgba(193, 41, 46, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--error)' }}>
                                        You need {getPriceLabel()} but only have {getCurrencySymbol()}{currentWalletBalance.toFixed(2)}
                                    </p>
                                    <a href="/top-up" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                                        Top up your wallet →
                                    </a>
                                </div>
                            </div>
                        )}
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
                        <span>Selected Cut</span>
                        <span>{pack.title}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span>Price per kg</span>
                        <span>{getBasePriceLabel()}/kg</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span>Quantity</span>
                        <span>{getFrequencyLabel()} ({formData.frequency === 'WEEKLY' ? 'Weekly' : formData.frequency === 'BI_WEEKLY' ? 'Bi-Weekly' : 'Monthly'})</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span>First Delivery</span>
                        <span>Upcoming Wednesday</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span>Payment</span>
                        <span>{paymentMethod === 'wallet' ? 'Wallet' : paymentMethod === 'stripe' ? 'Stripe' : 'EFT'}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span>Processing Fee</span>
                        <span>Free</span>
                    </div>

                    <div className={styles.total}>
                        <span>{formData.frequency === 'WEEKLY' ? 'Weekly' : formData.frequency === 'BI_WEEKLY' ? 'Bi-Weekly' : 'Monthly'} Total</span>
                        <span>{getPriceLabel()}</span>
                    </div>

                    <Button
                        fullWidth
                        onClick={handleConfirm}
                        style={{ marginTop: '2rem' }}
                    >
                        {loading
                            ? 'Processing...'
                            : paymentMethod === 'wallet'
                                ? `Pay ${getPriceLabel()} from Wallet`
                                : paymentMethod === 'stripe'
                                    ? `Pay ${getPriceLabel()} with Card`
                                    : 'Confirm & Upload Proof'
                        }
                    </Button>

                    {paymentMethod === 'wallet' && hasEnoughBalance && (
                        <p style={{
                            marginTop: '0.75rem',
                            fontSize: '0.75rem',
                            color: 'var(--success)',
                            textAlign: 'center',
                            fontWeight: 600
                        }}>
                            ✓ Remaining balance after payment: {getCurrencySymbol()}{(currentWalletBalance - getPrice()).toFixed(2)}
                        </p>
                    )}

                    <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-light)', textAlign: 'center', lineHeight: '1.4' }}>
                        By confirming, you agree to fund periodic deliveries. You can pause or skip weeks anytime from your dashboard.
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
