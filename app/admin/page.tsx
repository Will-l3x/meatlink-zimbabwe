"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

type Tab = 'overview' | 'orders' | 'users' | 'subscriptions' | 'finances';

interface OrderDelivery {
    id: string;
    status: string;
    scheduledDate: string;
    deliveredAt: string | null;
    createdAt: string;
    recipient: {
        name: string;
        whatsapp: string;
        suburb: string;
        address: string;
    };
    subscription: {
        sender: { name: string; email: string };
        hamper: { name: string } | null;
    };
}

interface OrdersData {
    grouped: {
        incoming: OrderDelivery[];
        onRoute: OrderDelivery[];
        delivered: OrderDelivery[];
        delayed: OrderDelivery[];
    };
    counts: {
        total: number;
        incoming: number;
        onRoute: number;
        delivered: number;
        delayed: number;
    };
}

interface AdminData {
    stats: {
        totalUsers: number;
        totalSenders: number;
        totalAdmins: number;
        totalRecipients: number;
        totalSubscriptions: number;
        activeSubscriptions: number;
        totalRevenue: number;
        totalDeductions: number;
        totalTransactions: number;
    };
    users: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        walletUSD: number;
        walletZAR: number;
        walletGBP: number;
        createdAt: string;
    }>;
    recipients: Array<{
        id: string;
        name: string;
        whatsapp: string;
        suburb: string;
        address: string;
        senderName: string;
        createdAt: string;
    }>;
    subscriptions: Array<{
        id: string;
        frequency: string;
        isActive: boolean;
        nextDelivery: string;
        createdAt: string;
        sender: { name: string; email: string };
        recipient: { name: string; suburb: string; whatsapp: string };
    }>;
    transactions: Array<{
        id: string;
        amount: number;
        type: string;
        description: string;
        reference: string;
        createdAt: string;
        user: { name: string };
    }>;
}

export default function AdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [userFilter, setUserFilter] = useState<'all' | 'SENDER' | 'ADMIN'>('all');
    const [txFilter, setTxFilter] = useState<'all' | 'DEPOSIT' | 'DEDUCTION'>('all');
    const [ordersData, setOrdersData] = useState<OrdersData | null>(null);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [batchMessage, setBatchMessage] = useState('');

    useEffect(() => {
        // Check admin auth
        const storedUser = localStorage.getItem('hexad_user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        const user = JSON.parse(storedUser);
        if (user.role !== 'ADMIN') {
            alert('Access denied. Admin privileges required.');
            router.push('/dashboard');
            return;
        }

        fetchData();
        fetchOrders();
    }, [router]);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/admin');
            const result = await res.json();
            if (result.success) {
                setData(result);
            } else {
                setError(result.error || 'Failed to load data');
            }
        } catch (err) {
            setError('Network error — could not reach server');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        setOrdersLoading(true);
        try {
            const res = await fetch('/api/orders');
            const result = await res.json();
            if (result.success) {
                setOrdersData(result);
            }
        } catch (err) {
            console.error('Orders fetch error:', err);
        } finally {
            setOrdersLoading(false);
        }
    };

    const generateBatch = async () => {
        setBatchMessage('');
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate_batch' })
            });
            const result = await res.json();
            if (result.success) {
                setBatchMessage(result.message);
                fetchOrders();
            } else {
                setBatchMessage('Failed: ' + result.error);
            }
        } catch (err) {
            setBatchMessage('Network error');
        }
    };

    const updateOrderStatus = async (deliveryId: string, status: string) => {
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_status', deliveryId, status })
            });
            const result = await res.json();
            if (result.success) {
                fetchOrders();
            }
        } catch (err) {
            console.error('Status update error:', err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('hexad_user');
        router.push('/login');
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatShortDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short'
        });
    };

    if (loading) {
        return (
            <div className={styles.loadingScreen}>
                <div className={styles.spinner} />
                <p>Loading admin data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.loadingScreen}>
                <p style={{ color: 'var(--error)' }}>❌ {error}</p>
                <button className={styles.retryBtn} onClick={() => { setLoading(true); setError(''); fetchData(); }}>
                    Retry
                </button>
            </div>
        );
    }

    if (!data) return null;

    const filteredUsers = data.users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = userFilter === 'all' || u.role === userFilter;
        return matchesSearch && matchesFilter;
    });

    const filteredTx = data.transactions.filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.user.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = txFilter === 'all' || t.type === txFilter;
        return matchesSearch && matchesFilter;
    });

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'overview', label: 'Overview', icon: '📊' },
        { key: 'orders', label: 'Orders', icon: '🚚' },
        { key: 'users', label: 'Users', icon: '👥' },
        { key: 'subscriptions', label: 'Subscriptions', icon: '📦' },
        { key: 'finances', label: 'Finances', icon: '💰' },
    ];

    return (
        <div className={styles.adminLayout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>
                    <span className={styles.logoIcon}>🥩</span>
                    <div>
                        <div className={styles.logoTitle}>Hexad</div>
                        <div className={styles.logoSub}>Admin Panel</div>
                    </div>
                </div>

                <nav className={styles.sidebarNav}>
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`${styles.sidebarLink} ${activeTab === tab.key ? styles.sidebarLinkActive : ''}`}
                            onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
                        >
                            <span className={styles.sidebarIcon}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <button className={styles.sidebarLink} onClick={handleLogout}>
                        <span className={styles.sidebarIcon}>🚪</span>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.mainContent}>
                {/* ===== OVERVIEW TAB ===== */}
                {activeTab === 'overview' && (
                    <>
                        <header className={styles.pageHeader}>
                            <div>
                                <h1>Command Center</h1>
                                <p className={styles.subtitle}>Real-time overview of Hexad Market operations</p>
                            </div>
                            <button className={styles.refreshBtn} onClick={() => { setLoading(true); fetchData(); }}>
                                🔄 Refresh
                            </button>
                        </header>

                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>👥</div>
                                <div className={styles.statInfo}>
                                    <span className={styles.statLabel}>Total Users</span>
                                    <div className={styles.statValue}>{data.stats.totalUsers}</div>
                                    <span className={styles.statMeta}>{data.stats.totalSenders} senders • {data.stats.totalAdmins} admins</span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>🏠</div>
                                <div className={styles.statInfo}>
                                    <span className={styles.statLabel}>Recipients</span>
                                    <div className={styles.statValue}>{data.stats.totalRecipients}</div>
                                    <span className={styles.statMeta}>Harare families receiving meat</span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>📦</div>
                                <div className={styles.statInfo}>
                                    <span className={styles.statLabel}>Active Subscriptions</span>
                                    <div className={styles.statValue}>{data.stats.activeSubscriptions}</div>
                                    <span className={styles.statMeta}>{data.stats.totalSubscriptions} total created</span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>💵</div>
                                <div className={styles.statInfo}>
                                    <span className={styles.statLabel}>Total Deposits</span>
                                    <div className={styles.statValue}>${data.stats.totalRevenue.toFixed(2)}</div>
                                    <span className={styles.statMeta}>${data.stats.totalDeductions.toFixed(2)} deducted</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.overviewGrid}>
                            {/* Recent Users */}
                            <div className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <h3>Recent Users</h3>
                                    <button className={styles.viewAllBtn} onClick={() => setActiveTab('users')}>View All →</button>
                                </div>
                                <div className={styles.cardBody}>
                                    {data.users.slice(0, 5).map(user => (
                                        <div key={user.id} className={styles.listItem}>
                                            <div className={styles.avatar}>
                                                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div className={styles.listInfo}>
                                                <div className={styles.listName}>{user.name}</div>
                                                <div className={styles.listMeta}>{user.email || 'No email'}</div>
                                            </div>
                                            <span className={`${styles.badge} ${user.role === 'ADMIN' ? styles.badgeAdmin : styles.badgeSender}`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    ))}
                                    {data.users.length === 0 && (
                                        <p className={styles.emptyState}>No users registered yet</p>
                                    )}
                                </div>
                            </div>

                            {/* Recent Transactions */}
                            <div className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <h3>Recent Transactions</h3>
                                    <button className={styles.viewAllBtn} onClick={() => setActiveTab('finances')}>View All →</button>
                                </div>
                                <div className={styles.cardBody}>
                                    {data.transactions.slice(0, 5).map(tx => (
                                        <div key={tx.id} className={styles.listItem}>
                                            <div className={`${styles.txIcon} ${tx.type === 'DEPOSIT' ? styles.txDeposit : styles.txDeduction}`}>
                                                {tx.type === 'DEPOSIT' ? '↗' : '↙'}
                                            </div>
                                            <div className={styles.listInfo}>
                                                <div className={styles.listName}>{tx.user.name}</div>
                                                <div className={styles.listMeta}>{tx.description}</div>
                                            </div>
                                            <span className={`${styles.txAmount} ${tx.type === 'DEPOSIT' ? styles.txAmountPositive : styles.txAmountNegative}`}>
                                                {tx.type === 'DEPOSIT' ? '+' : '-'}${tx.amount.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                    {data.transactions.length === 0 && (
                                        <p className={styles.emptyState}>No transactions yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ===== USERS TAB ===== */}
                {activeTab === 'users' && (
                    <>
                        <header className={styles.pageHeader}>
                            <div>
                                <h1>User Management</h1>
                                <p className={styles.subtitle}>{data.users.length} users registered</p>
                            </div>
                        </header>

                        <div className={styles.toolbar}>
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                            <div className={styles.filterGroup}>
                                {(['all', 'SENDER', 'ADMIN'] as const).map(f => (
                                    <button
                                        key={f}
                                        className={`${styles.filterBtn} ${userFilter === f ? styles.filterBtnActive : ''}`}
                                        onClick={() => setUserFilter(f)}
                                    >
                                        {f === 'all' ? 'All' : f === 'SENDER' ? 'Senders' : 'Admins'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.tableWrapper}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>USD</th>
                                        <th>ZAR</th>
                                        <th>GBP</th>
                                        <th>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(user => (
                                        <tr key={user.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div className={styles.avatar}>
                                                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700 }}>{user.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.badge} ${user.role === 'ADMIN' ? styles.badgeAdmin : styles.badgeSender}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 700 }}>${user.walletUSD.toFixed(2)}</td>
                                            <td style={{ fontWeight: 700 }}>R{user.walletZAR.toFixed(2)}</td>
                                            <td style={{ fontWeight: 700 }}>£{user.walletGBP.toFixed(2)}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatShortDate(user.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && (
                                <p className={styles.emptyState}>No users match your search</p>
                            )}
                        </div>
                    </>
                )}

                {/* ===== SUBSCRIPTIONS TAB ===== */}
                {activeTab === 'subscriptions' && (
                    <>
                        <header className={styles.pageHeader}>
                            <div>
                                <h1>Subscriptions</h1>
                                <p className={styles.subtitle}>{data.stats.activeSubscriptions} active of {data.stats.totalSubscriptions} total</p>
                            </div>
                        </header>

                        <div className={styles.toolbar}>
                            <input
                                type="text"
                                placeholder="Search by sender or recipient..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>

                        {/* Recipients Overview */}
                        <h2 className={styles.sectionTitle}>📍 Recipients in Harare ({data.recipients.length})</h2>
                        <div className={styles.recipientGrid}>
                            {data.recipients.map(r => (
                                <div key={r.id} className={styles.recipientCard}>
                                    <div className={styles.recipientHeader}>
                                        <strong>{r.name}</strong>
                                        <span className={styles.suburb}>{r.suburb}</span>
                                    </div>
                                    <div className={styles.recipientMeta}>
                                        <span>📱 {r.whatsapp}</span>
                                        <span>🔗 Linked by: {r.senderName}</span>
                                    </div>
                                </div>
                            ))}
                            {data.recipients.length === 0 && (
                                <p className={styles.emptyState}>No recipients registered yet</p>
                            )}
                        </div>

                        {/* Subscriptions Table */}
                        <h2 className={styles.sectionTitle} style={{ marginTop: '2rem' }}>📦 Subscription Orders ({data.subscriptions.length})</h2>
                        <div className={styles.tableWrapper}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>Sender</th>
                                        <th>Recipient</th>
                                        <th>Suburb</th>
                                        <th>Frequency</th>
                                        <th>Next Delivery</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.subscriptions
                                        .filter(s =>
                                            s.sender.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            s.recipient.name.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map(sub => (
                                            <tr key={sub.id}>
                                                <td>
                                                    <div style={{ fontWeight: 700 }}>{sub.sender.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub.sender.email}</div>
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{sub.recipient.name}</td>
                                                <td>{sub.recipient.suburb}</td>
                                                <td>
                                                    <span className={`${styles.badge} ${sub.frequency === 'WEEKLY' ? styles.badgeWeekly : styles.badgeMonthly}`}>
                                                        {sub.frequency.replace('_', '-')}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.8rem' }}>{formatShortDate(sub.nextDelivery)}</td>
                                                <td>
                                                    <span className={`${styles.badge} ${sub.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                                                        {sub.isActive ? 'Active' : 'Paused'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                            {data.subscriptions.length === 0 && (
                                <p className={styles.emptyState}>No subscriptions yet</p>
                            )}
                        </div>
                    </>
                )}

                {/* ===== FINANCES TAB ===== */}
                {activeTab === 'finances' && (
                    <>
                        <header className={styles.pageHeader}>
                            <div>
                                <h1>Financial Ledger</h1>
                                <p className={styles.subtitle}>{data.stats.totalTransactions} transactions recorded</p>
                            </div>
                        </header>

                        <div className={styles.financeStats}>
                            <div className={styles.finStatCard}>
                                <span className={styles.finStatLabel}>Total Deposits</span>
                                <div className={styles.finStatValue} style={{ color: 'var(--success)' }}>
                                    +${data.stats.totalRevenue.toFixed(2)}
                                </div>
                            </div>
                            <div className={styles.finStatCard}>
                                <span className={styles.finStatLabel}>Total Deductions</span>
                                <div className={styles.finStatValue} style={{ color: 'var(--error)' }}>
                                    -${data.stats.totalDeductions.toFixed(2)}
                                </div>
                            </div>
                            <div className={styles.finStatCard}>
                                <span className={styles.finStatLabel}>Net Balance</span>
                                <div className={styles.finStatValue}>
                                    ${(data.stats.totalRevenue - data.stats.totalDeductions).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className={styles.toolbar}>
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                            <div className={styles.filterGroup}>
                                {(['all', 'DEPOSIT', 'DEDUCTION'] as const).map(f => (
                                    <button
                                        key={f}
                                        className={`${styles.filterBtn} ${txFilter === f ? styles.filterBtnActive : ''}`}
                                        onClick={() => setTxFilter(f)}
                                    >
                                        {f === 'all' ? 'All' : f === 'DEPOSIT' ? '↗ Deposits' : '↙ Deductions'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.tableWrapper}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>User</th>
                                        <th>Description</th>
                                        <th>Reference</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTx.map(tx => (
                                        <tr key={tx.id}>
                                            <td>
                                                <span className={`${styles.txBadge} ${tx.type === 'DEPOSIT' ? styles.txBadgeDeposit : styles.txBadgeDeduction}`}>
                                                    {tx.type === 'DEPOSIT' ? '↗ IN' : '↙ OUT'}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 700 }}>{tx.user.name}</td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{tx.description}</td>
                                            <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{tx.reference || '—'}</td>
                                            <td>
                                                <span className={tx.type === 'DEPOSIT' ? styles.txAmountPositive : styles.txAmountNegative} style={{ fontWeight: 800 }}>
                                                    {tx.type === 'DEPOSIT' ? '+' : '-'}${tx.amount.toFixed(2)}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(tx.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredTx.length === 0 && (
                                <p className={styles.emptyState}>No transactions match your filters</p>
                            )}
                        </div>
                    </>
                )}

                {/* ===== ORDERS TAB ===== */}
                {activeTab === 'orders' && (
                    <>
                        <header className={styles.pageHeader}>
                            <div>
                                <h1>Orders & Logistics</h1>
                                <p className={styles.subtitle}>Plan, track, and manage weekly deliveries</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className={styles.refreshBtn} onClick={fetchOrders}>🔄 Refresh</button>
                                <button className={styles.generateBtn} onClick={generateBatch}>📦 Generate Next Batch</button>
                            </div>
                        </header>

                        {batchMessage && (
                            <div className={styles.batchNotice}>
                                ✅ {batchMessage}
                            </div>
                        )}

                        {/* Order Counts */}
                        {ordersData && (
                            <div className={styles.orderCounts}>
                                <div className={`${styles.orderCountCard} ${styles.orderCountIncoming}`}>
                                    <span className={styles.orderCountNum}>{ordersData.counts.incoming}</span>
                                    <span className={styles.orderCountLabel}>Incoming</span>
                                </div>
                                <div className={`${styles.orderCountCard} ${styles.orderCountOnRoute}`}>
                                    <span className={styles.orderCountNum}>{ordersData.counts.onRoute}</span>
                                    <span className={styles.orderCountLabel}>On Route</span>
                                </div>
                                <div className={`${styles.orderCountCard} ${styles.orderCountDelivered}`}>
                                    <span className={styles.orderCountNum}>{ordersData.counts.delivered}</span>
                                    <span className={styles.orderCountLabel}>Delivered</span>
                                </div>
                                <div className={`${styles.orderCountCard} ${styles.orderCountDelayed}`}>
                                    <span className={styles.orderCountNum}>{ordersData.counts.delayed}</span>
                                    <span className={styles.orderCountLabel}>Delayed</span>
                                </div>
                            </div>
                        )}

                        {ordersLoading ? (
                            <div className={styles.loadingScreen} style={{ minHeight: '200px' }}>
                                <div className={styles.spinner} />
                                <p>Loading orders...</p>
                            </div>
                        ) : ordersData ? (
                            <div className={styles.kanbanBoard}>
                                {/* Incoming Column */}
                                <div className={styles.kanbanColumn}>
                                    <div className={`${styles.kanbanHeader} ${styles.kanbanHeaderIncoming}`}>
                                        <span>📥 Incoming</span>
                                        <span className={styles.kanbanCount}>{ordersData.counts.incoming}</span>
                                    </div>
                                    <div className={styles.kanbanCards}>
                                        {ordersData.grouped.incoming.map(order => (
                                            <div key={order.id} className={styles.orderCard}>
                                                <div className={styles.orderRecipient}>{order.recipient.name}</div>
                                                <div className={styles.orderMeta}>
                                                    📍 {order.recipient.suburb} • 📱 {order.recipient.whatsapp}
                                                </div>
                                                <div className={styles.orderMeta}>
                                                    🎁 {order.subscription.hamper?.name || 'Pack'}
                                                </div>
                                                <div className={styles.orderMeta}>
                                                    👤 From: {order.subscription.sender.name}
                                                </div>
                                                <div className={styles.orderDate}>
                                                    📅 {formatShortDate(order.scheduledDate)}
                                                </div>
                                                <div className={styles.orderActions}>
                                                    <button className={styles.actionBtnRoute} onClick={() => updateOrderStatus(order.id, 'ON_ROUTE')}>🚚 Dispatch</button>
                                                    <button className={styles.actionBtnDelay} onClick={() => updateOrderStatus(order.id, 'DELAYED')}>⏳ Delay</button>
                                                </div>
                                            </div>
                                        ))}
                                        {ordersData.grouped.incoming.length === 0 && (
                                            <p className={styles.kanbanEmpty}>No incoming orders</p>
                                        )}
                                    </div>
                                </div>

                                {/* On Route Column */}
                                <div className={styles.kanbanColumn}>
                                    <div className={`${styles.kanbanHeader} ${styles.kanbanHeaderOnRoute}`}>
                                        <span>🚚 On Route</span>
                                        <span className={styles.kanbanCount}>{ordersData.counts.onRoute}</span>
                                    </div>
                                    <div className={styles.kanbanCards}>
                                        {ordersData.grouped.onRoute.map(order => (
                                            <div key={order.id} className={styles.orderCard}>
                                                <div className={styles.orderRecipient}>{order.recipient.name}</div>
                                                <div className={styles.orderMeta}>
                                                    📍 {order.recipient.suburb} • {order.recipient.address}
                                                </div>
                                                <div className={styles.orderMeta}>
                                                    🎁 {order.subscription.hamper?.name || 'Pack'}
                                                </div>
                                                <div className={styles.orderDate}>
                                                    📅 {formatShortDate(order.scheduledDate)}
                                                </div>
                                                <div className={styles.orderActions}>
                                                    <button className={styles.actionBtnDeliver} onClick={() => updateOrderStatus(order.id, 'DELIVERED')}>✅ Delivered</button>
                                                    <button className={styles.actionBtnDelay} onClick={() => updateOrderStatus(order.id, 'DELAYED')}>⏳ Delay</button>
                                                </div>
                                            </div>
                                        ))}
                                        {ordersData.grouped.onRoute.length === 0 && (
                                            <p className={styles.kanbanEmpty}>No orders on route</p>
                                        )}
                                    </div>
                                </div>

                                {/* Delivered Column */}
                                <div className={styles.kanbanColumn}>
                                    <div className={`${styles.kanbanHeader} ${styles.kanbanHeaderDelivered}`}>
                                        <span>✅ Delivered</span>
                                        <span className={styles.kanbanCount}>{ordersData.counts.delivered}</span>
                                    </div>
                                    <div className={styles.kanbanCards}>
                                        {ordersData.grouped.delivered.map(order => (
                                            <div key={order.id} className={styles.orderCard}>
                                                <div className={styles.orderRecipient}>{order.recipient.name}</div>
                                                <div className={styles.orderMeta}>
                                                    📍 {order.recipient.suburb}
                                                </div>
                                                <div className={styles.orderMeta}>
                                                    🎁 {order.subscription.hamper?.name || 'Pack'}
                                                </div>
                                                <div className={styles.orderDate} style={{ color: 'var(--success)' }}>
                                                    ✓ {order.deliveredAt ? formatShortDate(order.deliveredAt) : formatShortDate(order.scheduledDate)}
                                                </div>
                                            </div>
                                        ))}
                                        {ordersData.grouped.delivered.length === 0 && (
                                            <p className={styles.kanbanEmpty}>No delivered orders yet</p>
                                        )}
                                    </div>
                                </div>

                                {/* Delayed Column */}
                                <div className={styles.kanbanColumn}>
                                    <div className={`${styles.kanbanHeader} ${styles.kanbanHeaderDelayed}`}>
                                        <span>⏳ Delayed</span>
                                        <span className={styles.kanbanCount}>{ordersData.counts.delayed}</span>
                                    </div>
                                    <div className={styles.kanbanCards}>
                                        {ordersData.grouped.delayed.map(order => (
                                            <div key={order.id} className={styles.orderCard}>
                                                <div className={styles.orderRecipient}>{order.recipient.name}</div>
                                                <div className={styles.orderMeta}>
                                                    📍 {order.recipient.suburb}
                                                </div>
                                                <div className={styles.orderMeta}>
                                                    🎁 {order.subscription.hamper?.name || 'Pack'}
                                                </div>
                                                <div className={styles.orderDate} style={{ color: 'var(--error)' }}>
                                                    ⚠ Scheduled: {formatShortDate(order.scheduledDate)}
                                                </div>
                                                <div className={styles.orderActions}>
                                                    <button className={styles.actionBtnRoute} onClick={() => updateOrderStatus(order.id, 'ON_ROUTE')}>🚚 Retry</button>
                                                    <button className={styles.actionBtnPending} onClick={() => updateOrderStatus(order.id, 'PENDING')}>↩ Reschedule</button>
                                                </div>
                                            </div>
                                        ))}
                                        {ordersData.grouped.delayed.length === 0 && (
                                            <p className={styles.kanbanEmpty}>No delayed orders</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className={styles.emptyState}>Could not load orders data</p>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
