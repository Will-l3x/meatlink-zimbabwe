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

    useEffect(() => {
        // Check for user in localStorage to simulate session
        const storedUser = localStorage.getItem('meatlink_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem('meatlink_user');
        setUser(null);
        router.push('/');
    };

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
                        <Link href="/register" className={styles.registerBtn}>Join</Link>
                    </div>
                )}

                <button className={styles.hamburger} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    ☰
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className={styles.mobileNav}>
                    <Link href="/" className={styles.link} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                    <Link href="/shop" className={styles.link} onClick={() => setIsMobileMenuOpen(false)}>Shop Meat</Link>
                    <Link href="/dashboard" className={styles.link} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                    {user ? (
                        <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className={styles.link} style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0 }}>
                            Log Out
                        </button>
                    ) : (
                        <>
                            <Link href="/login" className={styles.link} onClick={() => setIsMobileMenuOpen(false)}>Log In</Link>
                            <Link href="/register" className={styles.link} onClick={() => setIsMobileMenuOpen(false)}>Join</Link>
                        </>
                    )}
                </div>
            )}
        </header>
    );
}
