"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function AccountsPage() {
    const [activeTab, setActiveTab] = useState<'senders' | 'recipients'>('senders');

    const senders = [
        { name: "Tafara Makunura", location: "London, UK", balance: "$240.50", status: "Active", initials: "TM" },
        { name: "Sarah Jenkins", location: "Johannesburg, SA", balance: "$45.00", status: "Active", initials: "SJ" },
        { name: "Bruce Wayne", location: "New York, USA", balance: "$1,200.00", status: "Active", initials: "BW" },
        { name: "N. Sibanda", location: "Cape Town, SA", balance: "$0.00", status: "Inactive", initials: "NS" },
    ];

    const recipients = [
        { name: "Mrs. Moyo", suburb: "Mabelreign", sender: "Tafara Makunura", lastDelivery: "3 Days ago" },
        { name: "Gogo Jenkins", suburb: "Avondale", sender: "Sarah Jenkins", lastDelivery: "10 Days ago" },
        { name: "Alfred Pennyworth", suburb: "Borrowdale", sender: "Bruce Wayne", lastDelivery: "Yesterday" },
    ];

    return (
        <div className={styles.container}>
            <Link href="/admin" className={styles.backLink}>
                ← Back to Command Center
            </Link>

            <header className={styles.header}>
                <h1 className={styles.title}>User Management</h1>
            </header>

            <input
                type="text"
                className={styles.searchBar}
                placeholder={`Search ${activeTab}...`}
            />

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'senders' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('senders')}
                >
                    Diaspora Senders
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'recipients' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('recipients')}
                >
                    Harare Recipients
                </button>
            </div>

            <table className={styles.table}>
                {activeTab === 'senders' ? (
                    <>
                        <thead>
                            <tr>
                                <th>SENDER</th>
                                <th>LOCATION</th>
                                <th>WALLET BALANCE</th>
                                <th>STATUS</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {senders.map((s, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className={styles.avatar}>{s.initials}</div>
                                        <strong>{s.name}</strong>
                                    </td>
                                    <td>{s.location}</td>
                                    <td style={{ color: 'var(--primary)', fontWeight: '800' }}>{s.balance}</td>
                                    <td>
                                        <span className={`${styles.status} ${s.status === 'Active' ? styles.statusActive : styles.statusInactive}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.8rem' }}>
                                            Edit User
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </>
                ) : (
                    <>
                        <thead>
                            <tr>
                                <th>RECIPIENT</th>
                                <th>SUBURB</th>
                                <th>SENDER</th>
                                <th>LATEST DELIVERY</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recipients.map((r, i) => (
                                <tr key={i}>
                                    <td><strong>{r.name}</strong></td>
                                    <td>{r.suburb}</td>
                                    <td>{r.sender}</td>
                                    <td>{r.lastDelivery}</td>
                                    <td>
                                        <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.8rem' }}>
                                            View History
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </>
                )}
            </table>
        </div>
    );
}
