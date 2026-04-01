"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button';

interface CartItem {
    id: string;
    title: string;
    kg: number;
    pricing: { usd: number; zar: number; gbp: number };
}

type PaymentMethod = 'wallet' | 'stripe' | 'eft' | 'zb_smilenpay';

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Load cart from localStorage (set by shop page)
    const [cartItems, setCartItems] = useState<CartItem[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hexad_cart');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.length > 0) return parsed;
            }
        }
        return [];
    });

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

            const saved = localStorage.getItem(`hexad_recipients_${user.id}`);
            if (saved) setSavedRecipients(JSON.parse(saved));
        }
    }, []);

    const getCurrencySymbol = () => {
        if (currency === 'zar') return 'R';
        if (currency === 'gbp') return '£';
        return '$';
    };

    const getItemPrice = (item: CartItem) => {
        const pricePerKg = currency === 'zar' ? item.pricing.zar : currency === 'gbp' ? item.pricing.gbp : item.pricing.usd;
        return pricePerKg * item.kg;
    };

    const getCartTotal = () => {
        return cartItems.reduce((sum, item) => sum + getItemPrice(item), 0);
    };

    const getTotalKg = () => {
        return cartItems.reduce((sum, item) => sum + item.kg, 0);
    };

    const getTotalLabel = () => {
        const total = getCartTotal();
        return `${getCurrencySymbol()}${total.toFixed(2)}`;
    };

    const removeItem = (id: string) => {
        const updated = cartItems.filter(item => item.id !== id);
        setCartItems(updated);
        localStorage.setItem('hexad_cart', JSON.stringify(updated));
    };

    const updateItemKg = (id: string, kg: number) => {
        const updated = cartItems.map(item => item.id === id ? { ...item, kg } : item);
        setCartItems(updated);
        localStorage.setItem('hexad_cart', JSON.stringify(updated));
    };

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

    const handleConfirm = async () => {
        if (cartItems.length === 0) {
            alert('Your cart is empty. Please add items from the shop.');
            router.push('/shop');
            return;
        }

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
        const totalPrice = getCartTotal();

        if (paymentMethod === 'wallet') {
            const currBal = currency === 'zar' ? (user.walletZAR || 0) : currency === 'gbp' ? (user.walletGBP || 0) : (user.walletUSD || 0);
            if (currBal < totalPrice) {
                alert(`Insufficient ${currency.toUpperCase()} wallet balance. You have ${getCurrencySymbol()}${currBal.toFixed(2)} but need ${getTotalLabel()}. Please top up your wallet first.`);
                return;
            }
        }

        // ZB Smile & Pay — redirect to ZB checkout
        if (paymentMethod === 'zb_smilenpay') {
            setLoading(true);
            try {
                const zbRes = await fetch('/api/payments/zb-smilenpay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: totalPrice,
                        currency: currency.toUpperCase(),
                        userId: user.id,
                        purpose: 'ORDER',
                        description: cartItems.map(i => `${i.title} (${i.kg}kg)`).join(', '),
                        metadata: { cartItems: cartItems.map(i => ({ id: i.id, title: i.title, kg: i.kg })) },
                    }),
                });
                const zbData = await zbRes.json();
                if (zbData.success && zbData.checkoutUrl) {
                    // Store order context for after payment completes
                    localStorage.setItem('hexad_pending_zb_order', JSON.stringify({
                        ...formData,
                        senderId: user.id,
                        senderName: user.name,
                        cartItems,
                        amount: totalPrice,
                        currency: currency.toUpperCase(),
                        paymentId: zbData.paymentId,
                    }));
                    window.location.href = zbData.checkoutUrl;
                    return;
                } else {
                    alert(zbData.error || 'Failed to initiate ZB payment. Please try again.');
                }
            } catch (err) {
                console.error(err);
                alert('Could not connect to ZB payment gateway. Please try again.');
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);

        try {
            const cartDescription = cartItems.map(i => `${i.title} (${i.kg}kg)`).join(', ');
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    senderId: user.id,
                    senderName: user.name,
                    hamperId: cartItems.map(i => i.id).join('+'),
                    hamperName: cartDescription,
                    amount: totalPrice,
                    currency: currency.toUpperCase(),
                    paymentMethod
                })
            });

            const data = await res.json();
            if (data.success) {
                if (paymentMethod === 'wallet') {
                    const walletKey = currency === 'zar' ? 'walletZAR' : currency === 'gbp' ? 'walletGBP' : 'walletUSD';
                    user[walletKey] = (user[walletKey] || 0) - totalPrice;
                    localStorage.setItem('hexad_user', JSON.stringify(user));
                }

                const deliveries = JSON.parse(localStorage.getItem(`hexad_deliveries_${user.id}`) || '[]');
                deliveries.unshift({
                    id: data.subscriptionId,
                    recipientName: formData.recipientName,
                    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                    location: `${formData.recipientSuburb}, Harare`,
                    status: 'Scheduled',
                    pack: cartDescription
                });
                localStorage.setItem(`hexad_deliveries_${user.id}`, JSON.stringify(deliveries));

                localStorage.removeItem('hexad_cart');
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
    const hasEnoughBalance = currentWalletBalance >= getCartTotal();

    if (cartItems.length === 0) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <h2 style={{ marginBottom: '1rem' }}>🛒 Your cart is empty</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Add some premium cuts from the shop first.</p>
                    <Button href="/shop">Browse Premium Cuts</Button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Checkout</h1>
                <p>Complete your order — {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}, {getTotalKg()}kg total</p>
            </header>

            <div className={styles.layout}>
                <div className={styles.formSide}>
                    {/* Cart Items */}
                    <div className={styles.section}>
                        <h2>Your Cart</h2>
                        <div className={styles.cartItemsList}>
                            {cartItems.map(item => (
                                <div key={item.id} className={styles.cartRow}>
                                    <div className={styles.cartRowInfo}>
                                        <span className={styles.cartRowTitle}>{item.title}</span>
                                        <span className={styles.cartRowPrice}>
                                            {getCurrencySymbol()}{(currency === 'zar' ? item.pricing.zar : currency === 'gbp' ? item.pricing.gbp : item.pricing.usd).toFixed(2)}/kg
                                        </span>
                                    </div>
                                    <div className={styles.cartRowControls}>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={item.kg}
                                            onChange={(e) => updateItemKg(item.id, Number(e.target.value))}
                                            className={styles.miniSlider}
                                        />
                                        <span className={styles.cartRowKg}>{item.kg}kg</span>
                                        <span className={styles.cartRowTotal}>
                                            {getCurrencySymbol()}{getItemPrice(item).toFixed(2)}
                                        </span>
                                        <button className={styles.cartRemoveBtn} onClick={() => removeItem(item.id)}>✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className={styles.addMoreBtn} onClick={() => router.push('/shop')}>
                            + Add More Items
                        </button>
                    </div>

                    {/* Recipient Details */}
                    <div className={styles.section}>
                        <h2>1. Recipient Details</h2>

                        {savedRecipients.length > 0 && (
                            <div className={styles.savedRecipients}>
                                <label>Quick Select:</label>
                                <div className={styles.recipientList}>
                                    {savedRecipients.map(r => (
                                        <button
                                            key={r.id}
                                            className={styles.recipientChip}
                                            onClick={() => selectSavedRecipient(r.id)}
                                        >
                                            {r.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label>Recipient Name</label>
                            <input
                                value={formData.recipientName}
                                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                                placeholder="e.g. Gogo Mukoko"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>WhatsApp Number</label>
                            <input
                                value={formData.recipientWhatsApp}
                                onChange={(e) => setFormData({ ...formData, recipientWhatsApp: e.target.value })}
                                placeholder="+263 7XX XXX XXX"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Delivery Address</label>
                            <input
                                value={formData.recipientAddress}
                                onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                                placeholder="123 Main Street"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Suburb</label>
                            <select
                                value={formData.recipientSuburb}
                                onChange={(e) => setFormData({ ...formData, recipientSuburb: e.target.value })}
                            >
                                <option value="">Select suburb...</option>
                                <option value="Avondale">Avondale</option>
                                <option value="Borrowdale">Borrowdale</option>
                                <option value="Glen Lorne">Glen Lorne</option>
                                <option value="Greendale">Greendale</option>
                                <option value="Highlands">Highlands</option>
                                <option value="Mabelreign">Mabelreign</option>
                                <option value="Mbare">Mbare</option>
                                <option value="Mount Pleasant">Mount Pleasant</option>
                                <option value="Waterfalls">Waterfalls</option>
                                <option value="Westgate">Westgate</option>
                            </select>
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
                                <option value="WEEKLY">Every Week</option>
                                <option value="BI_WEEKLY">Every 2 Weeks</option>
                                <option value="MONTHLY">Every Month</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2>3. Payment Method</h2>

                        <div className={styles.paymentMethods}>
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

                            <button
                                className={`${styles.paymentOption} ${paymentMethod === 'zb_smilenpay' ? styles.paymentOptionActive : ''}`}
                                onClick={() => setPaymentMethod('zb_smilenpay')}
                            >
                                <div className={styles.paymentIcon}>🇿🇼</div>
                                <div className={styles.paymentInfo}>
                                    <div className={styles.paymentLabel}>ZB Smile &amp; Pay</div>
                                    <div className={styles.paymentDesc}>Ecocash, InnBucks, Visa/MC, Zimswitch</div>
                                </div>
                                <div className={`${styles.paymentRadio} ${paymentMethod === 'zb_smilenpay' ? styles.paymentRadioActive : ''}`} />
                            </button>

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
                                        You need {getTotalLabel()} but only have {getCurrencySymbol()}{currentWalletBalance.toFixed(2)}
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

                    {cartItems.map(item => (
                        <div key={item.id} className={styles.summaryItem}>
                            <span>{item.title} ({item.kg}kg)</span>
                            <span>{getCurrencySymbol()}{getItemPrice(item).toFixed(2)}</span>
                        </div>
                    ))}

                    <div className={styles.summaryItem}>
                        <span>Delivery</span>
                        <span>{formData.frequency === 'WEEKLY' ? 'Weekly' : formData.frequency === 'BI_WEEKLY' ? 'Bi-Weekly' : 'Monthly'}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span>First Delivery</span>
                        <span>Upcoming Wednesday</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span>Payment</span>
                        <span>{paymentMethod === 'wallet' ? 'Wallet' : paymentMethod === 'zb_smilenpay' ? 'ZB Smile & Pay' : paymentMethod === 'stripe' ? 'Stripe' : 'EFT'}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span>Processing Fee</span>
                        <span>Free</span>
                    </div>

                    <div className={styles.total}>
                        <span>Total ({getTotalKg()}kg)</span>
                        <span>{getTotalLabel()}</span>
                    </div>

                    <Button
                        fullWidth
                        onClick={handleConfirm}
                        style={{ marginTop: '2rem' }}
                    >
                        {loading
                            ? 'Processing...'
                            : paymentMethod === 'wallet'
                                ? `Pay ${getTotalLabel()} from Wallet`
                                : paymentMethod === 'zb_smilenpay'
                                    ? `Pay ${getTotalLabel()} via ZB Smile & Pay`
                                    : paymentMethod === 'stripe'
                                        ? `Pay ${getTotalLabel()} with Card`
                                        : 'Confirm & Upload Proof'
                        }
                    </Button>

                    {paymentMethod === 'wallet' && hasEnoughBalance && (
                        <p style={{
                            marginTop: '0.75rem',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            textAlign: 'center'
                        }}>
                            Remaining balance: {getCurrencySymbol()}{(currentWalletBalance - getCartTotal()).toFixed(2)}
                        </p>
                    )}
                </aside>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 2rem' }}>
                <p>Loading checkout...</p>
            </div>
        }>
            <CheckoutContent />
        </Suspense>
    );
}
