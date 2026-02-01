import { NextResponse } from 'next/server';
import { paymentService } from '@/lib/payments';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { amount, currency, userId, provider } = body;

        // Create a payment session
        const session = await paymentService.createPaymentSession({
            amount,
            currency,
            userId,
            provider
        });

        return NextResponse.json(session);
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to initiate payment' }, { status: 500 });
    }
}
