// Creates the unique indexes Prisma can't express for MongoDB.
//
// User.email and User.whatsappId are optional: web customers have no
// WhatsApp id and WhatsApp-bot customers have no email. A plain unique index
// treats every missing value as the same key, so these indexes only enforce
// uniqueness when the field is actually a string.
//
// Safe to run repeatedly. Run after `prisma db push`:
//   DATABASE_URL=... npm run db:indexes
import { PrismaClient } from '@prisma/client';

const INDEXES = [
    { collection: 'User', field: 'email', name: 'User_email_unique_when_set' },
    { collection: 'User', field: 'whatsappId', name: 'User_whatsappId_unique_when_set' },
];

const prisma = new PrismaClient();
try {
    for (const { collection, field, name } of INDEXES) {
        await prisma.$runCommandRaw({
            createIndexes: collection,
            indexes: [{
                key: { [field]: 1 },
                name,
                unique: true,
                partialFilterExpression: { [field]: { $type: 'string' } },
            }],
        });
        console.log(`✔ ${collection}.${name}`);
    }

    // Drop the old non-partial unique indexes if an earlier schema created them.
    // (`prisma db push` normally removes them; this covers databases it hasn't run on.)
    for (const legacy of ['User_email_key', 'User_whatsappId_key']) {
        try {
            await prisma.$runCommandRaw({ dropIndexes: 'User', index: legacy });
            console.log(`✔ dropped legacy index ${legacy}`);
        } catch (error) {
            if (!String(error).includes('index not found')) throw error;
        }
    }
} catch (error) {
    console.error('Failed to ensure indexes:', error);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}
