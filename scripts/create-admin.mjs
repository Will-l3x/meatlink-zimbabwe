#!/usr/bin/env node
/**
 * Create (or promote) an admin account.
 *
 *   DATABASE_URL="..." node scripts/create-admin.mjs --email you@example.com --name "Your Name"
 *
 * A strong random password is generated and printed once; pass --password to
 * choose one yourself (at least 12 characters). If the email already belongs
 * to an account, that account is made ADMIN and its password is reset.
 * Uses the same scrypt format as lib/auth.ts.
 */
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

function arg(name) {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : undefined;
}

const email = (arg('email') || '').trim().toLowerCase();
const name = (arg('name') || '').trim();
let password = arg('password');

if (!email || !email.includes('@') || !name) {
    console.error('Usage: node scripts/create-admin.mjs --email <email> --name "<name>" [--password <password>]');
    process.exit(1);
}
if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
}
if (password && password.length < 12) {
    console.error('Admin passwords must be at least 12 characters.');
    process.exit(1);
}
if (!password) {
    // 18 random bytes → 24 URL-safe characters
    password = crypto.randomBytes(18).toString('base64url');
}

const salt = crypto.randomBytes(16).toString('hex');
const passwordHash = `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;

const prisma = new PrismaClient();
try {
    const existing = await prisma.user.findFirst({ where: { email } });
    const user = existing
        ? await prisma.user.update({ where: { id: existing.id }, data: { name, password: passwordHash, role: 'ADMIN' } })
        : await prisma.user.create({ data: { email, name, password: passwordHash, role: 'ADMIN' } });

    console.log(`${existing ? 'Updated' : 'Created'} admin account`);
    console.log(`  Name:     ${user.name}`);
    console.log(`  Email:    ${user.email}`);
    console.log(`  Password: ${password}`);
} finally {
    await prisma.$disconnect();
}
