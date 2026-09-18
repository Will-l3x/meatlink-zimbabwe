import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';

/**
 * POST /api/wallet — manual wallet credit (admin only).
 * Customer self-service top-ups go through ZB Smile & Pay instead.
 */
export async function POST(request: Request) {
    const guard = requireAdmin(request);
    if (guard.response) return guard.response;

    try {
        const body = await request.json();
        const { amount, currency, userId, provider } = body;

        if (!amount || !userId || userId === 'guest') {
            return NextResponse.json({ success: false, error: 'Missing amount or user ID' }, { status: 400 });
        }

        const db = getPrisma();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Wallet service is temporarily unavailable' }, { status: 503 });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
        }

        const curr = (currency || 'USD').toUpperCase();
        const walletField = curr === 'ZAR' ? 'walletZAR' : curr === 'GBP' ? 'walletGBP' : 'walletUSD';

        const updatedUser = await db.user.update({
            where: { id: userId },
            data: {
                [walletField]: { increment: parsedAmount }
            }
        });

        await db.transaction.create({
            data: {
                userId,
                amount: parsedAmount,
                type: 'DEPOSIT',
                description: `Wallet credit via ${provider || 'manual adjustment'} (${curr}) by admin ${guard.session.uid}`,
                reference: `DEP-${Date.now().toString(36).toUpperCase()}`
            }
        });

        console.log(`[Wallet] ${updatedUser.name} credited ${curr} ${parsedAmount} via ${provider || 'manual'} by admin ${guard.session.uid}`);

        return NextResponse.json({
            success: true,
            walletUSD: updatedUser.walletUSD,
            walletZAR: updatedUser.walletZAR,
            walletGBP: updatedUser.walletGBP,
            message: `Successfully added ${curr} ${parsedAmount} to the wallet.`
        });
    } catch (error) {
        console.error('Wallet credit error:', error);
        return NextResponse.json({ success: false, error: 'Failed to process wallet credit' }, { status: 500 });
    }
}
