import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabaseStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = getSessionUser();
  const dbStatus = getDatabaseStatus();

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      dbStatus,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: { email: user.email },
    dbStatus,
  });
}
