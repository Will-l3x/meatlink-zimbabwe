import React, { useState } from 'react';
import styles from './HamperCard.module.css';

interface Pricing {
    usd: number;
    zar: number;
    gbp: number;
}

const MIN_KG = 1;
const MAX_KG = 20;

interface HamperCardProps {
    id: string;
    title: string;
    description: string;
    pricing: Pricing;
    tag?: string;
    image?: string;
    onAddToCart?: (id: string, title: string, kg: number, pricing: Pricing) => void;
    cartQty?: number;
}

export default function HamperCard({
    id,
    title,
    description,
    pricing,
    tag = "Hamper",
    image,
    onAddToCart,
    cartQty = 0
}: HamperCardProps) {
    const [kg, setKg] = useState(1);

    const handleAdd = () => {
        if (onAddToCart) onAddToCart(id, title, kg, pricing);
    };

    return (
        <div className={styles.card}>
            <div className={styles.imageFrame}>
                {image ? (
                    <img
                        src={image}
                        alt={title}
                        loading="lazy"
                        decoding="async"
                        className={styles.image}
                    />
                ) : (
                    <div className={styles.fallback} aria-hidden="true">
                        <span className={styles.fallbackTag}>{tag}</span>
                        <span className={styles.fallbackTitle}>{title}</span>
                        <span className={styles.fallbackRule} />
                        <span className={styles.fallbackNote}>Cut fresh to order</span>
                    </div>
                )}
                {cartQty > 0 && (
                    <div className={styles.cartBadge}>
                        {cartQty}kg in cart
                    </div>
                )}
            </div>

            <div className={styles.content}>
                <div className={styles.tag}>{tag}</div>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.description}>{description}</p>

                <div className={styles.pricing}>
                    <span className={styles.amountMain}>${pricing.usd.toFixed(2)}<span className={styles.perKg}> / kg</span></span>
                    <span className={styles.otherCurrencies}>≈ R{pricing.zar} · £{pricing.gbp.toFixed(2)}</span>
                </div>

                <div className={styles.qtyRow}>
                    <div className={styles.stepper} role="group" aria-label={`Weight of ${title}`}>
                        <button
                            type="button"
                            className={styles.stepBtn}
                            onClick={() => setKg((k) => Math.max(MIN_KG, k - 1))}
                            disabled={kg <= MIN_KG}
                            aria-label="1 kg less"
                        >−</button>
                        <span className={styles.stepValue} aria-live="polite">{kg} kg</span>
                        <button
                            type="button"
                            className={styles.stepBtn}
                            onClick={() => setKg((k) => Math.min(MAX_KG, k + 1))}
                            disabled={kg >= MAX_KG}
                            aria-label="1 kg more"
                        >+</button>
                    </div>
                    <span className={styles.lineTotal}>${(pricing.usd * kg).toFixed(2)}</span>
                </div>

                <button type="button" className={styles.addBtn} onClick={handleAdd}>
                    {cartQty > 0 ? `Add ${kg} kg more` : 'Add to cart'}
                </button>
            </div>
        </div>
    );
}
