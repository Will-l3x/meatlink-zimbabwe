"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../register/page.module.css';
import Button from '@/components/ui/Button';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
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
                localStorage.setItem('meatlink_user', JSON.stringify({
                    id: data.user.id,
                    name: data.user.name,
                    email: data.user.email,
                    role: data.user.role,
                    walletBalance: data.user.walletBalance
                }));
                router.push('/dashboard');
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
                <p>Log in to manage your family&apos;s meat packs.</p>
            </div>

            {error && (
                <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(196, 69, 54, 0.08)',
                    color: 'var(--primary)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                    border: '1px solid rgba(196, 69, 54, 0.2)'
                }}>
                    {error}
                </div>
            )}

            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.inputGroup}>
                    <label>Email Address</label>
                    <input
                        type="email"
                        required
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
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                </div>

                <Button fullWidth variant="primary">
                    {loading ? 'Logging in...' : 'Log In'}
                </Button>
            </form>

            <div className={styles.footer}>
                Don&apos;t have an account? <Link href="/register">Sign Up</Link>
            </div>
        </div>
    );
}
