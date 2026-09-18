import type { Payment } from '@prisma/client';
import { getPrisma } from '@/lib/prisma';
import { handleOrderPaymentCompleted } from '@/lib/order-fulfillment';

export type SettledStatus = 'COMPLETED' | 'FAILED' | 'EXPIRED';

/**
 * Move a PENDING payment to a final status exactly once and run the
 * side effects (wallet credit / order fulfilment). Both the ZB callback and
 * the return-page status poll go through here, so the PENDING → final
 * transition is claimed atomically to avoid double-crediting.
 */
export async function settlePayment(paymentId: string, status: SettledStatus, evidence: unknown): Promise<Payment | null> {
    const db = getPrisma();
    if (!db) return null;

    const claimed = await db.payment.updateMany({
        where: { id: paymentId, status: 'PENDING' },
        data: {
            status,
            callbackData: JSON.stringify(evidence ?? null),
        },
    });

    const payment = await db.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return null;

    if (claimed.count === 0) {
        // Already settled by another request; make sure fulfilment ran.
        if (payment.status === 'COMPLETED' && payment.purpose === 'ORDER') {
            await handleOrderPaymentCompleted(payment.id);
            return db.payment.findUnique({ where: { id: paymentId } });
        }
        return payment;
    }

    console.log(`[Payments] Payment ${payment.id} → ${status}`);

    if (status !== 'COMPLETED') return payment;

    if (payment.purpose === 'WALLET_TOPUP') {
        const curr = payment.currency.toUpperCase();
        const walletField = curr === 'ZAR' ? 'walletZAR' : curr === 'GBP' ? 'walletGBP' : 'walletUSD';

        await db.user.update({
            where: { id: payment.userId },
            data: { [walletField]: { increment: payment.amount } },
        });

        await db.transaction.create({
            data: {
                userId: payment.userId,
                amount: payment.amount,
                type: 'DEPOSIT',
                description: `Wallet top-up via ZB Smile & Pay (${curr})`,
                reference: `ZB-${payment.orderReference || payment.id.slice(-6)}`,
            },
        });

        console.log(`[Payments] Wallet credited: ${curr} ${payment.amount} for user ${payment.userId}`);
        return payment;
    }

    await handleOrderPaymentCompleted(payment.id);
    return db.payment.findUnique({ where: { id: paymentId } });
}
