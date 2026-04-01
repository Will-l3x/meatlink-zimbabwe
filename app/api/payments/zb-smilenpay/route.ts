import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { paymentService } from '@/lib/payments';

/**
 * POST /api/payments/zb-smilenpay
 * Initiate a ZB Smile & Pay payment session
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { amount, currency, userId, purpose, description, metadata } = body;

        // Validate
        if (!amount || !userId || !currency) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: amount, currency, userId' },
                { status: 400 }
            );
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid amount' },
                { status: 400 }
            );
        }

        // Generate a unique order reference
        const orderRef = `ML-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        // 1. Create a Payment record in PENDING state
        const payment = await prisma.payment.create({
            data: {
                userId,
                amount: parsedAmount,
                currency: currency.toUpperCase(),
                provider: 'zb_smilenpay',
                status: 'PENDING',
                purpose: purpose === 'WALLET_TOPUP' ? 'WALLET_TOPUP' : 'ORDER',
                orderReference: orderRef,
                metadata: metadata ? JSON.stringify(metadata) : null,
            }
        });

        console.log(`[ZB Payment] Created record: ${payment.id} | ${currency} ${parsedAmount} | Ref: ${orderRef}`);

        // 2. Call the real ZB API to initiate the transaction
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const zbResult = await paymentService.initiateTransaction({
            orderReference: orderRef,
            amount: parsedAmount,
            currencyCode: currency.toUpperCase(),
            returnUrl: `${baseUrl}/checkout/zb-return?paymentId=${payment.id}&orderRef=${orderRef}`,
            resultUrl: `${baseUrl}/api/payments/zb-smilenpay/callback`,
            cancelUrl: `${baseUrl}/checkout/zb-return?paymentId=${payment.id}&status=cancelled`,
            failureUrl: `${baseUrl}/checkout/zb-return?paymentId=${payment.id}&status=failed`,
            itemName: description || 'MeatLink Zimbabwe Order',
            itemDescription: description || 'Payment for MeatLink Zimbabwe',
        });

        if (!zbResult.success) {
            await prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'FAILED' }
            });

            return NextResponse.json(
                { success: false, error: zbResult.error || 'Failed to initiate ZB payment' },
                { status: 500 }
            );
        }

        // 3. Store the ZB references
        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                externalRef: zbResult.transactionReference,
                paymentUrl: zbResult.paymentUrl,
            }
        });

        console.log(`[ZB Payment] Session created → URL: ${zbResult.paymentUrl}`);

        return NextResponse.json({
            success: true,
            paymentId: payment.id,
            checkoutUrl: zbResult.paymentUrl,
            transactionReference: zbResult.transactionReference,
            orderReference: orderRef,
        });

    } catch (error) {
        console.error('[ZB Payment] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process ZB payment request' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/payments/zb-smilenpay?paymentId=xxx
 * Check the status of a payment (polls ZB then updates local record)
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const paymentId = searchParams.get('paymentId');

        if (!paymentId) {
            return NextResponse.json(
                { success: false, error: 'Missing paymentId' },
                { status: 400 }
            );
        }

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId }
        });

        if (!payment) {
            return NextResponse.json(
                { success: false, error: 'Payment not found' },
                { status: 404 }
            );
        }

        // If payment is still pending, poll ZB for the latest status
        if (payment.status === 'PENDING' && payment.orderReference) {
            const zbStatus = await paymentService.checkTransactionStatus(payment.orderReference);

            if (zbStatus.success && zbStatus.status) {
                const normalizedStatus = zbStatus.status.toUpperCase();
                let newStatus = payment.status;

                if (['SUCCESS', 'PAID'].includes(normalizedStatus)) {
                    newStatus = 'COMPLETED';
                } else if (['FAILED', 'CANCELLED'].includes(normalizedStatus)) {
                    newStatus = 'FAILED';
                }

                if (newStatus !== payment.status) {
                    await prisma.payment.update({
                        where: { id: paymentId },
                        data: {
                            status: newStatus,
                            callbackData: JSON.stringify(zbStatus.data),
                        }
                    });

                    // If completed and purpose is wallet top-up, credit the wallet
                    if (newStatus === 'COMPLETED' && payment.purpose === 'WALLET_TOPUP') {
                        const curr = payment.currency.toUpperCase();
                        const walletField = curr === 'ZAR' ? 'walletZAR' : curr === 'GBP' ? 'walletGBP' : 'walletUSD';

                        await prisma.user.update({
                            where: { id: payment.userId },
                            data: { [walletField]: { increment: payment.amount } }
                        });

                        await prisma.transaction.create({
                            data: {
                                userId: payment.userId,
                                amount: payment.amount,
                                type: 'DEPOSIT',
                                description: `Wallet top-up via ZB Smile & Pay (${curr})`,
                                reference: `ZB-${payment.orderReference}`,
                            }
                        });

                        console.log(`[ZB Payment] Wallet credited: ${curr} ${payment.amount} for user ${payment.userId}`);
                    }

                    return NextResponse.json({
                        success: true,
                        payment: {
                            id: payment.id,
                            status: newStatus,
                            amount: payment.amount,
                            currency: payment.currency,
                            purpose: payment.purpose,
                            orderReference: payment.orderReference,
                        }
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                amount: payment.amount,
                currency: payment.currency,
                purpose: payment.purpose,
                orderReference: payment.orderReference,
            }
        });

    } catch (error) {
        console.error('[ZB Payment] Status check error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to check payment status' },
            { status: 500 }
        );
    }
}
