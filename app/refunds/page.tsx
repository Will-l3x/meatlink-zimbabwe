import type { Metadata } from 'next';
import InfoPage from '@/components/content/InfoPage';

export const metadata: Metadata = {
    title: 'Refund policy — Hexad Market',
};

export default function RefundsPage() {
    return (
        <InfoPage eyebrow="Legal" title="Refund policy" updated="17 November 2026">
            <h2>Our promise</h2>
            <p>
                If your order doesn&apos;t arrive, arrives incomplete, or isn&apos;t up to standard, we will put it right
                with a replacement on the next delivery day or a refund.
            </p>

            <h2>How to report a problem</h2>
            <ul>
                <li>Message us on WhatsApp within 24 hours of delivery.</li>
                <li>Include your order reference and, where possible, a photo of the problem.</li>
            </ul>

            <h2>Cancelling an order</h2>
            <p>
                You can cancel for a full refund any time before your order is dispatched on delivery day. Once it is on
                the way, perishable goods can&apos;t be returned, but we will still help if something is wrong.
            </p>

            <h2>How refunds are paid</h2>
            <p>
                Approved refunds go back through ZB Smile &amp; Pay to the method you paid with. Timing depends on your
                bank or mobile wallet.
            </p>
        </InfoPage>
    );
}
