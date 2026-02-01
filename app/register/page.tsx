"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/ui/Button';

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                router.push('/dashboard');
            } else {
                alert('Registration failed. Please try again.');
            }
        } catch (err) {
            console.error(err);
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
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                </div>

                <Button fullWidth variant="primary">
                    {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
            </form>

            <div className={styles.footer}>
                Already have an account? <Link href="/login">Log In</Link>
            </div>
        </div>
    );
}
