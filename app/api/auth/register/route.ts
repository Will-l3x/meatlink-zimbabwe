import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const { name, email, password } = await request.json();

        if (!email || !name || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getPrisma();
        if (!db) {
            return NextResponse.json({ error: 'Registration service is temporarily unavailable' }, { status: 503 });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = await db.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (existing) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const user = await db.user.create({
            data: {
                name: String(name).trim(),
                email: normalizedEmail,
                password: hashPassword(password),
                walletBalance: 0,
                role: 'SENDER'
            }
        });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
    }
}
