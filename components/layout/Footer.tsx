import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.grid}>
                    <div className={styles.brand}>
                        <Link href="/" className={styles.logo}>
                            MeatLink <span>Zimbabwe</span>
                        </Link>
                        <p className={styles.tagline}>
                            Feeding families in Harare, powered by love from the Diaspora.
                        </p>
                    </div>

                    <div className={styles.column}>
                        <h4>Quick Links</h4>
                        <Link href="/shop">Shop Meat Packs</Link>
                        <Link href="/dashboard">My Dashboard</Link>
                        <Link href="/top-up">Fund Wallet</Link>
                    </div>

                    <div className={styles.column}>
                        <h4>Support</h4>
                        <Link href="#">WhatsApp Us</Link>
                        <Link href="#">FAQ</Link>
                        <Link href="#">Delivery Areas</Link>
                    </div>

                    <div className={styles.column}>
                        <h4>Legal</h4>
                        <Link href="#">Privacy Policy</Link>
                        <Link href="#">Terms of Service</Link>
                        <Link href="#">Refund Policy</Link>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p>© {new Date().getFullYear()} MeatLink Zimbabwe. All rights reserved.</p>
                    <p className={styles.location}>🇿🇼 Harare, Zimbabwe</p>
                </div>
            </div>
        </footer>
    );
}
