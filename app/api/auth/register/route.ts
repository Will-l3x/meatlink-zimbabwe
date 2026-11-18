import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { attachSessionCookie, createSessionToken, isSessionConfigured } from '@/lib/session';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
    try {
        const { name, email, password } = await request.json();

        if (!email || !name || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const trimmedName = String(name).trim();
        const rawPassword = String(password);

        if (!EMAIL_PATTERN.test(normalizedEmail)) {
            return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
        }
        if (trimmedName.length < 2) {
            return NextResponse.json({ error: 'Please enter your full name' }, { status: 400 });
        }
        if (rawPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const db = getPrisma();
        if (!db) {
            return NextResponse.json({ error: 'Registration service is temporarily unavailable' }, { status: 503 });
        }
        if (!isSessionConfigured()) {
            console.error('[Auth] SESSION_SECRET is not configured');
            return NextResponse.json({ error: 'Authentication is not configured on the server' }, { status: 503 });
        }

        const existing = await db.user.findFirst({
            where: { email: normalizedEmail }
        });

        if (existing) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
        }

        const user = await db.user.create({
            data: {
                name: trimmedName,
                email: normalizedEmail,
                password: hashPassword(rawPassword),
                walletBalance: 0,
                role: 'SENDER'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                walletBalance: true,
                walletUSD: true,
                walletZAR: true,
                walletGBP: true,
            }
        });

        const response = NextResponse.json({ success: true, user });
        return attachSessionCookie(response, createSessionToken(user.id, user.role));
    } catch (error) {
        // Two sign-ups racing on the same email hit the partial unique index.
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
        }
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
    }
}
