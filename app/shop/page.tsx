"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import HamperCard from '@/components/shop/HamperCard';
import Button from '@/components/ui/Button';

interface CartItem {
    id: string;
    title: string;
    kg: number;
    pricing: { usd: number; zar: number; gbp: number };
}

const MEAT_CUTS = [
    {
        id: 'pork-chops',
        title: 'Pork Chops',
        tag: 'PORK',
        description: 'Tender, bone-in pork chops. Perfect for grilling or pan-frying with your favourite spices.',
        pricing: { usd: 5.45, zar: 101, gbp: 4.30 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1432139509613-5c4255a1d128?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'pork-trotters',
        title: 'Pork Trotters',
        tag: 'PORK',
        description: 'Rich in collagen and flavour. Ideal for slow-cooked stews and traditional dishes.',
        pricing: { usd: 3.75, zar: 69, gbp: 2.96 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'pork-shoulder',
        title: 'Pork Shoulder',
        tag: 'PORK',
        description: 'Versatile and succulent cut. Great for roasting, pulled pork, or braising.',
        pricing: { usd: 5.00, zar: 93, gbp: 3.95 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'pork-belly',
        title: 'Pork Belly',
        tag: 'PORK',
        description: 'Rich, fatty cut with amazing flavour. Perfect for slow roasting or crispy pork belly.',
        pricing: { usd: 6.00, zar: 111, gbp: 4.74 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'pork-ribs',
        title: 'Pork Ribs',
        tag: 'PORK',
        description: 'Meaty, flavourful ribs. Smoke them, braai them, or slow-cook with BBQ sauce.',
        pricing: { usd: 5.00, zar: 93, gbp: 3.95 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 't-bone-steak',
        title: 'T-Bone Steak',
        tag: 'BEEF',
        description: 'Premium bone-in steak with both sirloin and fillet. The king of the braai.',
        pricing: { usd: 7.20, zar: 133, gbp: 5.69 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'blade',
        title: 'Blade',
        tag: 'BEEF',
        description: 'Lean, flavourful beef cut. Great for pot roasts, stews, and slow-cooking.',
        pricing: { usd: 6.55, zar: 121, gbp: 5.17 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'brisket',
        title: 'Brisket',
        tag: 'BEEF',
        description: 'Slow-cook this to perfection. Incredible for smoking, braising, and BBQ.',
        pricing: { usd: 6.00, zar: 111, gbp: 4.74 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'full-chicken',
        title: 'Full Chicken',
        tag: 'POULTRY',
        description: 'Whole chicken, perfect for roasting, grilling, or a hearty Sunday family meal.',
        pricing: { usd: 6.89, zar: 127, gbp: 5.44 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'chicken-breast',
        title: 'Chicken Breast',
        tag: 'POULTRY',
        description: 'Lean, protein-packed chicken breast. Versatile for any recipe or meal prep.',
        pricing: { usd: 4.62, zar: 85, gbp: 3.65 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82571?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'mixed-portions',
        title: 'Mixed Portions',
        tag: 'POULTRY',
        description: 'Assorted chicken pieces — drumsticks, thighs, and wings. Great value for families.',
        pricing: { usd: 5.00, zar: 93, gbp: 3.95 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'oxtail',
        title: 'Oxtail',
        tag: 'PREMIUM',
        description: 'The ultimate comfort food. Slow-cooked oxtail is a Zimbabwean favourite.',
        pricing: { usd: 12.86, zar: 238, gbp: 10.16 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'beef-short-ribs',
        title: 'Beef Short Ribs',
        tag: 'BEEF',
        description: 'Thick, meaty ribs with incredible marbling. Perfect for braising or the braai.',
        pricing: { usd: 6.00, zar: 111, gbp: 4.74 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'beef-trotters',
        title: 'Beef Trotters',
        tag: 'BEEF',
        description: 'Traditional and nutritious. Perfect for hearty soups and slow-cooked dishes.',
        pricing: { usd: 4.50, zar: 83, gbp: 3.56 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'liver',
        title: 'Liver',
        tag: 'SPECIALTY',
        description: 'Nutrient-rich organ meat. Pan-fried with onions — a classic high-protein meal.',
        pricing: { usd: 7.50, zar: 139, gbp: 5.93 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'goat-meat',
        title: 'Goat Meat',
        tag: 'SPECIALTY',
        description: 'Lean and flavourful. Popular for curries, stews, and traditional celebrations.',
        pricing: { usd: 6.92, zar: 128, gbp: 5.47 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&h=400&fit=crop&q=80'
    }
];

type FilterType = 'all' | 'pork' | 'beef' | 'poultry' | 'premium' | 'specialty';

export default function ShopPage() {
    const router = useRouter();
    const [filter, setFilter] = useState<FilterType>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [addedMessage, setAddedMessage] = useState('');

    // Load cart from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('hexad_cart');
        if (saved) setCart(JSON.parse(saved));
    }, []);

    // Save cart to localStorage
    useEffect(() => {
        localStorage.setItem('hexad_cart', JSON.stringify(cart));
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
        setAddedMessage(`✅ ${kg}kg ${title} added!`);
        setTimeout(() => setAddedMessage(''), 2000);
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const getCartTotal = () => cart.reduce((sum, item) => sum + (item.pricing.usd * item.kg), 0);
    const getCartKg = () => cart.reduce((sum, item) => sum + item.kg, 0);

    const goToCheckout = () => {
        localStorage.setItem('hexad_cart', JSON.stringify(cart));
        router.push('/checkout');
    };

    const filteredCuts = filter === 'all'
        ? MEAT_CUTS
        : MEAT_CUTS.filter(c => c.tag.toLowerCase() === filter);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Premium Cuts</h1>
                <p>Fresh, quality meat delivered to your family in Harare. Pick your cuts, choose your kg.</p>
            </div>

            {addedMessage && (
                <div className={styles.addedToast}>{addedMessage}</div>
            )}

            <div className={styles.filterBar}>
                <Button variant={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')}>
                    All Cuts
                </Button>
                <Button variant={filter === 'pork' ? 'primary' : 'secondary'} onClick={() => setFilter('pork')}>
                    🐖 Pork
                </Button>
                <Button variant={filter === 'beef' ? 'primary' : 'secondary'} onClick={() => setFilter('beef')}>
                    🥩 Beef
                </Button>
                <Button variant={filter === 'poultry' ? 'primary' : 'secondary'} onClick={() => setFilter('poultry')}>
                    🍗 Poultry
                </Button>
                <Button variant={filter === 'premium' ? 'primary' : 'secondary'} onClick={() => setFilter('premium')}>
                    ⭐ Premium
                </Button>
                <Button variant={filter === 'specialty' ? 'primary' : 'secondary'} onClick={() => setFilter('specialty')}>
                    🔥 Specialty
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

            {/* Floating Cart Bar */}
            {cart.length > 0 && (
                <div className={styles.cartBar}>
                    <div className={styles.cartInfo}>
                        <div className={styles.cartSummary}>
                            <span className={styles.cartIcon}>🛒</span>
                            <span className={styles.cartCount}>{cart.length} {cart.length === 1 ? 'item' : 'items'} · {getCartKg()}kg</span>
                        </div>
                        <span className={styles.cartTotal}>${getCartTotal().toFixed(2)}</span>
                    </div>
                    <div className={styles.cartItems}>
                        {cart.map(item => (
                            <div key={item.id} className={styles.cartItem}>
                                <span>{item.title} ({item.kg}kg)</span>
                                <button className={styles.removeBtn} onClick={() => removeFromCart(item.id)}>✕</button>
                            </div>
                        ))}
                    </div>
                    <button className={styles.checkoutBtn} onClick={goToCheckout}>
                        Proceed to Checkout — ${getCartTotal().toFixed(2)}
                    </button>
                </div>
            )}
        </div>
    );
}
