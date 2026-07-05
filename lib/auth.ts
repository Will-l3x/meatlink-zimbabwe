import crypto from 'crypto';

const DEFAULT_PASSWORD_SALT = 'meatlink-zimbabwe-default-salt';

function getPasswordSalt(): string {
  const configuredSalt = process.env.PASSWORD_SALT || process.env.NEXTAUTH_SECRET;
  return configuredSalt && configuredSalt.trim().length > 0 ? configuredSalt : DEFAULT_PASSWORD_SALT;
}

export function hashPassword(password: string): string {
  const salt = getPasswordSalt();
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword;
}
