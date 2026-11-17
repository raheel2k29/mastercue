import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabaseStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const user = getSessionUser();
  const dbStatus = await getDatabaseStatus();

  return new NextResponse(
    JSON.stringify({
      authenticated: Boolean(user),
      user: user ? { email: user.email } : null,
      dbStatus,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    }
  );
}
