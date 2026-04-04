"use client";

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button';

interface CartItem {
    id: string;
    title: string;
    kg: number;
    pricing: { usd: number; zar: number; gbp: number };
}

interface ContactInfo {
    id: string;
    name: string;
    whatsapp: string;
    address: string;
    suburb: string;
    nickname?: string;
}

type Step = 1 | 2 | 3;

const SUBURBS = [
    'Avondale', 'Borrowdale', 'Budiriro', 'Chitungwiza', 'Glen Lorne', 'Greendale',
    'Harare CBD', 'Highlands', 'Kuwadzana', 'Mabelreign', 'Mbare', 'Mount Pleasant',
    'Msasa', 'Newlands', 'Tynwald', 'Waterfalls', 'Westgate', 'Zimre Park'
];

function CheckoutContent() {
    const router = useRouter();

    const [step, setStep] = useState<Step>(1);
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

    // Saved contacts
    const [savedContacts, setSavedContacts] = useState<ContactInfo[]>(() => {
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('hexad_user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                const saved = localStorage.getItem(`hexad_recipients_${user.id}`);
                if (saved) return JSON.parse(saved);
            }
        }
        return [];
    });

    const [formData, setFormData] = useState({
        recipientName: '',
        recipientWhatsApp: '',
        recipientAddress: '',
        recipientSuburb: '',
        frequency: 'WEEKLY'
    });

    const [saveContact, setSaveContact] = useState(false);
    const [contactNickname, setContactNickname] = useState('');
    const [selectedContactId, setSelectedContactId] = useState('');
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // ── Price helpers ──────────────────────────────────────
    const sym = currency === 'zar' ? 'R' : currency === 'gbp' ? '£' : '$';
    const getItemPrice = (item: CartItem) => {
        const rate = currency === 'zar' ? item.pricing.zar : currency === 'gbp' ? item.pricing.gbp : item.pricing.usd;
        return rate * item.kg;
    };
    const cartTotal = cartItems.reduce((sum, item) => sum + getItemPrice(item), 0);
    const totalKg = cartItems.reduce((sum, item) => sum + item.kg, 0);

    // ── Cart editing (from checkout) ──────────────────────
    const updateItemKg = (id: string, kg: number) => {
        if (kg <= 0) {
            const updated = cartItems.filter(item => item.id !== id);
            setCartItems(updated);
            localStorage.setItem('hexad_cart', JSON.stringify(updated));
            return;
        }
        const updated = cartItems.map(item => item.id === id ? { ...item, kg } : item);
        setCartItems(updated);
        localStorage.setItem('hexad_cart', JSON.stringify(updated));
    };

    // ── Contacts ──────────────────────────────────────────
    const selectContact = (contact: ContactInfo) => {
        setSelectedContactId(contact.id);
        setFormData({
            ...formData,
            recipientName: contact.name,
            recipientWhatsApp: contact.whatsapp,
            recipientAddress: contact.address,
            recipientSuburb: contact.suburb,
        });
    };

    const persistContactIfNeeded = (userId: string) => {
        if (!saveContact) return;
        const newContact: ContactInfo = {
            id: `c-${Date.now()}`,
            name: formData.recipientName,
            whatsapp: formData.recipientWhatsApp,
            address: formData.recipientAddress,
            suburb: formData.recipientSuburb,
            nickname: contactNickname || formData.recipientName,
        };
        const updated = [...savedContacts, newContact];
        setSavedContacts(updated);
        localStorage.setItem(`hexad_recipients_${userId}`, JSON.stringify(updated));
    };

    // ── Validation ────────────────────────────────────────
    const validateStep1 = () => {
        const errors: Record<string, string> = {};
        if (!formData.recipientName.trim()) errors.name = 'Recipient name is required';
        if (!formData.recipientWhatsApp.trim()) errors.whatsapp = 'WhatsApp number is required';
        if (!formData.recipientAddress.trim()) errors.address = 'Delivery address is required';
        if (!formData.recipientSuburb) errors.suburb = 'Please select a suburb';
        if (cartItems.length === 0) errors.cart = 'Your cart is empty';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const advanceToReview = () => {
        const storedUser = localStorage.getItem('hexad_user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        if (validateStep1()) {
            const user = JSON.parse(storedUser);
            persistContactIfNeeded(user.id);
            setStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // ── ZB Payment ────────────────────────────────────────
    const handlePayment = async () => {
        const storedUser = localStorage.getItem('hexad_user');
        if (!storedUser) { router.push('/login'); return; }
        const user = JSON.parse(storedUser);

        setLoading(true);
        setStep(3);
        try {
            const zbRes = await fetch('/api/payments/zb-smilenpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: cartTotal,
                    currency: currency.toUpperCase(),
                    userId: user.id,
                    purpose: 'ORDER',
                    description: cartItems.map(i => `${i.title} (${i.kg}kg)`).join(', ').slice(0, 240),
                    firstName: (user.name || 'MeatLink').split(' ')[0],
                    lastName: (user.name || 'Customer').split(' ').slice(1).join(' ') || 'Customer',
                    email: user.email || 'support@meatlink.co.zw',
                    mobilePhoneNumber: formData.recipientWhatsApp.replace(/\D/g, '').slice(-10) || '0770000000',
                    metadata: { cartItems: cartItems.map(i => ({ id: i.id, title: i.title, kg: i.kg })) },
                }),
            });
            const zbData = await zbRes.json();
            if (zbData.success && zbData.checkoutUrl) {
                localStorage.setItem('hexad_pending_zb_order', JSON.stringify({
                    ...formData,
                    senderId: user.id,
                    senderName: user.name,
                    cartItems,
                    amount: cartTotal,
                    currency: currency.toUpperCase(),
                    paymentId: zbData.paymentId,
                }));
                window.location.href = zbData.checkoutUrl;
            } else {
                alert(zbData.error || 'Payment initiation failed. Please try again.');
                setStep(2);
            }
        } catch (err) {
            console.error(err);
            alert('Could not connect to ZB Smile & Pay. Please try again.');
            setStep(2);
        } finally {
            setLoading(false);
        }
    };

    // ── Empty cart ────────────────────────────────────────
    if (cartItems.length === 0 && step !== 3) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyCart}>
                    <div className={styles.emptyIcon}>🛒</div>
                    <h2>Your cart is empty</h2>
                    <p>Add some premium cuts from the shop first.</p>
                    <Button href="/shop">Browse Premium Cuts</Button>
                </div>
            </div>
        );
    }

    const nextDeliveryDay = () => {
        const d = new Date();
        const daysUntilWed = (3 - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + daysUntilWed);
        return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    return (
        <div className={styles.container}>
            {/* ── Stepper ────────────────────────── */}
            <div className={styles.stepper}>
                {(['Delivery Details', 'Review Order', 'Payment'] as const).map((label, i) => {
                    const s = (i + 1) as Step;
                    const done = step > s;
                    const active = step === s;
                    return (
                        <React.Fragment key={label}>
                            <div className={`${styles.stepItem} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`}>
                                <div className={styles.stepCircle}>
                                    {done ? '✓' : s}
                                </div>
                                <span className={styles.stepLabel}>{label}</span>
                            </div>
                            {i < 2 && <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} />}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* ─────────────────────────────────────
                STEP 1: DELIVERY DETAILS
            ───────────────────────────────────── */}
            {step === 1 && (
                <div className={styles.stepContent}>
                    <div className={styles.formSide}>

                        {/* Cart Summary (editable) */}
                        <div className={styles.section}>
                            <h2>🛒 Your Cart</h2>
                            {cartItems.map(item => (
                                <div key={item.id} className={styles.cartRow}>
                                    <div className={styles.cartRowInfo}>
                                        <span className={styles.cartRowName}>{item.title}</span>
                                        <span className={styles.cartRowSubtotal}>{sym}{getItemPrice(item).toFixed(2)}</span>
                                    </div>
                                    <div className={styles.cartRowControls}>
                                        <button className={styles.qtyBtn} onClick={() => updateItemKg(item.id, item.kg - 1)}>−</button>
                                        <span className={styles.qtyVal}>{item.kg}kg</span>
                                        <button className={styles.qtyBtn} onClick={() => updateItemKg(item.id, item.kg + 1)}>+</button>
                                        <span className={styles.cartRowRate}>@ {sym}{(currency === 'zar' ? item.pricing.zar : currency === 'gbp' ? item.pricing.gbp : item.pricing.usd).toFixed(2)}/kg</span>
                                        <button className={styles.cartRemoveBtn} onClick={() => updateItemKg(item.id, 0)}>🗑</button>
                                    </div>
                                </div>
                            ))}
                            {formErrors.cart && <p className={styles.fieldError}>{formErrors.cart}</p>}
                            <button className={styles.addMoreBtn} onClick={() => router.push('/shop')}>
                                + Add More Items
                            </button>
                        </div>

                        {/* Recipient Details */}
                        <div className={styles.section}>
                            <h2>📦 Delivery Details</h2>

                            {/* Saved Contacts */}
                            {savedContacts.length > 0 && (
                                <div className={styles.savedContactsSection}>
                                    <p className={styles.savedContactsLabel}>Saved contacts</p>
                                    <div className={styles.contactCards}>
                                        {savedContacts.map(c => (
                                            <button
                                                key={c.id}
                                                className={`${styles.contactCard} ${selectedContactId === c.id ? styles.contactCardActive : ''}`}
                                                onClick={() => selectContact(c)}
                                            >
                                                <div className={styles.contactAvatar}>
                                                    {(c.nickname || c.name).slice(0, 1).toUpperCase()}
                                                </div>
                                                <div className={styles.contactCardInfo}>
                                                    <span className={styles.contactCardName}>{c.nickname || c.name}</span>
                                                    <span className={styles.contactCardSub}>{c.suburb}</span>
                                                </div>
                                                {selectedContactId === c.id && (
                                                    <span className={styles.contactTick}>✓</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Recipient Name *</label>
                                    <input
                                        value={formData.recipientName}
                                        onChange={e => { setFormData({ ...formData, recipientName: e.target.value }); setSelectedContactId(''); }}
                                        placeholder="e.g. Gogo Mukoko"
                                    />
                                    {formErrors.name && <p className={styles.fieldError}>{formErrors.name}</p>}
                                </div>
                                <div className={styles.formGroup}>
                                    <label>WhatsApp Number *</label>
                                    <input
                                        value={formData.recipientWhatsApp}
                                        onChange={e => { setFormData({ ...formData, recipientWhatsApp: e.target.value }); setSelectedContactId(''); }}
                                        placeholder="+263 7XX XXX XXX"
                                        type="tel"
                                    />
                                    {formErrors.whatsapp && <p className={styles.fieldError}>{formErrors.whatsapp}</p>}
                                </div>
                                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                                    <label>Delivery Address *</label>
                                    <input
                                        value={formData.recipientAddress}
                                        onChange={e => { setFormData({ ...formData, recipientAddress: e.target.value }); setSelectedContactId(''); }}
                                        placeholder="123 Main Street"
                                    />
                                    {formErrors.address && <p className={styles.fieldError}>{formErrors.address}</p>}
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Suburb *</label>
                                    <select
                                        value={formData.recipientSuburb}
                                        onChange={e => { setFormData({ ...formData, recipientSuburb: e.target.value }); setSelectedContactId(''); }}
                                    >
                                        <option value="">Select suburb...</option>
                                        {SUBURBS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    {formErrors.suburb && <p className={styles.fieldError}>{formErrors.suburb}</p>}
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Delivery Frequency</label>
                                    <select
                                        value={formData.frequency}
                                        onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                                    >
                                        <option value="WEEKLY">Every Week</option>
                                        <option value="BI_WEEKLY">Every 2 Weeks</option>
                                        <option value="MONTHLY">Every Month</option>
                                    </select>
                                </div>
                            </div>

                            {/* Save Contact */}
                            <label className={styles.saveContactRow}>
                                <input
                                    type="checkbox"
                                    checked={saveContact}
                                    onChange={e => setSaveContact(e.target.checked)}
                                    className={styles.saveContactCheck}
                                />
                                <span>Save this contact for future orders</span>
                            </label>
                            {saveContact && (
                                <div className={styles.formGroup} style={{ marginTop: '0.75rem' }}>
                                    <label>Nickname (optional)</label>
                                    <input
                                        value={contactNickname}
                                        onChange={e => setContactNickname(e.target.value)}
                                        placeholder="e.g. Mum, Home, Harare"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Sidebar summary ── */}
                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarCard}>
                            <h3>Order Summary</h3>
                            <div className={styles.currencyRow}>
                                {(['usd', 'zar', 'gbp'] as const).map(c => (
                                    <button
                                        key={c}
                                        className={`${styles.currBtn} ${currency === c ? styles.currBtnActive : ''}`}
                                        onClick={() => setCurrency(c)}
                                    >{c.toUpperCase()}</button>
                                ))}
                            </div>
                            {cartItems.map(item => (
                                <div key={item.id} className={styles.sidebarItem}>
                                    <span>{item.title} ({item.kg}kg)</span>
                                    <span>{sym}{getItemPrice(item).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className={styles.sidebarItem}>
                                <span>Delivery</span>
                                <span style={{ color: 'var(--success, #22c55e)' }}>Free</span>
                            </div>
                            <div className={styles.sidebarTotal}>
                                <span>Total ({totalKg}kg)</span>
                                <span>{sym}{cartTotal.toFixed(2)}</span>
                            </div>
                            <Button fullWidth onClick={advanceToReview} style={{ marginTop: '1.5rem' }}>
                                Review Order →
                            </Button>
                        </div>
                    </aside>
                </div>
            )}

            {/* ─────────────────────────────────────
                STEP 2: REVIEW ORDER
            ───────────────────────────────────── */}
            {step === 2 && (
                <div className={styles.stepContent}>
                    <div className={styles.formSide}>
                        {/* Delivery Address Card */}
                        <div className={styles.section}>
                            <div className={styles.reviewSectionHeader}>
                                <h2>📦 Delivering to</h2>
                                <button className={styles.editLink} onClick={() => setStep(1)}>Edit</button>
                            </div>
                            <div className={styles.reviewCard}>
                                <div className={styles.reviewField}>
                                    <span className={styles.reviewLabel}>Recipient</span>
                                    <span className={styles.reviewValue}>{formData.recipientName}</span>
                                </div>
                                <div className={styles.reviewField}>
                                    <span className={styles.reviewLabel}>WhatsApp</span>
                                    <span className={styles.reviewValue}>{formData.recipientWhatsApp}</span>
                                </div>
                                <div className={styles.reviewField}>
                                    <span className={styles.reviewLabel}>Address</span>
                                    <span className={styles.reviewValue}>{formData.recipientAddress}, {formData.recipientSuburb}, Harare</span>
                                </div>
                                <div className={styles.reviewField}>
                                    <span className={styles.reviewLabel}>Frequency</span>
                                    <span className={styles.reviewValue}>
                                        {formData.frequency === 'WEEKLY' ? 'Every Week' : formData.frequency === 'BI_WEEKLY' ? 'Every 2 Weeks' : 'Every Month'}
                                    </span>
                                </div>
                                <div className={styles.reviewField}>
                                    <span className={styles.reviewLabel}>First Delivery</span>
                                    <span className={styles.reviewValue} style={{ color: 'var(--primary)' }}>{nextDeliveryDay()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Cart Review */}
                        <div className={styles.section}>
                            <div className={styles.reviewSectionHeader}>
                                <h2>🛒 Order Items</h2>
                                <button className={styles.editLink} onClick={() => setStep(1)}>Edit</button>
                            </div>
                            {cartItems.map(item => (
                                <div key={item.id} className={styles.reviewCartItem}>
                                    <div>
                                        <div className={styles.reviewItemName}>{item.title}</div>
                                        <div className={styles.reviewItemMeta}>{item.kg}kg @ {sym}{(currency === 'zar' ? item.pricing.zar : currency === 'gbp' ? item.pricing.gbp : item.pricing.usd).toFixed(2)}/kg</div>
                                    </div>
                                    <div className={styles.reviewItemTotal}>{sym}{getItemPrice(item).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>

                        {/* Payment Method */}
                        <div className={styles.section}>
                            <h2>💳 Payment</h2>
                            <div className={styles.paymentBadge}>
                                <span>🇿🇼</span>
                                <div>
                                    <div className={styles.paymentBadgeName}>ZB Smile &amp; Pay</div>
                                    <div className={styles.paymentBadgeDesc}>Ecocash · InnBucks · Visa/MC · Zimswitch</div>
                                </div>
                                <span className={styles.paymentBadgeTick}>✓</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Sidebar summary ── */}
                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarCard}>
                            <h3>Order Total</h3>
                            <div className={styles.currencyRow}>
                                {(['usd', 'zar', 'gbp'] as const).map(c => (
                                    <button
                                        key={c}
                                        className={`${styles.currBtn} ${currency === c ? styles.currBtnActive : ''}`}
                                        onClick={() => setCurrency(c)}
                                    >{c.toUpperCase()}</button>
                                ))}
                            </div>
                            {cartItems.map(item => (
                                <div key={item.id} className={styles.sidebarItem}>
                                    <span>{item.title} ({item.kg}kg)</span>
                                    <span>{sym}{getItemPrice(item).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className={styles.sidebarItem}>
                                <span>Delivery</span>
                                <span style={{ color: 'var(--success, #22c55e)' }}>Free</span>
                            </div>
                            <div className={styles.sidebarItem}>
                                <span>Processing Fee</span>
                                <span style={{ color: 'var(--success, #22c55e)' }}>Free</span>
                            </div>
                            <div className={styles.sidebarTotal}>
                                <span>Total ({totalKg}kg)</span>
                                <span>{sym}{cartTotal.toFixed(2)}</span>
                            </div>
                            <Button fullWidth onClick={handlePayment} style={{ marginTop: '1.5rem' }}>
                                Confirm &amp; Pay {sym}{cartTotal.toFixed(2)} →
                            </Button>
                            <button className={styles.backBtn} onClick={() => setStep(1)}>
                                ← Back to Delivery Details
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* ─────────────────────────────────────
                STEP 3: PROCESSING / REDIRECT
            ───────────────────────────────────── */}
            {step === 3 && (
                <div className={styles.processingScreen}>
                    <div className={styles.processingSpinner} />
                    <h2>Connecting to ZB Smile &amp; Pay...</h2>
                    <p>Please wait. You'll be redirected to complete your payment shortly.</p>
                    <div className={styles.processingBadge}>🇿🇼 Secure ZB Bank Payment Gateway</div>
                </div>
            )}
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
