import { NextResponse } from 'next/server';
import { createCustomerAccount, findCustomerByEmail } from '@/lib/db';
import {
  hashPassword,
  createCustomerSessionToken,
  CUSTOMER_SESSION_COOKIE,
} from '@/lib/customerAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, fullName, phone, shippingAddress } = body;

    if (!email?.trim() || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email address is required' }, { status: 400 });
    }
    if (!password || password.trim().length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (!fullName?.trim()) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await findCustomerByEmail(cleanEmail);

    if (existing && existing.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password.trim());
    const customerId = existing ? existing.id : `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const saved = await createCustomerAccount({
      id: customerId,
      email: cleanEmail,
      passwordHash,
      fullName: fullName.trim(),
      phone: phone?.trim() || existing?.phone || undefined,
      shippingAddress: shippingAddress || existing?.shippingAddress || undefined,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
    });

    const token = createCustomerSessionToken({
      customerId: saved.id,
      email: saved.email,
      fullName: saved.fullName,
    });

    const response = NextResponse.json({
      success: true,
      customer: {
        id: saved.id,
        email: saved.email,
        fullName: saved.fullName,
      },
      message: 'Account created successfully! Your bespoke orders are linked to your account.',
    });

    response.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error('Customer registration error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
