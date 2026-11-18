import { NextResponse } from 'next/server';
import { findCustomerByEmail } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email || !email.includes('@')) {
      return NextResponse.json({ exists: false });
    }

    const customer = await findCustomerByEmail(email.trim().toLowerCase());
    return NextResponse.json({
      exists: Boolean(customer),
      fullName: customer ? customer.fullName : undefined,
    });
  } catch (err) {
    return NextResponse.json({ exists: false });
  }
}
