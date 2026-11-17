import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { findAdminByEmail } from './db';

const SESSION_COOKIE_NAME = 'mastercue_admin_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'mastercue-secret-key-salt-2026-production';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export { SESSION_COOKIE_NAME };

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSessionToken(payload: { email: string; id: string }): string {
  const exp = Date.now() + SESSION_MAX_AGE;
  const data = JSON.stringify({ ...payload, exp });
  const base64Data = Buffer.from(data).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Data)
    .digest('base64url');
  return `${base64Data}.${signature}`;
}

export function verifySessionToken(token: string): { email: string; id: string } | null {
  if (!token || !token.includes('.')) return null;

  const [base64Data, signature] = token.split('.');
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Data)
    .digest('base64url');

  if (signature !== expectedSignature) return null;

  try {
    const jsonStr = Buffer.from(base64Data, 'base64url').toString('utf-8');
    const parsed = JSON.parse(jsonStr);
    if (Date.now() > parsed.exp) return null; // expired
    return { email: parsed.email, id: parsed.id };
  } catch (err) {
    return null;
  }
}

export function getSessionUser(): { email: string; id: string } | null {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;
    return verifySessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}
