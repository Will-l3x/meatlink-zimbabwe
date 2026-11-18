import type { Metadata } from 'next';
import Link from 'next/link';
import InfoPage, { infoStyles as styles } from '@/components/content/InfoPage';
import { SUBURBS } from '@/lib/delivery';

export const metadata: Metadata = {
    title: 'Delivery areas — Hexad Market',
    description: 'Harare suburbs where Hexad Market delivers fresh meat every Wednesday.',
};

export default function DeliveryAreasPage() {
    return (
        <InfoPage eyebrow="Delivery" title="Where we deliver" intro="Free weekly delivery to homes across Harare and Chitungwiza.">
            <h2>Suburbs we cover</h2>
            <p>We deliver every Wednesday to the following areas, at no extra charge.</p>
            <ul className={styles.suburbGrid}>
                {SUBURBS.map((s) => <li key={s}>{s}</li>)}
            </ul>
            <h2>Not on the list?</h2>
            <p>
                Choose the closest suburb at checkout and add details in the address field, or message us on WhatsApp
                before you order and we&apos;ll confirm whether we can reach you.
            </p>
            <p><Link href="/shop">Start shopping →</Link></p>
        </InfoPage>
    );
}
