import React from 'react';
import styles from './HamperCard.module.css';
import Button from '@/components/ui/Button';

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
}

export default function HamperCard({
    id,
    title,
    description,
    pricing,
    tag = "Hamper",
    image
}: HamperCardProps) {
    return (
        <div className={styles.card}>
            <div className={styles.imagePlaceholder}>
                {image ? (
                    <img
                        src={image}
                        alt={title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                        [Img: {title}]
                    </span>
                )}
            </div>

            <div className={styles.content}>
                <div className={styles.tag}>{tag}</div>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.description}>{description}</p>

                <div className={styles.pricing}>
                    <div className={styles.priceItem}>
                        <span className={styles.currency}>USD</span>
                        <span className={`${styles.amount} ${styles.amountMain}`}>${pricing.usd}</span>
                    </div>
                    <div className={styles.priceItem}>
                        <span className={styles.currency}>ZAR</span>
                        <span className={styles.amount}>R{pricing.zar}</span>
                    </div>
                    <div className={styles.priceItem}>
                        <span className={styles.currency}>GBP</span>
                        <span className={styles.amount}>£{pricing.gbp}</span>
                    </div>
                </div>

                <Button fullWidth href={`/checkout?pack=${id}`}>
                    Select Pack
                </Button>
            </div>
        </div>
    );
}
