"use client";

import React from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function ReportsPage() {
    const weeklyRevenue = [40, 65, 50, 85, 95, 120, 110]; // Mock height percentages
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className={styles.container}>
            <Link href="/admin" className={styles.backLink}>
                ← Back to Command Center
            </Link>

            <header className={styles.header}>
                <h1 className={styles.title}>Marketing & Growth Reports</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <select className={styles.select}>
                        <option>Last 30 Days</option>
                        <option>Year to Date</option>
                    </select>
                </div>
            </header>

            <div className={styles.grid}>
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Sales Velocity (All Currencies)</h3>
                    <div className={styles.chartPlaceholder}>
                        {weeklyRevenue.map((val, i) => (
                            <div
                                key={i}
                                className={styles.bar}
                                style={{ height: `${val}%` }}
                                title={`${days[i]}: $${val * 100}`}
                            />
                        ))}
                    </div>
                    <div className={styles.legend}>
                        {days.map(d => <span key={d}>{d}</span>)}
                    </div>
                </div>

                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Unit Performance</h3>
                    <div className={styles.statsGrid}>
                        <div className={styles.miniStat}>
                            <span className={styles.miniLabel}>Avg Order Value</span>
                            <div className={styles.miniValue}>$89.50</div>
                            <span className={`${styles.miniLabel} ${styles.positive}`}>+5.2%</span>
                        </div>
                        <div className={styles.miniStat}>
                            <span className={styles.miniLabel}>Conversion Rate</span>
                            <div className={styles.miniValue}>3.8%</div>
                            <span className={`${styles.miniLabel} ${styles.negative}`}>-0.4%</span>
                        </div>
                        <div className={styles.miniStat}>
                            <span className={styles.miniLabel}>Total Subscriptions</span>
                            <div className={styles.miniValue}>284</div>
                            <span className={`${styles.miniLabel} ${styles.positive}`}>+12 New</span>
                        </div>
                        <div className={styles.miniStat}>
                            <span className={styles.miniLabel}>Churn Rate</span>
                            <div className={styles.miniValue}>1.2%</div>
                            <span className={`${styles.miniLabel} ${styles.positive}`}>Very Low</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Top Performing Hamper Packs</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                            <th style={{ padding: '1rem 0' }}>HAMPER</th>
                            <th>UNITS SOLD</th>
                            <th>REVENUE (USD)</th>
                            <th>GROWTH</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { name: 'Family Feast', units: 142, rev: 12070, grow: '+18%' },
                            { name: 'Gogo Pack', units: 98, rev: 4410, grow: '+5%' },
                            { name: 'Braai Master', units: 44, rev: 5280, grow: '+25%' },
                        ].map((p, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                                <td style={{ padding: '1rem 0' }}><strong>{p.name}</strong></td>
                                <td>{p.units}</td>
                                <td>${p.rev.toLocaleString()}</td>
                                <td className={styles.positive}>{p.grow}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
