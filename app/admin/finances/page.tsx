"use client";

import React from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import Button from '@/components/ui/Button';

export default function FinancesPage() {
    const pendingEFTs = [
        { sender: "Tafara Makunura", amount: "R1,200.00", date: "2 Hours ago", ref: "MLZ-TAFARA-M" },
        { sender: "Sarah Jenkins", amount: "$85.00", date: "5 Hours ago", ref: "MLZ-JENK-S" },
        { sender: "John Doe", amount: "£50.00", date: "Yesterday", ref: "MLZ-DOE-J" },
    ];

    const transactions = [
        { type: "Credit", user: "Bruce Wayne", amount: "+$1,200.00", method: "Stripe", date: "2026-02-01 14:20" },
        { type: "Debit", user: "Mrs. Moyo (Tafara)", amount: "-$45.00", method: "Weekly Delivery", date: "2026-02-01 10:00" },
        { type: "Credit", user: "Sarah Jenkins", amount: "+R1,600.00", method: "Manual EFT", date: "2026-01-31 18:45" },
        { type: "Debit", user: "Gogo Jenkins (Sarah)", amount: "-$85.00", method: "Monthly Subscription", date: "2026-01-31 09:12" },
    ];

    return (
        <div className={styles.container}>
            <Link href="/admin" className={styles.backLink}>
                ← Back to Command Center
            </Link>

            <header className={styles.header}>
                <h1 className={styles.title}>Financial Ledger & EFT Approvals</h1>
            </header>

            <div className={styles.grid}>
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h3>Global Transaction History</h3>
                    </div>
                    <table className={styles.ledgerTable}>
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>USER/RECIPIENT</th>
                                <th>METHOD</th>
                                <th>AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx, i) => (
                                <tr key={i}>
                                    <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{tx.date}</td>
                                    <td><strong>{tx.user}</strong></td>
                                    <td>{tx.method}</td>
                                    <td className={`${styles.currency} ${tx.type === 'Credit' ? styles.credit : styles.debit}`}>
                                        {tx.amount}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <Button variant="secondary">Download Monthly Statement (PDF)</Button>
                    </div>
                </div>

                <aside className={styles.panel}>
                    <div className={styles.panelHeader} style={{ background: 'var(--primary)', color: '#000' }}>
                        <h3 style={{ color: '#000' }}>Pending EFT Approvals ({pendingEFTs.length})</h3>
                    </div>
                    <div className={styles.receiptsList}>
                        {pendingEFTs.map((eft, i) => (
                            <div key={i} className={styles.receiptCard}>
                                <div className={styles.receiptThumb}>📄</div>
                                <div className={styles.receiptInfo}>
                                    <h4>{eft.sender}</h4>
                                    <p>Ref: {eft.ref} • {eft.date}</p>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--primary)' }}>
                                        {eft.amount}
                                    </div>
                                    <div className={styles.actions}>
                                        <button className={styles.approveBtn}>Confirm Deposit</button>
                                        <button className={styles.rejectBtn}>Reject</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
}
