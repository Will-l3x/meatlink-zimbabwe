"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

function ZBReturnContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const paymentId = searchParams.get('paymentId') || '';
    const orderRef = searchParams.get('orderRef') || '';
    const urlStatus = searchParams.get('status') || '';

    const [paymentStatus, setPaymentStatus] = useState<'processing' | 'success' | 'failed'>('processing');
    const [message, setMessage] = useState('Processing your payment...');

    useEffect(() => {
        // If URL says cancelled/failed, show immediately
        if (urlStatus === 'cancelled') {
            setPaymentStatus('failed');
            setMessage('Payment was cancelled.');
            return;
        }
        if (urlStatus === 'failed') {
            setPaymentStatus('failed');
            setMessage('Payment failed. Please try again.');
            return;
        }

        if (!paymentId) {
            setPaymentStatus('failed');
            setMessage('Invalid payment session. No payment ID found.');
            return;
        }

        // Poll our API for status (which in turn polls ZB)
        let attempts = 0;
        const maxAttempts = 15;

        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/payments/zb-smilenpay?paymentId=${paymentId}&orderRef=${orderRef}`);
                const data = await res.json();

                if (data.success && data.payment) {
                    if (data.payment.status === 'COMPLETED') {
                        setPaymentStatus('success');
                        const purposeText = data.payment.purpose === 'WALLET_TOPUP'
                            ? 'Your wallet has been topped up successfully!'
                            : 'Your order payment has been confirmed!';
                        setMessage(purposeText);

                        // Update local storage wallet balances if it was a top-up
                        if (data.payment.purpose === 'WALLET_TOPUP') {
                            const storedUser = localStorage.getItem('hexad_user');
                            if (storedUser) {
                                const user = JSON.parse(storedUser);
                                const curr = data.payment.currency;
                                const walletKey = curr === 'ZAR' ? 'walletZAR' : curr === 'GBP' ? 'walletGBP' : 'walletUSD';
                                user[walletKey] = (user[walletKey] || 0) + data.payment.amount;
                                localStorage.setItem('hexad_user', JSON.stringify(user));
                            }
                        } else {
                            // Automatically process the pending subscription/order
                            const pendingStr = localStorage.getItem('hexad_pending_zb_order');
                            if (pendingStr) {
                                try {
                                    const pendingOrder = JSON.parse(pendingStr);
                                    fetch('/api/subscribe', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            ...pendingOrder,
                                            hamperId: pendingOrder.cartItems?.map((i: any) => i.id).join('+') || 'unknown',
                                            hamperName: pendingOrder.cartItems?.map((i: any) => `${i.title} (${i.kg}kg)`).join(', ') || 'MeatLink Order',
                                            paymentMethod: 'zb_smilenpay'
                                        })
                                    }).then(r => r.json()).then(subData => {
                                        if (subData.success) {
                                            const deliveries = JSON.parse(localStorage.getItem(`hexad_deliveries_${pendingOrder.senderId}`) || '[]');
                                            deliveries.unshift({
                                                id: subData.subscriptionId,
                                                recipientName: pendingOrder.recipientName,
                                                date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                                                location: `${pendingOrder.recipientSuburb || 'Unknown'}, Harare`,
                                                status: 'Scheduled',
                                                pack: pendingOrder.cartItems?.map((i: any) => `${i.title} (${i.kg}kg)`).join(', ') || 'MeatLink Order'
                                            });
                                            localStorage.setItem(`hexad_deliveries_${pendingOrder.senderId}`, JSON.stringify(deliveries));
                                            localStorage.removeItem('hexad_cart');
                                            localStorage.removeItem('hexad_pending_zb_order');
                                        }
                                    }).catch(e => console.error('Error auto-creating subscription for ZB order:', e));
                                } catch(e) {
                                    console.error('Error parsing pending order:', e);
                                }
                            }
                        }
                        return;
                    }

                    if (data.payment.status === 'FAILED') {
                        setPaymentStatus('failed');
                        setMessage('Payment was not completed. Please try again.');
                        return;
                    }
                }

                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, 3000);
                } else {
                    setPaymentStatus('failed');
                    setMessage('Payment verification timed out. If you were charged, please contact support.');
                }
            } catch (error) {
                console.error('ZB return polling error:', error);
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, 3000);
                } else {
                    setPaymentStatus('failed');
                    setMessage('An error occurred while verifying your payment.');
                }
            }
        };

        // Start polling after a brief delay
        setTimeout(checkStatus, 2000);
    }, [paymentId, urlStatus]);

    return (
        <div style={{
            maxWidth: '520px',
            margin: '0 auto',
            padding: '4rem 2rem',
            textAlign: 'center',
        }}>
            <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius)',
                padding: '3rem 2rem',
                boxShadow: 'var(--card-shadow)',
            }}>
                {/* Status Icon */}
                <div style={{
                    fontSize: '4rem',
                    marginBottom: '1.5rem',
                    animation: paymentStatus === 'processing' ? 'pulse 1.5s infinite' : 'none',
                }}>
                    {paymentStatus === 'processing' && '⏳'}
                    {paymentStatus === 'success' && '✅'}
                    {paymentStatus === 'failed' && '❌'}
                </div>

                {/* Title */}
                <h1 style={{
                    fontSize: '1.75rem',
                    marginBottom: '0.75rem',
                    color: paymentStatus === 'success'
                        ? 'var(--success, #22c55e)'
                        : paymentStatus === 'failed'
                            ? 'var(--error, #ef4444)'
                            : 'var(--foreground)',
                }}>
                    {paymentStatus === 'processing' && 'Verifying Payment...'}
                    {paymentStatus === 'success' && 'Payment Successful!'}
                    {paymentStatus === 'failed' && 'Payment Failed'}
                </h1>

                {/* Message */}
                <p style={{
                    color: 'var(--text-muted)',
                    marginBottom: '1rem',
                    lineHeight: 1.6,
                    fontSize: '0.95rem',
                }}>
                    {message}
                </p>

                {/* Reference */}
                {orderRef && (
                    <div style={{
                        background: 'var(--background)',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        marginBottom: '2rem',
                        fontFamily: 'monospace',
                    }}>
                        Ref: {orderRef}
                    </div>
                )}

                {/* Actions */}
                {paymentStatus !== 'processing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                        {paymentStatus === 'success' && (
                            <>
                                <Button fullWidth onClick={() => router.push('/dashboard')}>
                                    Go to Dashboard
                                </Button>
                                <Button fullWidth variant="secondary" onClick={() => router.push('/shop')}>
                                    Continue Shopping
                                </Button>
                            </>
                        )}
                        {paymentStatus === 'failed' && (
                            <>
                                <Button fullWidth onClick={() => router.push('/checkout')}>
                                    Try Again
                                </Button>
                                <Button fullWidth variant="secondary" onClick={() => router.push('/dashboard')}>
                                    Go to Dashboard
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {/* Processing animation */}
                {paymentStatus === 'processing' && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '2rem',
                    }}>
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: 'var(--primary)',
                                    opacity: 0.3,
                                    animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                @keyframes dotPulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.3); }
                }
            `}</style>
        </div>
    );
}

export default function ZBReturnPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 2rem' }}>
                <p>Loading payment status...</p>
            </div>
        }>
            <ZBReturnContent />
        </Suspense>
    );
}
