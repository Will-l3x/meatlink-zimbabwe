import type { Metadata } from 'next';
import InfoPage from '@/components/content/InfoPage';

export const metadata: Metadata = {
    title: 'Privacy policy — Hexad Market',
};

export default function PrivacyPage() {
    return (
        <InfoPage eyebrow="Legal" title="Privacy policy" updated="17 November 2026">
            <h2>What we collect</h2>
            <ul>
                <li><strong>Your account:</strong> name, email address and a securely hashed password.</li>
                <li><strong>Your recipients:</strong> name, WhatsApp number, delivery address and suburb.</li>
                <li><strong>Your orders:</strong> the cuts and weights you buy, amounts, currency and payment status.</li>
                <li><strong>WhatsApp orders:</strong> your WhatsApp number and the messages you send our ordering bot.</li>
            </ul>
            <p>We do not see or store your card, Ecocash or InnBucks details. Those are entered directly with ZB Smile &amp; Pay.</p>

            <h2>How we use it</h2>
            <ul>
                <li>To take payment, prepare and deliver your orders.</li>
                <li>To send your recipient WhatsApp updates about their delivery.</li>
                <li>To answer your questions and resolve problems with orders.</li>
            </ul>
            <p>We do not sell your information or use it for third-party advertising.</p>

            <h2>Who we share it with</h2>
            <ul>
                <li><strong>ZB Bank (Smile &amp; Pay)</strong> to process payments.</li>
                <li><strong>Meta (WhatsApp Business)</strong> to deliver order and delivery messages.</li>
                <li><strong>Our hosting and database providers</strong>, who store data on our behalf.</li>
                <li><strong>Our delivery team</strong>, who need the recipient&apos;s name, number and address.</li>
            </ul>

            <h2>Your choices</h2>
            <p>
                You can remove saved recipients from your dashboard at any time. To see, correct or delete the
                information we hold about you, message us on WhatsApp and we will respond within 14 days.
            </p>

            <h2>Cookies and storage</h2>
            <p>
                We use one essential cookie to keep you logged in, and your browser&apos;s local storage to remember
                your cart and saved recipients. We do not use tracking or advertising cookies.
            </p>
        </InfoPage>
    );
}
