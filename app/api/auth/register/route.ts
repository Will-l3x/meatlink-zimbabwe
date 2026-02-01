import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const { name, email, password } = await request.json();

        if (!email || !name) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Check if user exists
        const existing = await prisma.user.findUnique({
            where: { email }
        });

        if (existing) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        // Create user in MongoDB
        const user = await prisma.user.create({
            data: {
                name,
                email,
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
