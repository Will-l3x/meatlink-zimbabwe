import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, needsRehash } from '@/lib/auth';
import { attachSessionCookie, createSessionToken, isSessionConfigured } from '@/lib/session';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const db = getPrisma();
        if (!db) {
            return NextResponse.json({ error: 'Authentication service is temporarily unavailable' }, { status: 503 });
        }
        if (!isSessionConfigured()) {
            console.error('[Auth] SESSION_SECRET is not configured');
            return NextResponse.json({ error: 'Authentication is not configured on the server' }, { status: 503 });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await db.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (!user || !user.password || !verifyPassword(String(password), user.password)) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // Upgrade legacy (HMAC / plaintext) credentials to the current scheme.
        if (needsRehash(user.password)) {
            await db.user.update({
                where: { id: user.id },
                data: { password: hashPassword(String(password)) }
            });
        }

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                walletBalance: user.walletBalance,
                walletUSD: user.walletUSD,
                walletZAR: user.walletZAR,
                walletGBP: user.walletGBP
            }
        });

        return attachSessionCookie(response, createSessionToken(user.id, user.role));
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Failed to log in' }, { status: 500 });
    }
}
