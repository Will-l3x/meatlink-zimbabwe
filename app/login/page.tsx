"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../register/page.module.css';
import Button from '@/components/ui/Button';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Mock login logic
        setTimeout(() => {
            localStorage.setItem('meatlink_user', JSON.stringify({
                id: 'user_' + Math.random().toString(36).substr(2, 9),
                name: 'Tafara M.',
                email: 'tafara@example.com'
            }));
            router.push('/dashboard');
            setLoading(false);
        }, 1000);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Welcome Back</h1>
                <p>Log in to manage your family's meat packs.</p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.inputGroup}>
                    <label>Email Address</label>
                    <input type="email" required placeholder="name@example.com" />
                </div>
                <div className={styles.inputGroup}>
                    <label>Password</label>
                    <input type="password" required placeholder="••••••••" />
                </div>

                <Button fullWidth variant="primary">
                    {loading ? 'Logging in...' : 'Log In'}
                </Button>
            </form>

            <div className={styles.footer}>
                Don't have an account? <Link href="/register">Sign Up</Link>
            </div>
        </div>
    );
}
