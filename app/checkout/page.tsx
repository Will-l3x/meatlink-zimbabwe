"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { readStoredJson, writeStoredJson } from '@/lib/storage';
import { SUBURBS, PLAN_WEEKS } from '@/lib/delivery';

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

/** Delivery details typed at checkout, kept until the order is paid. */
const CHECKOUT_DRAFT_KEY = 'hexad_checkout_draft';
/** Chosen plan (one delivery vs weekly, paid monthly), remembered between visits. */
const CHECKOUT_PLAN_KEY = 'hexad_checkout_plan';

type PlanChoice = 'once' | 'weekly';
interface PlanPrefs { plan: PlanChoice; autoRenew: boolean; payerWhatsApp: string }

function phoneDigits(value: string): number {
    return value.replace(/\D/g, '').length;
}


function CheckoutContent() {
    const router = useRouter();

    const [step, setStep] = useState<Step>(1);
    // Cart and contacts live in localStorage, which only exists in the browser.
    // Start empty so server and client render the same HTML, then hydrate.
    const [hydrated, setHydrated] = useState(false);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    const [currency, setCurrency] = useState<'usd' | 'zar' | 'gbp'>('usd');
    const [loading, setLoading] = useState(false);

    // Saved contacts
    const [savedContacts, setSavedContacts] = useState<ContactInfo[]>([]);

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [payError, setPayError] = useState('');
    const [planPrefs, setPlanPrefs] = useState<PlanPrefs>({ plan: 'once', autoRenew: true, payerWhatsApp: '' });
    const isPlan = planPrefs.plan === 'weekly';

    const [formData, setFormData] = useState({
        recipientName: '',
        recipientWhatsApp: '',
        recipientAddress: '',
        recipientSuburb: '',
    });

    useEffect(() => {
        const storedUser = readStoredJson<{ id?: string } | null>('hexad_user', null);
        setCartItems(readStoredJson<CartItem[]>('hexad_cart', []));
        setIsLoggedIn(!!storedUser?.id);
        if (storedUser?.id) {
            setSavedContacts(readStoredJson<ContactInfo[]>(`hexad_recipients_${storedUser.id}`, []));
        }
        // Restore what was typed before a detour to log in / sign up.
        const draft = readStoredJson<Partial<typeof formData> | null>(CHECKOUT_DRAFT_KEY, null);
        if (draft) setFormData((prev) => ({ ...prev, ...draft }));
        const savedPlan = readStoredJson<Partial<PlanPrefs> | null>(CHECKOUT_PLAN_KEY, null);
        if (savedPlan) setPlanPrefs((prev) => ({ ...prev, ...savedPlan }));
        setHydrated(true);
    }, []);

    // Keep the delivery details as they are typed so nothing is lost.
    useEffect(() => {
        if (hydrated) writeStoredJson(CHECKOUT_DRAFT_KEY, formData);
    }, [hydrated, formData]);

    useEffect(() => {
        if (hydrated) writeStoredJson(CHECKOUT_PLAN_KEY, planPrefs);
    }, [hydrated, planPrefs]);

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
    /** What is charged now: one delivery, or PLAN_WEEKS deliveries upfront. */
    const dueToday = isPlan ? cartTotal * PLAN_WEEKS : cartTotal;

    // ── Cart editing (from checkout) ──────────────────────
    const updateItemKg = (id: string, kg: number) => {
        if (kg <= 0) {
            const updated = cartItems.filter(item => item.id !== id);
            setCartItems(updated);
            writeStoredJson('hexad_cart', updated);
            return;
        }
        const updated = cartItems.map(item => item.id === id ? { ...item, kg } : item);
        setCartItems(updated);
        writeStoredJson('hexad_cart', updated);
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
        const normalise = (v: string) => v.replace(/\s+/g, '').toLowerCase();
        const alreadySaved = savedContacts.some(c =>
            normalise(c.whatsapp) === normalise(formData.recipientWhatsApp) &&
            normalise(c.address) === normalise(formData.recipientAddress)
        );
        if (alreadySaved) return;
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
        writeStoredJson(`hexad_recipients_${userId}`, updated);
    };

    // ── Validation ────────────────────────────────────────
    const validateStep1 = () => {
        const errors: Record<string, string> = {};
        if (!formData.recipientName.trim()) errors.name = 'Recipient name is required';
        if (!formData.recipientWhatsApp.trim()) errors.whatsapp = 'WhatsApp number is required';
        else if (phoneDigits(formData.recipientWhatsApp) < 9 || phoneDigits(formData.recipientWhatsApp) > 15) {
            errors.whatsapp = 'Enter a full number, e.g. 0771 234 567 or +263 771 234 567';
        }
        if (!formData.recipientAddress.trim()) errors.address = 'Delivery address is required';
        if (!formData.recipientSuburb) errors.suburb = 'Please select a suburb';
        if (cartItems.length === 0) errors.cart = 'Your cart is empty';
        const payerDigits = phoneDigits(planPrefs.payerWhatsApp);
        if (isPlan && planPrefs.autoRenew && planPrefs.payerWhatsApp.trim() && (payerDigits < 9 || payerDigits > 15)) {
            errors.payerWhatsApp = 'Enter a full number with country code, e.g. +44 7700 900123';
        }
        setFormErrors(errors);
        // On phones the button sits below the form, so bring the first problem into view.
        const firstField = (['payerWhatsApp', 'name', 'whatsapp', 'address', 'suburb'] as const).find((k) => errors[k]);
        if (firstField) {
            const id = { payerWhatsApp: 'payerWhatsApp', name: 'recipientName', whatsapp: 'recipientWhatsApp', address: 'recipientAddress', suburb: 'recipientSuburb' }[firstField];
            const el = document.getElementById(id);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el?.focus({ preventScroll: true });
        }
        return Object.keys(errors).length === 0;
    };

    const advanceToReview = () => {
        if (!validateStep1()) return;
        const storedUser = window.localStorage.getItem('hexad_user');
        if (!storedUser) {
            // Details are already saved as a draft; come straight back after signing up.
            router.push('/register?next=/checkout');
            return;
        }
        const user = JSON.parse(storedUser);
        persistContactIfNeeded(user.id);
        setPayError('');
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── ZB Payment ────────────────────────────────────────
    const handlePayment = async () => {
        const storedUser = window.localStorage.getItem('hexad_user');
        if (!storedUser) { router.push('/login?next=/checkout'); return; }
        const user = JSON.parse(storedUser);

        setPayError('');
        setLoading(true);
        setStep(3);
        try {
            const zbRes = await fetch('/api/payments/zb-smilenpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: dueToday,
                    currency: currency.toUpperCase(),
                    userId: user.id,
                    purpose: 'ORDER',
                    description: `${isPlan ? `Weekly plan, ${PLAN_WEEKS} deliveries: ` : ''}${cartItems.map(i => `${i.title} (${i.kg}kg)`).join(', ')}`.slice(0, 240),
                    firstName: (user.name || 'Hexad').split(' ')[0],
                    lastName: (user.name || 'Customer').split(' ').slice(1).join(' ') || 'Customer',
                    email: user.email || 'support@hexadmarket.com',
                    mobilePhoneNumber: formData.recipientWhatsApp.replace(/\D/g, '').slice(-10) || '0770000000',
                    metadata: {
                        cartItems: cartItems.map(i => ({ id: i.id, title: i.title, kg: i.kg })),
                        ...(isPlan ? {
                            plan: 'MONTHLY',
                            autoRenew: planPrefs.autoRenew,
                            payerWhatsApp: planPrefs.autoRenew ? planPrefs.payerWhatsApp.trim() : '',
                        } : {}),
                        recipientName: formData.recipientName,
                        recipientWhatsApp: formData.recipientWhatsApp,
                        recipientAddress: formData.recipientAddress,
                        recipientSuburb: formData.recipientSuburb,
                        senderName: user.name,
                        source: 'website_checkout',
                    },
                }),
            });
            if (zbRes.status === 401) {
                window.localStorage.removeItem('hexad_user');
                router.push('/login?next=/checkout');
                return;
            }
            const zbData = await zbRes.json();
            if (zbData.success && zbData.checkoutUrl) {
                writeStoredJson('hexad_pending_zb_order', {
                    ...formData,
                    senderId: user.id,
                    senderName: user.name,
                    cartItems,
                    amount: dueToday,
                    currency: currency.toUpperCase(),
                    plan: planPrefs.plan,
                    paymentId: zbData.paymentId,
                });
                window.location.href = zbData.checkoutUrl;
            } else {
                setPayError(zbData.error || 'We couldn\'t start the payment. Please try again.');
                setStep(2);
            }
        } catch (err) {
            console.error(err);
            setPayError('We couldn\'t reach the payment service. Check your connection and try again.');
            setStep(2);
        } finally {
            setLoading(false);
        }
    };

    if (!hydrated) {
        return (
            <div className={styles.container} style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
                Loading your cart…
            </div>
        );
    }

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
                        {!isLoggedIn && (
                            <div className={styles.guestNotice}>
                                <p>
                                    <strong>New here?</strong> Fill in the delivery details below. You&apos;ll create a free
                                    account before paying, and everything you type is saved.
                                </p>
                                <p className={styles.guestNoticeLogin}>
                                    Already have an account? <Link href="/login?next=/checkout">Log in</Link>
                                </p>
                            </div>
                        )}

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

                        {/* How often */}
                        <div className={styles.section}>
                            <h2>📅 How often?</h2>
                            <div className={styles.planOptions} role="radiogroup" aria-label="How often">
                                <label className={`${styles.planOption} ${!isPlan ? styles.planOptionActive : ''}`}>
                                    <input
                                        type="radio"
                                        name="plan"
                                        checked={!isPlan}
                                        onChange={() => setPlanPrefs({ ...planPrefs, plan: 'once' })}
                                    />
                                    <span className={styles.planOptionBody}>
                                        <span className={styles.planOptionTitle}>Just this once</span>
                                        <span className={styles.planOptionDesc}>One delivery on {nextDeliveryDay()}.</span>
                                    </span>
                                    <span className={styles.planOptionPrice}>{sym}{cartTotal.toFixed(2)}</span>
                                </label>
                                <label className={`${styles.planOption} ${isPlan ? styles.planOptionActive : ''}`}>
                                    <input
                                        type="radio"
                                        name="plan"
                                        checked={isPlan}
                                        onChange={() => setPlanPrefs({ ...planPrefs, plan: 'weekly' })}
                                    />
                                    <span className={styles.planOptionBody}>
                                        <span className={styles.planOptionTitle}>Every week, paid monthly</span>
                                        <span className={styles.planOptionDesc}>
                                            Pay once for {PLAN_WEEKS} weekly deliveries. The same order arrives every Wednesday.
                                        </span>
                                    </span>
                                    <span className={styles.planOptionPrice}>
                                        {sym}{(cartTotal * PLAN_WEEKS).toFixed(2)}
                                        <small>{sym}{cartTotal.toFixed(2)} × {PLAN_WEEKS}</small>
                                    </span>
                                </label>
                            </div>

                            {isPlan && (
                                <div className={styles.planRenew}>
                                    <label className={styles.saveContactRow}>
                                        <input
                                            type="checkbox"
                                            checked={planPrefs.autoRenew}
                                            onChange={e => setPlanPrefs({ ...planPrefs, autoRenew: e.target.checked })}
                                            className={styles.saveContactCheck}
                                        />
                                        <span>Send me a payment link for the next month when these {PLAN_WEEKS} deliveries run out</span>
                                    </label>
                                    {planPrefs.autoRenew && (
                                        <div className={styles.formGroup} style={{ marginTop: '0.75rem' }}>
                                            <label htmlFor="payerWhatsApp">Your WhatsApp number, for the payment link (optional)</label>
                                            <input
                                                id="payerWhatsApp"
                                                type="tel"
                                                inputMode="tel"
                                                autoComplete="tel"
                                                aria-invalid={!!formErrors.payerWhatsApp}
                                                value={planPrefs.payerWhatsApp}
                                                onChange={e => setPlanPrefs({ ...planPrefs, payerWhatsApp: e.target.value })}
                                                placeholder="e.g. +44 7700 900123"
                                            />
                                            {formErrors.payerWhatsApp
                                                ? <p className={styles.fieldError}>{formErrors.payerWhatsApp}</p>
                                                : <p className={styles.fieldHint}>Nothing is charged automatically. You can also renew or switch this off any time under My orders.</p>}
                                        </div>
                                    )}
                                </div>
                            )}
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
                                    <label htmlFor="recipientName">Who is receiving it? *</label>
                                    <input
                                        id="recipientName"
                                        autoComplete="off"
                                        aria-invalid={!!formErrors.name}
                                        value={formData.recipientName}
                                        onChange={e => { setFormData({ ...formData, recipientName: e.target.value }); setSelectedContactId(''); }}
                                        placeholder="e.g. Gogo Mukoko"
                                    />
                                    {formErrors.name && <p className={styles.fieldError}>{formErrors.name}</p>}
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="recipientWhatsApp">Their WhatsApp number *</label>
                                    <input
                                        id="recipientWhatsApp"
                                        inputMode="tel"
                                        autoComplete="off"
                                        aria-invalid={!!formErrors.whatsapp}
                                        value={formData.recipientWhatsApp}
                                        onChange={e => { setFormData({ ...formData, recipientWhatsApp: e.target.value }); setSelectedContactId(''); }}
                                        placeholder="e.g. 0771 234 567"
                                        type="tel"
                                    />
                                    {formErrors.whatsapp
                                        ? <p className={styles.fieldError}>{formErrors.whatsapp}</p>
                                        : <p className={styles.fieldHint}>We&apos;ll message them when it&apos;s on the way.</p>}
                                </div>
                                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                                    <label htmlFor="recipientAddress">Street address in Harare *</label>
                                    <input
                                        id="recipientAddress"
                                        autoComplete="off"
                                        aria-invalid={!!formErrors.address}
                                        value={formData.recipientAddress}
                                        onChange={e => { setFormData({ ...formData, recipientAddress: e.target.value }); setSelectedContactId(''); }}
                                        placeholder="e.g. 12 Main Street"
                                    />
                                    {formErrors.address && <p className={styles.fieldError}>{formErrors.address}</p>}
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="recipientSuburb">Suburb *</label>
                                    <select
                                        id="recipientSuburb"
                                        aria-invalid={!!formErrors.suburb}
                                        value={formData.recipientSuburb}
                                        onChange={e => { setFormData({ ...formData, recipientSuburb: e.target.value }); setSelectedContactId(''); }}
                                    >
                                        <option value="">Select suburb...</option>
                                        {SUBURBS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    {formErrors.suburb && <p className={styles.fieldError}>{formErrors.suburb}</p>}
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
                            {isPlan && (
                                <div className={styles.sidebarItem}>
                                    <span>Weekly deliveries</span>
                                    <span>× {PLAN_WEEKS}</span>
                                </div>
                            )}
                            <div className={styles.sidebarTotal}>
                                <span>{isPlan ? 'Pay today' : `Total (${totalKg}kg)`}</span>
                                <span>{sym}{dueToday.toFixed(2)}</span>
                            </div>
                            <p className={styles.deliveryNote}>
                                {isPlan ? `Every Wednesday for ${PLAN_WEEKS} weeks, from ${nextDeliveryDay()}` : `Delivered ${nextDeliveryDay()}`}
                            </p>
                            <Button fullWidth onClick={advanceToReview} style={{ marginTop: '1rem' }}>
                                {isLoggedIn ? 'Review order →' : 'Continue →'}
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
                                {isPlan && (
                                    <div className={styles.reviewField}>
                                        <span className={styles.reviewLabel}>Plan</span>
                                        <span className={styles.reviewValue}>
                                            {PLAN_WEEKS} weekly deliveries, paid today.{' '}
                                            {planPrefs.autoRenew ? 'We\'ll send a link to pay for the next month.' : 'Ends after the last delivery.'}
                                        </span>
                                    </div>
                                )}
                                <div className={styles.reviewField}>
                                    <span className={styles.reviewLabel}>Delivery</span>
                                    <span className={styles.reviewValue} style={{ color: 'var(--primary)' }}>
                                        {isPlan
                                            ? `Every Wednesday for ${PLAN_WEEKS} weeks, from ${nextDeliveryDay()} · free`
                                            : `${nextDeliveryDay()} · free`}
                                    </span>
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
                            {isPlan && (
                                <div className={styles.sidebarItem}>
                                    <span>Weekly deliveries</span>
                                    <span>{sym}{cartTotal.toFixed(2)} × {PLAN_WEEKS}</span>
                                </div>
                            )}
                            <div className={styles.sidebarTotal}>
                                <span>{isPlan ? 'Pay today' : `Total (${totalKg}kg)`}</span>
                                <span>{sym}{dueToday.toFixed(2)}</span>
                            </div>
                            {payError && (
                                <p role="alert" className={styles.payError}>{payError}</p>
                            )}
                            <Button fullWidth onClick={handlePayment} disabled={loading} style={{ marginTop: '1.5rem' }}>
                                {loading ? 'Connecting to ZB…' : <>Confirm &amp; Pay {sym}{dueToday.toFixed(2)} →</>}
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
                    <p>Please wait. You&apos;ll be redirected to complete your payment shortly.</p>
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
