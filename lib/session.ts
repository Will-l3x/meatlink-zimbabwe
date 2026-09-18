import crypto from 'crypto';
import { NextResponse } from 'next/server';

/**
 * Minimal signed-cookie sessions.
 *
 * The cookie holds `<base64url payload>.<hmac>` where payload is
 * `{ uid, role, exp }`. It is httpOnly so client code cannot read it; the
 * client keeps its own copy of the user's display data in localStorage.
 */

export const SESSION_COOKIE = 'hexad_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionRole = 'SENDER' | 'ADMIN' | 'DRIVER';

export interface Session {
  uid: string;
  role: SessionRole;
  exp: number;
}

function getSecret(): string | null {
  const secret = process.env.SESSION_SECRET || process.env.PASSWORD_SALT || process.env.NEXTAUTH_SECRET;
  if (secret && secret.trim().length > 0) return secret;
  if (process.env.NODE_ENV !== 'production') return 'hexad-dev-insecure-session-secret';
  return null;
}

export function isSessionConfigured(): boolean {
  return getSecret() !== null;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(uid: string, role: SessionRole): string {
  const secret = getSecret();
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ uid, role, exp })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string | null | undefined): Session | null {
  if (!token) return null;
  const secret = getSecret();
  if (!secret) return null;

  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = Buffer.from(sign(payload, secret));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<Session>;
    if (typeof parsed.uid !== 'string' || typeof parsed.exp !== 'number') return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    const role: SessionRole = parsed.role === 'ADMIN' || parsed.role === 'DRIVER' ? parsed.role : 'SENDER';
    return { uid: parsed.uid, role, exp: parsed.exp };
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function getSession(request: Request): Session | null {
  return verifySessionToken(readCookie(request, SESSION_COOKIE));
}

type Guard = { session: Session; response?: undefined } | { session?: undefined; response: NextResponse };

export function requireSession(request: Request): Guard {
  const session = getSession(request);
  if (!session) {
    return { response: NextResponse.json({ success: false, error: 'Please log in to continue.' }, { status: 401 }) };
  }
  return { session };
}

export function requireAdmin(request: Request): Guard {
  const guard = requireSession(request);
  if (guard.response) return guard;
  if (guard.session.role !== 'ADMIN') {
    return { response: NextResponse.json({ success: false, error: 'Admin privileges required.' }, { status: 403 }) };
  }
  return guard;
}

export function attachSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
