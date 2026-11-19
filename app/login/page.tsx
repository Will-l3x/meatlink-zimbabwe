"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../register/page.module.css';
import Button from '@/components/ui/Button';
import { readNextPath, withNext } from '@/lib/next-path';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // Where to go afterwards (e.g. back to checkout); read after mount.
    const [nextPath, setNextPath] = useState<string | null>(null);
    useEffect(() => { setNextPath(readNextPath()); }, []);
    const [formData, setFormData] = useState({ email: '', password: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                localStorage.setItem('hexad_user', JSON.stringify({
                    id: data.user.id,
                    name: data.user.name,
                    email: data.user.email,
                    role: data.user.role,
                    walletBalance: data.user.walletBalance,
                    walletUSD: data.user.walletUSD || 0,
                    walletZAR: data.user.walletZAR || 0,
                    walletGBP: data.user.walletGBP || 0
                }));
                router.push(nextPath || (data.user.role === 'ADMIN' ? '/admin' : '/dashboard'));
            } else {
                setError(data.error || 'Invalid email or password.');
            }
        } catch (err) {
            console.error(err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Welcome Back</h1>
                <p>{nextPath === '/checkout' ? 'Log in to finish your order. Your cart and delivery details are saved.' : 'Log in to manage your family\'s orders.'}</p>
            </div>

            {error && (
                <div role="alert" className={styles.error}>
                    {error}
                </div>
            )}

            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.inputGroup}>
                    <label>Email Address</label>
                    <input
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label>Password</label>
                    <input
                        type="password"
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                </div>

                <Button fullWidth variant="primary" type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Log In'}
                </Button>
            </form>

            <div className={styles.footer}>
                Don&apos;t have an account? <Link href={withNext('/register', nextPath)}>Sign Up</Link>
            </div>
        </div>
    );
}
