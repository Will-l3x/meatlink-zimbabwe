"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Navbar.module.css';
import { CART_CHANGED_EVENT, readStoredJson, removeStoredItem } from '@/lib/storage';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<{ name: string } | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        const sync = () => setCartCount(readStoredJson<unknown[]>('hexad_cart', []).length);
        sync();
        window.addEventListener(CART_CHANGED_EVENT, sync);
        window.addEventListener('storage', sync); // other tabs
        return () => {
            window.removeEventListener(CART_CHANGED_EVENT, sync);
            window.removeEventListener('storage', sync);
        };
    }, [pathname]);

    useEffect(() => {
        // Sync the display name from localStorage whenever the route changes.
        const storedUser = readStoredJson<{ name: string; role?: string } | null>('hexad_user', null);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(storedUser);
    }, [pathname]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleLogout = () => {
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
        removeStoredItem('hexad_user');
        setUser(null);
        router.push('/');
    };

    const isActive = (path: string) => pathname === path ? styles.active : '';

    return (
        <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
            <Link href="/" className={styles.logo}>
                Hexad <span>Market</span>
            </Link>

            <nav className={styles.nav}>
                <Link href="/" className={`${styles.link} ${isActive('/')}`}>Home</Link>
                <Link href="/shop" className={`${styles.link} ${isActive('/shop')}`}>Shop Cuts</Link>
                <Link href="/dashboard" className={`${styles.link} ${isActive('/dashboard')}`}>My orders</Link>
            </nav>

            <div className={styles.actions}>
                {user ? (
                    <div className={styles.authLinks}>
                        <span className={styles.userName}>{user.name}</span>
                        <button onClick={handleLogout} className={styles.link} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                            Log Out
                        </button>
                    </div>
                ) : (
                    <div className={styles.authLinks}>
                        <Link href="/login" className={styles.link}>Log In</Link>
                        {pathname !== '/shop' && <Link href="/shop" className={styles.registerBtn}>Shop now</Link>}
                    </div>
                )}

                {cartCount > 0 && pathname !== '/checkout' && (
                    <Link href="/checkout" className={styles.cartLink} aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}. Go to checkout`}>
                        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                        <span className={styles.cartCount}>{cartCount}</span>
                    </Link>
                )}

                <button
                    className={styles.hamburger}
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span className={`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.hamburgerOpen : ''}`} />
                    <span className={`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.hamburgerOpen : ''}`} />
                    <span className={`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.hamburgerOpen : ''}`} />
                </button>
            </div>

            {/* Mobile Menu */}
            <div className={`${styles.mobileNav} ${isMobileMenuOpen ? styles.mobileNavOpen : ''}`}>
                <Link href="/" className={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                <Link href="/shop" className={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>Shop</Link>
                <Link href="/dashboard" className={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>My orders</Link>
                {user ? (
                    <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className={styles.mobileLink} style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, width: '100%' }}>
                        Log Out
                    </button>
                ) : (
                    <>
                        <Link href="/login" className={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>Log In</Link>
                        <Link href="/register" className={styles.mobileCta} onClick={() => setIsMobileMenuOpen(false)}>Create free account</Link>
                    </>
                )}
            </div>
        </header>
    );
}
