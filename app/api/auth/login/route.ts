import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';

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

        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await db.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (!user || !user.password) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const passwordMatches = user.password === password || verifyPassword(password, user.password);
        if (!passwordMatches) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        if (user.password === password) {
            await db.user.update({
                where: { id: user.id },
                data: { password: hashPassword(password) }
            });
        }

        return NextResponse.json({
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
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Failed to log in' }, { status: 500 });
    }
}
