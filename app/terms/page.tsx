import type { Metadata } from 'next';
import Link from 'next/link';
import InfoPage from '@/components/content/InfoPage';

export const metadata: Metadata = {
    title: 'Terms of service — Hexad Market',
};

export default function TermsPage() {
    return (
        <InfoPage eyebrow="Legal" title="Terms of service" updated="17 November 2026">
            <h2>About these terms</h2>
            <p>
                These terms apply when you order from Hexad Market on our website or through WhatsApp. By placing an
                order you agree to them.
            </p>

            <h2>Orders and pricing</h2>
            <ul>
                <li>Cuts are sold by the kilogram at the price shown when you place your order.</li>
                <li>An order is confirmed once ZB Smile &amp; Pay reports the payment as successful.</li>
                <li>Meat is a natural product, so delivered weights may vary slightly from the weight ordered.</li>
                <li>If a cut becomes unavailable after you pay, we will contact you to offer a substitute or a refund.</li>
            </ul>

            <h2>Delivery</h2>
            <ul>
                <li>We deliver on Wednesdays to the suburbs listed on our <Link href="/delivery-areas">delivery areas</Link> page.</li>
                <li>Please give an accurate address and a WhatsApp number the recipient can be reached on.</li>
                <li>Someone needs to be available to receive perishable goods. If nobody is home, we will contact the recipient to arrange redelivery.</li>
            </ul>

            <h2>Your account</h2>
            <p>Keep your login details private. You are responsible for orders placed from your account.</p>

            <h2>Problems and refunds</h2>
            <p>See our <Link href="/refunds">refund policy</Link> for what happens if something goes wrong.</p>
        </InfoPage>
    );
}
