import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { amount, currency, userId, provider } = body;

        if (!amount || !userId || userId === 'guest') {
            return NextResponse.json({ success: false, error: 'Missing amount or user ID' }, { status: 400 });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
        }

        // Update wallet balance in MongoDB
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                walletBalance: { increment: parsedAmount }
            }
        });

        // Record the deposit transaction
        await prisma.transaction.create({
            data: {
                userId,
                amount: parsedAmount,
                type: 'DEPOSIT',
                description: `Wallet top-up via ${provider || 'stripe'} (${(currency || 'USD').toUpperCase()})`,
                reference: `DEP-${Date.now().toString(36).toUpperCase()}`
            }
        });

        console.log(`[Wallet] ${updatedUser.name} topped up ${currency || 'USD'} ${parsedAmount} via ${provider}. New balance: ${updatedUser.walletBalance}`);

        return NextResponse.json({
            success: true,
            newBalance: updatedUser.walletBalance,
            message: `Successfully added ${parsedAmount} to your wallet.`
        });
    } catch (error) {
        console.error('Wallet top-up error:', error);
        return NextResponse.json({ success: false, error: 'Failed to process top-up' }, { status: 500 });
    }
}
