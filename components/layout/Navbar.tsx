"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<{ name: string } | null>(null);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('hexad_user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, [pathname]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('hexad_user');
        setUser(null);
        router.push('/');
    };

    const isActive = (path: string) => pathname === path ? styles.active : '';

    return (
        <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
            <Link href="/" className={styles.logo}>
                MeatLink <span>Zimbabwe</span>
            </Link>

            <nav className={styles.nav}>
                <Link href="/" className={`${styles.link} ${isActive('/')}`}>Home</Link>
                <Link href="/shop" className={`${styles.link} ${isActive('/shop')}`}>Shop</Link>
                <Link href="/dashboard" className={`${styles.link} ${isActive('/dashboard')}`}>Dashboard</Link>
            </nav>

            <div className={styles.actions}>
                {user ? (
                    <div className={styles.authLinks}>
                        <span className={styles.userName}>👋 {user.name}</span>
                        <button onClick={handleLogout} className={styles.link} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                            Log Out
                        </button>
                    </div>
                ) : (
                    <div className={styles.authLinks}>
                        <Link href="/login" className={styles.link}>Log In</Link>
                        <Link href="/register" className={styles.registerBtn}>Join Free</Link>
                    </div>
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
                <Link href="/dashboard" className={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                {user ? (
                    <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className={styles.mobileLink} style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, width: '100%' }}>
                        Log Out
                    </button>
                ) : (
                    <>
                        <Link href="/login" className={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>Log In</Link>
                        <Link href="/register" className={styles.mobileCta} onClick={() => setIsMobileMenuOpen(false)}>Join Free</Link>
                    </>
                )}
            </div>
        </header>
    );
}
