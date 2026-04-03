import { NextResponse } from 'next/server';
import { paymentService } from '@/lib/payments';

// Dynamic import for prisma to handle case where Payment model isn't generated yet
let prismaClient: any = null;
async function getPrisma() {
    if (!prismaClient) {
        try {
            const mod = await import('@/lib/prisma');
            prismaClient = mod.prisma;
        } catch (e) {
            console.warn('[ZB Payment] Prisma not available:', e);
        }
    }
    return prismaClient;
}

/**
 * POST /api/payments/zb-smilenpay
 * Initiate a ZB Smile & Pay payment session
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { amount, currency, userId, purpose, description, metadata } = body;

        console.log('[ZB Payment] Received request:', JSON.stringify({ amount, currency, userId, purpose }));

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
        const orderRef = `ML-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        // Dynamically compute Base URL
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3002';
        const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
        const baseUrl = `${protocol}://${host}`;

        // Try to save to database first (if Payment model is available)
        let paymentId: string | null = null;
        const prisma = await getPrisma();

        if (prisma) {
            try {
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
                paymentId = payment.id;
                console.log(`[ZB Payment] DB record created: ${paymentId}`);
            } catch (dbError: any) {
                console.warn('[ZB Payment] DB write failed (Payment model may not exist yet):', dbError.message);
                // Continue without DB — we can still call ZB API
            }
        }

        // Call the real ZB API to initiate the transaction
        console.log(`[ZB Payment] Calling ZB API: ${currency.toUpperCase()} ${parsedAmount} | Ref: ${orderRef}`);

        const zbResult = await paymentService.initiateTransaction({
            orderReference: orderRef,
            amount: parsedAmount,
            currencyCode: currency.toUpperCase(),
            returnUrl: `${baseUrl}/checkout/zb-return?paymentId=${paymentId || 'none'}&orderRef=${orderRef}`,
            resultUrl: `${baseUrl}/api/payments/zb-smilenpay/callback`,
            cancelUrl: `${baseUrl}/checkout/zb-return?paymentId=${paymentId || 'none'}&status=cancelled`,
            failureUrl: `${baseUrl}/checkout/zb-return?paymentId=${paymentId || 'none'}&status=failed`,
            itemName: description || 'MeatLink Zimbabwe Order',
            itemDescription: description || 'Payment for MeatLink Zimbabwe',
            firstName: body.firstName || 'MeatLink',
            lastName: body.lastName || 'Customer',
            email: body.email || 'support@meatlink.co.zw',
            mobilePhoneNumber: body.mobilePhoneNumber || '0770000000',
        });

        console.log('[ZB Payment] ZB API response:', JSON.stringify(zbResult));

        if (!zbResult.success) {
            // Update DB record to FAILED if we have one
            if (paymentId && prisma) {
                try {
                    await prisma.payment.update({
                        where: { id: paymentId },
                        data: { status: 'FAILED' }
                    });
                } catch (e) { /* ignore */ }
            }

            return NextResponse.json(
                { success: false, error: zbResult.error || 'Failed to initiate ZB payment' },
                { status: 502 }
            );
        }

        // Update DB record with ZB references
        const finalOrderRef = zbResult.actualOrderReference || orderRef;
        if (paymentId && prisma) {
            try {
                await prisma.payment.update({
                    where: { id: paymentId },
                    data: {
                        externalRef: zbResult.transactionReference,
                        paymentUrl: zbResult.paymentUrl,
                        orderReference: finalOrderRef,
                    }
                });
            } catch (e) { /* ignore */ }
        }

        console.log(`[ZB Payment] ✅ Session created → URL: ${zbResult.paymentUrl}`);

        return NextResponse.json({
            success: true,
            paymentId: paymentId || finalOrderRef,
            checkoutUrl: zbResult.paymentUrl,
            transactionReference: zbResult.transactionReference,
            orderReference: finalOrderRef,
        });

    } catch (error: any) {
        console.error('[ZB Payment] Error:', error.message, error.stack);
        return NextResponse.json(
            { success: false, error: `Failed to process ZB payment: ${error.message}` },
            { status: 500 }
        );
    }
}

/**
 * GET /api/payments/zb-smilenpay?paymentId=xxx&orderRef=xxx
 * Check the status of a payment
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const paymentId = searchParams.get('paymentId');
        const orderRef = searchParams.get('orderRef');

        // Try to check via ZB API directly using order reference
        if (orderRef) {
            const zbStatus = await paymentService.checkTransactionStatus(orderRef);
            console.log('[ZB Payment] Status check:', JSON.stringify(zbStatus));

            if (zbStatus.success) {
                const normalizedStatus = (zbStatus.status || '').toUpperCase();
                let mappedStatus = 'PENDING';

                if (['SUCCESS', 'PAID', 'COMPLETED'].includes(normalizedStatus)) {
                    mappedStatus = 'COMPLETED';
                } else if (['FAILED', 'CANCELLED'].includes(normalizedStatus)) {
                    mappedStatus = 'FAILED';
                }

                // Try to update DB if available
                const prisma = await getPrisma();
                if (prisma && paymentId && paymentId !== 'none') {
                    try {
                        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
                        if (payment && payment.status === 'PENDING' && mappedStatus !== 'PENDING') {
                            await prisma.payment.update({
                                where: { id: paymentId },
                                data: {
                                    status: mappedStatus,
                                    callbackData: JSON.stringify(zbStatus.data),
                                }
                            });

                            // Credit wallet on successful top-up
                            if (mappedStatus === 'COMPLETED' && payment.purpose === 'WALLET_TOPUP') {
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
                                        reference: `ZB-${orderRef}`,
                                    }
                                });
                            }
                        }
                    } catch (e) { /* DB not available */ }
                }

                return NextResponse.json({
                    success: true,
                    payment: {
                        id: paymentId || orderRef,
                        status: mappedStatus,
                        orderReference: orderRef,
                        zbData: zbStatus.data,
                    }
                });
            }
        }

        // Fallback: check DB directly
        if (paymentId && paymentId !== 'none') {
            const prisma = await getPrisma();
            if (prisma) {
                try {
                    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
                    if (payment) {
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
                    }
                } catch (e) { /* DB not available */ }
            }
        }

        return NextResponse.json({
            success: false,
            error: 'Payment not found',
        }, { status: 404 });

    } catch (error: any) {
        console.error('[ZB Payment] Status check error:', error.message);
        return NextResponse.json(
            { success: false, error: `Status check failed: ${error.message}` },
            { status: 500 }
        );
    }
}
