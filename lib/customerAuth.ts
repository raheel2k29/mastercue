import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const CUSTOMER_SESSION_COOKIE = 'mastercue_customer_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'mastercue-secret-key-salt-2026-production';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days for customer convenience

export { CUSTOMER_SESSION_COOKIE };

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyCustomerPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createCustomerSessionToken(payload: {
  customerId: string;
  email: string;
  fullName: string;
}): string {
  const exp = Date.now() + SESSION_MAX_AGE;
  const data = JSON.stringify({ ...payload, exp });
  const base64Data = Buffer.from(data).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Data)
    .digest('base64url');
  return `${base64Data}.${signature}`;
}

export function verifyCustomerSessionToken(
  token: string
): { customerId: string; email: string; fullName: string } | null {
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
    return {
      customerId: parsed.customerId,
      email: parsed.email,
      fullName: parsed.fullName,
    };
  } catch (err) {
    return null;
  }
}

export function getCustomerSession(): {
  customerId: string;
  email: string;
  fullName: string;
} | null {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(CUSTOMER_SESSION_COOKIE);
    if (!sessionCookie?.value) return null;
    return verifyCustomerSessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}
