import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { SUPPORT_WHATSAPP_DISPLAY, whatsappLink } from '@/lib/contact';

const WA_URL = whatsappLink();

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.grid}>
                    <div className={styles.brand}>
                        <Link href="/" className={styles.logo}>
                            Hexad <span>Market</span>
                        </Link>
                        <p className={styles.tagline}>
                            Feeding families in Harare, powered by love from the Diaspora.
                        </p>
                        <a href={WA_URL} target="_blank" rel="noopener noreferrer" className={styles.waLink}>
                            <WhatsAppIcon size={16} />
                            {SUPPORT_WHATSAPP_DISPLAY}
                        </a>
                    </div>

                    <div className={styles.column}>
                        <h4>Quick Links</h4>
                        <Link href="/shop">Shop Premium Cuts</Link>
                        <Link href="/dashboard">My Dashboard</Link>
                        <Link href="/register">Create Account</Link>
                    </div>

                    <div className={styles.column}>
                        <h4>Support</h4>
                        <a href={WA_URL} target="_blank" rel="noopener noreferrer">WhatsApp Us</a>
                        <Link href="/faq">FAQ</Link>
                        <Link href="/delivery-areas">Delivery Areas</Link>
                    </div>

                    <div className={styles.column}>
                        <h4>Legal</h4>
                        <Link href="/privacy">Privacy Policy</Link>
                        <Link href="/terms">Terms of Service</Link>
                        <Link href="/refunds">Refund Policy</Link>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p>© {new Date().getFullYear()} Hexad Market. All rights reserved.</p>
                    <p className={styles.location}>🇿🇼 Harare, Zimbabwe</p>
                </div>
            </div>
        </footer>
    );
}
