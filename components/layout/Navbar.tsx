"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Mock wallet balance for now
    const walletBalance = 120.00;

    const isActive = (path: string) => pathname === path ? styles.active : '';

    return (
        <header className={styles.header}>
            <Link href="/" className={styles.logo}>
                MeatLink <span>Zimbabwe</span>
            </Link>

            <nav className={styles.nav}>
                <Link href="/" className={`${styles.link} ${isActive('/')}`}>Home</Link>
                <Link href="/shop" className={`${styles.link} ${isActive('/shop')}`}>Shop Meat</Link>
                <Link href="/dashboard" className={`${styles.link} ${isActive('/dashboard')}`}>Dashboard</Link>
            </nav>

            <div className={styles.actions}>
                <div className={styles.wallet}>
                    <span>Wallet Balance:</span>
                    <span className={styles.walletValue}>${walletBalance.toFixed(2)}</span>
                </div>

                <button className={styles.hamburger} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    ☰
                </button>
            </div>

            {/* Mobile Menu (simplified for now) */}
            {isMobileMenuOpen && (
                <div style={{
                    position: 'absolute',
                    top: '80px',
                    left: 0,
                    width: '100%',
                    background: '#0a0a0a',
                    padding: '1rem',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <Link href="/" className={styles.link} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                    <Link href="/shop" className={styles.link} onClick={() => setIsMobileMenuOpen(false)}>Shop Meat</Link>
                    <Link href="/dashboard" className={styles.link} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                </div>
            )}
        </header>
    );
}
