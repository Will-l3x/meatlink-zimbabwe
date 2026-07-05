import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }

export const prisma = process.env.DATABASE_URL
    ? (globalForPrisma.prisma ??= new PrismaClient({
        log: ['query'],
    }))
    : null

export function getPrisma(): PrismaClient | null {
    return prisma
}
