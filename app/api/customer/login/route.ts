import { NextResponse } from 'next/server';
import { findCustomerByEmail } from '@/lib/db';
import {
  verifyCustomerPassword,
  createCustomerSessionToken,
  CUSTOMER_SESSION_COOKIE,
} from '@/lib/customerAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email?.trim() || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const customer = await findCustomerByEmail(cleanEmail);
    if (!customer) {
      return NextResponse.json({ success: false, error: 'No account found for this email address' }, { status: 401 });
    }

    const isMatch = await verifyCustomerPassword(password, customer.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Invalid password. Please check your credentials.' }, { status: 401 });
    }

    const token = createCustomerSessionToken({
      customerId: customer.id,
      email: customer.email,
      fullName: customer.fullName,
    });

    const response = NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
      },
      message: 'Logged in successfully',
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
    console.error('Customer login error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Login failed' },
      { status: 500 }
    );
  }
}
