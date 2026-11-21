import { NextResponse } from 'next/server';
import { getAllCustomers } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const admin = getSessionUser();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }

    const customers = await getAllCustomers();
    // Sanitize: do not send password hashes
    const sanitized = customers.map(({ passwordHash, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      customers: sanitized,
    });
  } catch (err: any) {
    console.error('Failed to fetch customers:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
