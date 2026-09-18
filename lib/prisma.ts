import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }

// Query logging prints every query with its parameters (including customer
// data), so it is only enabled in local development.
const logLevels: Array<'query' | 'warn' | 'error'> =
    process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error']

export const prisma = process.env.DATABASE_URL
    ? (globalForPrisma.prisma ??= new PrismaClient({ log: logLevels }))
    : null

export function getPrisma(): PrismaClient | null {
    return prisma
}
