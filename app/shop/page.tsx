"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import HamperCard from '@/components/shop/HamperCard';
import Button from '@/components/ui/Button';
import { readStoredJson, writeStoredJson } from '@/lib/storage';
import { CATALOG } from '@/lib/catalog';

interface CartItem {
    id: string;
    title: string;
    kg: number;
    pricing: { usd: number; zar: number; gbp: number };
}

interface MeatCut {
    id: string;
    title: string;
    tag: string;
    description: string;
    pricing: { usd: number; zar: number; gbp: number };
    frequency: 'weekly';
    /** Product photo; cuts without one show a styled placeholder tile. */
    image?: string;
}

/** Shop copy and photos; prices come from the shared catalogue. */
const CUT_COPY: Omit<MeatCut, 'pricing'>[] = [
    {
        id: 'pork-chops',
        title: 'Pork Chops',
        tag: 'PORK',
        description: 'Tender, bone-in pork chops. Perfect for grilling or pan-frying with your favourite spices.',
        frequency: 'weekly' as const
    },
    {
        id: 'pork-trotters',
        title: 'Pork Trotters',
        tag: 'PORK',
        description: 'Rich in collagen and flavour. Ideal for slow-cooked stews and traditional dishes.',
        frequency: 'weekly' as const,
        image: '/images/cuts/pork-trotters.webp'
    },
    {
        id: 'pork-shoulder',
        title: 'Pork Shoulder',
        tag: 'PORK',
        description: 'Versatile and succulent cut. Great for roasting, pulled pork, or braising.',
        frequency: 'weekly' as const,
        image: '/images/cuts/pork-shoulder.webp'
    },
    {
        id: 'pork-belly',
        title: 'Pork Belly',
        tag: 'PORK',
        description: 'Rich, fatty cut with amazing flavour. Perfect for slow roasting or crispy pork belly.',
        frequency: 'weekly' as const
    },
    {
        id: 'pork-ribs',
        title: 'Pork Ribs',
        tag: 'PORK',
        description: 'Meaty, flavourful ribs. Smoke them, braai them, or slow-cook with BBQ sauce.',
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 't-bone-steak',
        title: 'T-Bone Steak',
        tag: 'BEEF',
        description: 'Premium bone-in steak with both sirloin and fillet. The king of the braai.',
        frequency: 'weekly' as const,
        image: '/images/cuts/t-bone-steak.webp'
    },
    {
        id: 'blade',
        title: 'Blade',
        tag: 'BEEF',
        description: 'Lean, flavourful beef cut. Great for pot roasts, stews, and slow-cooking.',
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'brisket',
        title: 'Brisket',
        tag: 'BEEF',
        description: 'Slow-cook this to perfection. Incredible for smoking, braising, and BBQ.',
        frequency: 'weekly' as const,
        image: '/images/cuts/brisket.webp'
    },
    {
        id: 'full-chicken',
        title: 'Full Chicken',
        tag: 'POULTRY',
        description: 'Whole chicken, perfect for roasting, grilling, or a hearty Sunday family meal.',
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'chicken-breast',
        title: 'Chicken Breast',
        tag: 'POULTRY',
        description: 'Lean, protein-packed chicken breast. Versatile for any recipe or meal prep.',
        frequency: 'weekly' as const
    },
    {
        id: 'mixed-portions',
        title: 'Mixed Portions',
        tag: 'POULTRY',
        description: 'Assorted chicken pieces — drumsticks, thighs, and wings. Great value for families.',
        frequency: 'weekly' as const,
        image: '/images/cuts/mixed-portions.webp'
    },
    {
        id: 'oxtail',
        title: 'Oxtail',
        tag: 'PREMIUM',
        description: 'The ultimate comfort food. Slow-cooked oxtail is a Zimbabwean favourite.',
        frequency: 'weekly' as const
    },
    {
        id: 'beef-short-ribs',
        title: 'Beef Short Ribs',
        tag: 'BEEF',
        description: 'Thick, meaty ribs with incredible marbling. Perfect for braising or the braai.',
        frequency: 'weekly' as const,
        image: '/images/cuts/beef-short-ribs.webp'
    },
    {
        id: 'beef-trotters',
        title: 'Beef Trotters',
        tag: 'BEEF',
        description: 'Traditional and nutritious. Perfect for hearty soups and slow-cooked dishes.',
        frequency: 'weekly' as const
    },
    {
        id: 'liver',
        title: 'Liver',
        tag: 'SPECIALTY',
        description: 'Nutrient-rich organ meat. Pan-fried with onions — a classic high-protein meal.',
        frequency: 'weekly' as const
    },
    {
        id: 'goat-meat',
        title: 'Goat Meat',
        tag: 'SPECIALTY',
        description: 'Lean and flavourful. Popular for curries, stews, and traditional celebrations.',
        frequency: 'weekly' as const
    }
];

const MEAT_CUTS: MeatCut[] = CUT_COPY.map((cut) => ({ ...cut, title: CATALOG[cut.id].title, pricing: CATALOG[cut.id].pricing }));

type FilterType = 'all' | 'pork' | 'beef' | 'poultry' | 'premium' | 'specialty';
const CATEGORY_FILTERS: FilterType[] = ['pork', 'beef', 'poultry', 'premium', 'specialty'];

function ShopPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // The active filter comes from ?category= until the user picks one manually;
    // a manual pick is scoped to the URL it was made on so a new link resets it.
    const categoryParam = searchParams.get('category')?.toLowerCase() ?? null;
    const urlFilter: FilterType = categoryParam && CATEGORY_FILTERS.includes(categoryParam as FilterType)
        ? (categoryParam as FilterType)
        : 'all';
    const [manualFilter, setManualFilter] = useState<{ forParam: string | null; value: FilterType } | null>(null);
    const filter: FilterType = manualFilter && manualFilter.forParam === categoryParam ? manualFilter.value : urlFilter;
    const setFilter = (value: FilterType) => setManualFilter({ forParam: categoryParam, value });
    const [cart, setCart] = useState<CartItem[]>([]);
    const [addedMessage, setAddedMessage] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        // Hydrate the cart from localStorage after mount (not available during SSR).
        const saved = readStoredJson<CartItem[]>('hexad_cart', []);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCart(saved);
    }, []);

    useEffect(() => {
        writeStoredJson('hexad_cart', cart);
    }, [cart]);

    const addToCart = (id: string, title: string, kg: number, pricing: { usd: number; zar: number; gbp: number }) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === id);
            if (existing) {
                return prev.map(item =>
                    item.id === id ? { ...item, kg: item.kg + kg } : item
                );
            }
            return [...prev, { id, title, kg, pricing }];
        });
        setAddedMessage(`Added ${kg} kg ${title} to your cart`);
        setTimeout(() => setAddedMessage(''), 2000);
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateKg = (id: string, kg: number) => {
        if (kg <= 0) {
            removeFromCart(id);
            return;
        }
        setCart(prev => prev.map(item => item.id === id ? { ...item, kg } : item));
    };

    const getCartTotal = () => cart.reduce((sum, item) => sum + (item.pricing.usd * item.kg), 0);
    const getCartKg = () => cart.reduce((sum, item) => sum + item.kg, 0);

    const goToCheckout = () => {
        writeStoredJson('hexad_cart', cart);
        router.push('/checkout');
    };

    const filteredCuts = filter === 'all'
        ? MEAT_CUTS
        : MEAT_CUTS.filter(c => c.tag.toLowerCase() === filter);

    return (
        <div className={styles.page}>
            <div className={styles.shopHero}>
                <p className={styles.shopEyebrow}>Online counter</p>
                <h1>Premium cuts</h1>
                <p>Pick your cuts, choose the weight, and we deliver free across Harare every Wednesday.</p>
            </div>

            <div className={styles.container}>

            {addedMessage && (
                <div className={styles.addedToast} role="status">{addedMessage}</div>
            )}

            <div className={styles.filterBar}>
                <Button variant={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')}>
                    All
                </Button>
                <Button variant={filter === 'pork' ? 'primary' : 'secondary'} onClick={() => setFilter('pork')}>
                    Pork
                </Button>
                <Button variant={filter === 'beef' ? 'primary' : 'secondary'} onClick={() => setFilter('beef')}>
                    Beef
                </Button>
                <Button variant={filter === 'poultry' ? 'primary' : 'secondary'} onClick={() => setFilter('poultry')}>
                    Poultry
                </Button>
                <Button variant={filter === 'premium' ? 'primary' : 'secondary'} onClick={() => setFilter('premium')}>
                    Premium
                </Button>
                <Button variant={filter === 'specialty' ? 'primary' : 'secondary'} onClick={() => setFilter('specialty')}>
                    Specialty
                </Button>
            </div>

            <div className={styles.grid}>
                {filteredCuts.map(cut => (
                    <HamperCard
                        key={cut.id}
                        {...cut}
                        onAddToCart={addToCart}
                        cartQty={cart.find(c => c.id === cut.id)?.kg || 0}
                    />
                ))}
            </div>

            {filteredCuts.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: 'var(--text-muted)',
                    fontSize: '1.1rem'
                }}>
                    No cuts available for this filter.
                </div>
            )}
            </div>

            {/* Floating View Cart Button */}
            {cart.length > 0 && (
                <button type="button" className={styles.viewCartPill} onClick={() => setDrawerOpen(true)}>
                    <span className={styles.pillBadge}>{cart.length}</span>
                    <span className={styles.pillText}>
                        View cart · <strong>${getCartTotal().toFixed(2)}</strong>
                    </span>
                    <span aria-hidden="true">→</span>
                </button>
            )}

            {/* Cart Drawer Overlay */}
            {drawerOpen && (
                <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)} />
            )}

            {/* Cart Drawer */}
            <div className={`${styles.cartDrawer} ${drawerOpen ? styles.cartDrawerOpen : ''}`}>
                <div className={styles.drawerHeader}>
                    <h2 className={styles.drawerTitle}>Your Cart</h2>
                    <button type="button" className={styles.drawerClose} onClick={() => setDrawerOpen(false)} aria-label="Close cart">✕</button>
                </div>

                <div className={styles.drawerItems}>
                    {cart.length === 0 ? (
                        <div className={styles.drawerEmpty}>
                            <span>🛒</span>
                            <p>Your cart is empty</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className={styles.drawerItem}>
                                <div className={styles.drawerItemInfo}>
                                    <span className={styles.drawerItemName}>{item.title}</span>
                                    <span className={styles.drawerItemPrice}>
                                        ${(item.pricing.usd * item.kg).toFixed(2)}
                                    </span>
                                </div>
                                <div className={styles.drawerItemControls}>
                                    <button
                                        className={styles.kgBtn}
                                        onClick={() => updateKg(item.id, item.kg - 1)}
                                    >−</button>
                                    <span className={styles.kgValue}>{item.kg}kg</span>
                                    <button
                                        className={styles.kgBtn}
                                        onClick={() => updateKg(item.id, item.kg + 1)}
                                    >+</button>
                                    <button
                                        className={styles.removeItemBtn}
                                        onClick={() => removeFromCart(item.id)}
                                        aria-label={`Remove ${item.title}`}
                                    >🗑</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {cart.length > 0 && (
                    <div className={styles.drawerFooter}>
                        <div className={styles.drawerTotal}>
                            <span>{getCartKg()}kg · {cart.length} item{cart.length !== 1 ? 's' : ''}</span>
                            <span className={styles.drawerTotalPrice}>${getCartTotal().toFixed(2)}</span>
                        </div>
                        <button className={styles.drawerCheckoutBtn} onClick={goToCheckout}>
                            Checkout →
                        </button>
                        <button className={styles.drawerContinueBtn} onClick={() => setDrawerOpen(false)}>
                            Continue Shopping
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ShopPage() {
    return (
        <Suspense fallback={<div className={styles.page}><div className={styles.container}>Loading shop…</div></div>}>
            <ShopPageContent />
        </Suspense>
    );
}
