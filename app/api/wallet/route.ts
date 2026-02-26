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

        // Determine which wallet field to update based on currency
        const curr = (currency || 'USD').toUpperCase();
        const walletField = curr === 'ZAR' ? 'walletZAR' : curr === 'GBP' ? 'walletGBP' : 'walletUSD';

        // Update the specific currency wallet in MongoDB
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                [walletField]: { increment: parsedAmount }
            }
        });

        // Record the deposit transaction
        await prisma.transaction.create({
            data: {
                userId,
                amount: parsedAmount,
                type: 'DEPOSIT',
                description: `Wallet top-up via ${provider || 'stripe'} (${curr})`,
                reference: `DEP-${Date.now().toString(36).toUpperCase()}`
            }
        });

        console.log(`[Wallet] ${updatedUser.name} topped up ${curr} ${parsedAmount} via ${provider}. Balances: USD=${updatedUser.walletUSD} ZAR=${updatedUser.walletZAR} GBP=${updatedUser.walletGBP}`);

        return NextResponse.json({
            success: true,
            walletUSD: updatedUser.walletUSD,
            walletZAR: updatedUser.walletZAR,
            walletGBP: updatedUser.walletGBP,
            message: `Successfully added ${curr} ${parsedAmount} to your wallet.`
        });
    } catch (error) {
        console.error('Wallet top-up error:', error);
        return NextResponse.json({ success: false, error: 'Failed to process top-up' }, { status: 500 });
    }
}
