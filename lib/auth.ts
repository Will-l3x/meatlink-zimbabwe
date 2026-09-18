import crypto from 'crypto';

/**
 * Password hashing.
 *
 * New hashes use scrypt with a per-user random salt and are stored as
 * `scrypt$<salt>$<hash>`. Older accounts may still hold an HMAC-SHA256
 * hash (keyed with PASSWORD_SALT) or, for the very first accounts, a
 * plaintext password. `verifyPassword` accepts all three so existing users
 * can still log in; the login route re-hashes them on success.
 */

const LEGACY_DEFAULT_SALT = 'meatlink-zimbabwe-default-salt';
const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_KEYLEN = 64;

function legacySalt(): string {
  const configured = process.env.PASSWORD_SALT || process.env.NEXTAUTH_SECRET;
  return configured && configured.trim().length > 0 ? configured : LEGACY_DEFAULT_SALT;
}

function legacyHash(password: string): string {
  return crypto.createHmac('sha256', legacySalt()).update(password).digest('hex');
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function isModernHash(stored: string): boolean {
  return stored.startsWith(`${SCRYPT_PREFIX}$`);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${SCRYPT_PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !password) return false;

  if (isModernHash(stored)) {
    const [, salt, hash] = stored.split('$');
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    return safeEqual(derived, Buffer.from(hash, 'hex'));
  }

  // Legacy HMAC-SHA256 hash
  if (safeEqual(Buffer.from(legacyHash(password)), Buffer.from(stored))) return true;

  // Legacy plaintext (earliest accounts)
  return safeEqual(Buffer.from(password), Buffer.from(stored));
}

/** True when a stored credential should be re-hashed with the current scheme. */
export function needsRehash(stored: string | null | undefined): boolean {
  return !!stored && !isModernHash(stored);
}
