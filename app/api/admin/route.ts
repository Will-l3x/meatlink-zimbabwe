import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Fetch all users
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                walletUSD: true,
                walletZAR: true,
                walletGBP: true,
                walletBalance: true,
                createdAt: true,
            }
        });

        // Fetch all recipients
        const recipients = await prisma.recipient.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                subscriptions: {
                    include: { sender: { select: { name: true } } }
                }
            }
        });

        // Fetch all subscriptions
        const subscriptions = await prisma.subscription.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { name: true, email: true } },
                recipient: { select: { name: true, suburb: true, whatsapp: true } },
            }
        });

        // Fetch all transactions
        const transactions = await prisma.transaction.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true } }
            },
            take: 50
        });

        // Calculate stats
        const totalRevenue = transactions
            .filter(t => t.type === 'DEPOSIT')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalDeductions = transactions
            .filter(t => t.type === 'DEDUCTION')
            .reduce((sum, t) => sum + t.amount, 0);

        const senders = users.filter(u => u.role === 'SENDER');
        const admins = users.filter(u => u.role === 'ADMIN');

        return NextResponse.json({
            success: true,
            stats: {
                totalUsers: users.length,
                totalSenders: senders.length,
                totalAdmins: admins.length,
                totalRecipients: recipients.length,
                totalSubscriptions: subscriptions.length,
                activeSubscriptions: subscriptions.filter(s => s.isActive).length,
                totalRevenue,
                totalDeductions,
                totalTransactions: transactions.length,
            },
            users,
            recipients: recipients.map(r => ({
                ...r,
                senderName: r.subscriptions?.[0]?.sender?.name || 'N/A'
            })),
            subscriptions,
            transactions
        });
    } catch (error) {
        console.error('Admin data error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load admin data' }, { status: 500 });
    }
}
