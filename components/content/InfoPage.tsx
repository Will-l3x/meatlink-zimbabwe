import React from 'react';
import styles from './InfoPage.module.css';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { SUPPORT_WHATSAPP_DISPLAY, whatsappLink } from '@/lib/contact';

interface InfoPageProps {
    eyebrow: string;
    title: string;
    intro?: string;
    updated?: string;
    children: React.ReactNode;
}

export { styles as infoStyles };

export default function InfoPage({ eyebrow, title, intro, updated, children }: InfoPageProps) {
    return (
        <div>
            <section className={styles.hero}>
                <p className="eyebrow">{eyebrow}</p>
                <h1>{title}</h1>
                {intro && <p>{intro}</p>}
            </section>
            <article className={styles.body}>
                {updated && <p className={styles.updated}>Last updated {updated}</p>}
                {children}
                <div className={styles.contactCard}>
                    <p>
                        <strong>Still have a question?</strong>
                        Our Harare team answers on WhatsApp at {SUPPORT_WHATSAPP_DISPLAY}.
                    </p>
                    <a className={styles.waBtn} href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                        <WhatsAppIcon size={18} /> Chat on WhatsApp
                    </a>
                </div>
            </article>
        </div>
    );
}
