import type { Metadata } from 'next';
import Link from 'next/link';
import InfoPage, { infoStyles as styles } from '@/components/content/InfoPage';

export const metadata: Metadata = {
    title: 'FAQ — Hexad Market',
    description: 'How ordering, payment and delivery work at Hexad Market.',
};

const QUESTIONS: Array<{ q: string; a: React.ReactNode }> = [
    {
        q: 'How does ordering work?',
        a: <>Pick your cuts in the <Link href="/shop">shop</Link> and choose how many kilograms of each you want. At checkout, add the details of the person receiving the order in Harare, review it, and pay securely through ZB Smile &amp; Pay.</>,
    },
    {
        q: 'Can I order on WhatsApp instead?',
        a: <>Yes. Message us on WhatsApp and say <strong>Hi</strong>. The bot walks you through the same cuts, weights and delivery details, then sends you a secure payment link.</>,
    },
    {
        q: 'Which payment methods do you accept?',
        a: <>Payments are processed by ZB Smile &amp; Pay, which accepts Ecocash, InnBucks, Visa, Mastercard and Zimswitch. Prices are shown in US dollars, South African rand and British pounds.</>,
    },
    {
        q: 'When will my order be delivered?',
        a: <>We deliver every Wednesday. Paid orders go out on the next Wednesday, and you&apos;ll see the exact date on the review screen before you pay.</>,
    },
    {
        q: 'Does delivery cost extra?',
        a: <>No. Delivery is free to every suburb on our <Link href="/delivery-areas">delivery areas</Link> list.</>,
    },
    {
        q: 'How will my family know the order is coming?',
        a: <>The recipient gets a WhatsApp message when the order is confirmed, another when it&apos;s on the way, and a final one when it has been delivered.</>,
    },
    {
        q: 'Can I send to more than one person?',
        a: <>Yes. Save as many recipients as you like from your dashboard or at checkout, then pick the right one each time you order.</>,
    },
    {
        q: 'What if something is wrong with my order?',
        a: <>Message us on WhatsApp straight away. Our <Link href="/refunds">refund policy</Link> explains how we put it right.</>,
    },
];

export default function FaqPage() {
    return (
        <InfoPage eyebrow="Help centre" title="Frequently asked questions" intro="Everything you need to know about sending fresh meat home to Harare.">
            <div className={styles.faq}>
                {QUESTIONS.map(({ q, a }) => (
                    <details key={q}>
                        <summary>{q}</summary>
                        <p>{a}</p>
                    </details>
                ))}
            </div>
        </InfoPage>
    );
}
