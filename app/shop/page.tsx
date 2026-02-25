"use client";

import React, { useState } from 'react';
import styles from './page.module.css';
import HamperCard from '@/components/shop/HamperCard';
import Button from '@/components/ui/Button';

const HAMPERS = [
    {
        id: 'gogo-pack',
        title: 'The Gogo Pack',
        tag: 'ESSENTIALS',
        description: 'Perfect for a small household. Includes mixed beef portions, chicken, and boerewors.',
        pricing: { usd: 45, zar: 850, gbp: 35 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'family-pack',
        title: 'The Family Feast',
        tag: 'POPULAR',
        description: 'Our most popular choice. Bulk beef portions, pork, chicken, and premium sausages.',
        pricing: { usd: 85, zar: 1600, gbp: 65 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'braai-pack',
        title: 'Harare Braai Master',
        tag: 'PREMIUM',
        description: 'T-bone steak, boerewors, pork chops, and more. Everything needed for a perfect family braai.',
        pricing: { usd: 120, zar: 2200, gbp: 95 },
        frequency: 'weekly' as const,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop&q=80'
    },
    {
        id: 'monthly-saver',
        title: 'Monthly Saver',
        tag: 'BEST VALUE',
        description: 'A massive 20kg varied meat collection intended to last a whole month for a large family.',
        pricing: { usd: 180, zar: 3350, gbp: 140 },
        frequency: 'monthly' as const,
        image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=600&h=400&fit=crop&q=80'
    }
];

type FilterType = 'all' | 'weekly' | 'monthly';

export default function ShopPage() {
    const [filter, setFilter] = useState<FilterType>('all');

    const filteredHampers = filter === 'all'
        ? HAMPERS
        : HAMPERS.filter(h => h.frequency === filter);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Select Your Meat Pack</h1>
                <p>Choose the subscription that best fits your family&apos;s needs in Harare.</p>
            </div>

            <div className={styles.filterBar}>
                <Button
                    variant={filter === 'all' ? 'primary' : 'secondary'}
                    onClick={() => setFilter('all')}
                >
                    All Packs
                </Button>
                <Button
                    variant={filter === 'weekly' ? 'primary' : 'secondary'}
                    onClick={() => setFilter('weekly')}
                >
                    Weekly Delivery
                </Button>
                <Button
                    variant={filter === 'monthly' ? 'primary' : 'secondary'}
                    onClick={() => setFilter('monthly')}
                >
                    Monthly Delivery
                </Button>
            </div>

            <div className={styles.grid}>
                {filteredHampers.map(hamper => (
                    <HamperCard key={hamper.id} {...hamper} />
                ))}
            </div>

            {filteredHampers.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: 'var(--text-muted)',
                    fontSize: '1.1rem'
                }}>
                    No packs available for this filter.
                </div>
            )}
        </div>
    );
}
