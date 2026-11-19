"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button';

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                localStorage.setItem('hexad_user', JSON.stringify({
                    id: data.user.id,
                    name: data.user.name,
                    email: data.user.email,
                    role: data.user.role || 'SENDER',
                    walletBalance: data.user.walletBalance || 0,
                    walletUSD: data.user.walletUSD || 0,
                    walletZAR: data.user.walletZAR || 0,
                    walletGBP: data.user.walletGBP || 0
                }));
                router.push('/dashboard');
            } else {
                setError(data.error || 'Registration failed. Please try again.');
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
                <h1>Create Account</h1>
                <p>Join the Diaspora community feeding home.</p>
            </div>

            {error && (
                <div role="alert" className={styles.error}>
                    {error}
                </div>
            )}

            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.inputGroup}>
                    <label>Full Name</label>
                    <input
                        type="text"
                        required
                        placeholder="e.g. Tafara Makunura"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
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
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        required
                        autoComplete="new-password"
                        placeholder="Type your password again"
                        aria-invalid={passwordsMismatch}
                        aria-describedby={passwordsMismatch ? 'confirmPasswordHint' : undefined}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                    {passwordsMismatch && (
                        <span id="confirmPasswordHint" className={styles.fieldHint}>Passwords don&apos;t match yet.</span>
                    )}
                </div>

                <Button fullWidth variant="primary" type="submit" disabled={loading || passwordsMismatch}>
                    {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
            </form>

            <div className={styles.footer}>
                Already have an account? <Link href="/login">Log In</Link>
            </div>
        </div>
    );
}
