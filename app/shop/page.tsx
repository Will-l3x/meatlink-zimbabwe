import styles from './page.module.css';
import HamperCard from '@/components/shop/HamperCard';
import Button from '@/components/ui/Button';

const HAMPERS = [
    {
        id: 'gogo-pack',
        title: 'The Gogo Pack',
        tag: 'ESSENTIALS',
        description: 'Perfect for a small household. Includes mixed beef portions, chicken, and boerewors.',
        pricing: { usd: 45, zar: 850, gbp: 35 }
    },
    {
        id: 'family-pack',
        title: 'The Family Feast',
        tag: 'POPULAR',
        description: 'Our most popular choice. Bulk beef portions, pork, chicken, and premium sausages.',
        pricing: { usd: 85, zar: 1600, gbp: 65 }
    },
    {
        id: 'braai-pack',
        title: 'Harare Braai Master',
        tag: 'PREMIUM',
        description: 'T-bone steak, boerewors, pork chops, and more. Everything needed for a perfect family braai.',
        pricing: { usd: 120, zar: 2200, gbp: 95 }
    },
    {
        id: 'monthly-saver',
        title: 'Monthly Saver',
        tag: 'BEST VALUE',
        description: 'A massive 20kg varied meat collection intended to last a whole month for a large family.',
        pricing: { usd: 180, zar: 3350, gbp: 140 }
    }
];

export default function ShopPage() {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Select Your Meat Pack</h1>
                <p>Choose the subscription that best fits your family's needs in Harare.</p>
            </div>

            <div className={styles.filterBar}>
                <Button variant="primary">Weekly Delivery</Button>
                <Button variant="secondary">Monthly Delivery</Button>
            </div>

            <div className={styles.grid}>
                {HAMPERS.map(hamper => (
                    <HamperCard key={hamper.id} {...hamper} />
                ))}
            </div>
        </div>
    );
}
