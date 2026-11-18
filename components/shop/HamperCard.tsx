import React, { useState } from 'react';
import styles from './HamperCard.module.css';

interface Pricing {
    usd: number;
    zar: number;
    gbp: number;
}

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
                    <div className={styles.priceItem}>
                        <span className={styles.currency}>USD/kg</span>
                        <span className={`${styles.amount} ${styles.amountMain}`}>${pricing.usd.toFixed(2)}</span>
                    </div>
                    <div className={styles.priceItem}>
                        <span className={styles.currency}>ZAR/kg</span>
                        <span className={styles.amount}>R{pricing.zar}</span>
                    </div>
                    <div className={styles.priceItem}>
                        <span className={styles.currency}>GBP/kg</span>
                        <span className={styles.amount}>£{pricing.gbp.toFixed(2)}</span>
                    </div>
                </div>

                {/* Kg Slider */}
                <div className={styles.sliderSection}>
                    <div className={styles.sliderHeader}>
                        <span className={styles.kgLabel}>{kg}kg</span>
                        <span className={styles.kgPrice}>${(pricing.usd * kg).toFixed(2)}</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={kg}
                        onChange={(e) => setKg(Number(e.target.value))}
                        className={styles.slider}
                        aria-label={`Weight of ${title} in kilograms`}
                        style={{ '--fill': `${((kg - 1) / 9) * 100}%` } as React.CSSProperties}
                    />
                    <div className={styles.sliderLabels}>
                        <span>1kg</span>
                        <span>5kg</span>
                        <span>10kg</span>
                    </div>
                </div>

                <button type="button" className={styles.addBtn} onClick={handleAdd}>
                    Add {kg}kg to cart · ${(pricing.usd * kg).toFixed(2)}
                </button>
            </div>
        </div>
    );
}
