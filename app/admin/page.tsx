"use client";

import React from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import Button from '@/components/ui/Button';

export default function AdminPage() {
    const masterPickList = [
        { item: "Beef Stewing Pieces", weight: "52.5 kg" },
        { item: "Boerewors (Premium)", weight: "38.0 kg" },
        { item: "T-Bone Steak", weight: "24.0 kg" },
        { item: "Chicken Portions", weight: "45.0 kg" },
        { item: "Pork Chops", weight: "15.5 kg" },
    ];

    const activeDeliveries = [
        { id: "ORD-001", recipient: "Mrs. Moyo", suburb: "Mabelreign", pack: "Family Pack", frequency: "Weekly" },
        { id: "ORD-002", recipient: "Tinashe's Gogo", suburb: "Avondale", pack: "Gogo Pack", frequency: "Weekly" },
        { id: "ORD-003", recipient: "S. Nyoni", suburb: "Westgate", pack: "Braai Pack", frequency: "Monthly" },
        { id: "ORD-004", recipient: "J. Mutasa", suburb: "Borrowdale", pack: "Family Pack", frequency: "Weekly" },
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <span className={styles.label}>Back-Office Dashboard</span>
                    <h1>Butcher Command Center</h1>
                </div>
                <nav className={styles.adminNav}>
                    <Link href="/admin/reports" className={styles.navLink}>Reports</Link>
                    <Link href="/admin/accounts" className={styles.navLink}>Accounts</Link>
                    <Link href="/admin/finances" className={styles.navLink}>Finances</Link>
                    <Button variant="primary" style={{ marginLeft: '1rem' }}>Process Next Batch</Button>
                </nav>
            </header>

            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <span className={styles.label}>Monthly Revenue</span>
                    <div className={styles.value}>$12,450.00</div>
                    <div className={styles.statSub}>+15% from last month</div>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.label}>Active Senders</span>
                    <div className={styles.value}>142</div>
                    <div className={styles.statSub}>Diaspora community</div>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.label}>Total Meat Weight</span>
                    <div className={styles.value}>175.0 kg</div>
                    <div className={styles.statSub}>Next Wednesday batch</div>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.label}>Pending EFTs</span>
                    <div className={styles.value}>12</div>
                    <Link href="/admin/finances" className={styles.actionLink}>Approve Receipts →</Link>
                </div>
            </div>

            <div className={styles.grid}>
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h3>Master Pick List</h3>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Delivery Day: Wednesday</span>
                    </div>
                    <div className={styles.weightContent}>
                        {masterPickList.map((item, i) => (
                            <div key={i} className={styles.weightItem}>
                                <span>{item.item}</span>
                                <span>{item.weight}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                        <Button fullWidth variant="secondary">Export to Excel</Button>
                    </div>
                </div>

                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h3>Wednesday Dispatch List</h3>
                    </div>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Recipient</th>
                                <th>Suburb</th>
                                <th>Pack</th>
                                <th>Frequency</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeDeliveries.map((delivery) => (
                                <tr key={delivery.id}>
                                    <td><strong>{delivery.recipient}</strong></td>
                                    <td>{delivery.suburb}</td>
                                    <td>{delivery.pack}</td>
                                    <td>
                                        <span className={delivery.frequency === 'Weekly' ? styles.badgeWeekly : styles.badgeMonthly}>
                                            {delivery.frequency}
                                        </span>
                                    </td>
                                    <td>
                                        <button className={styles.btn}>Print Label</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
