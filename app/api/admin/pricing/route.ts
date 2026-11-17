import { NextRequest, NextResponse } from 'next/server';
import { loadPricingFromDB, savePricingToDB, resetPricingInDB } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { savePricingConfig, resetPricingConfig } from '@/lib/pricingStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
};

export async function GET() {
  try {
    const config = await loadPricingFromDB();
    return new NextResponse(JSON.stringify({ success: true, config }), {
      status: 200,
      headers: NO_CACHE_HEADERS,
    });
  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({ success: false, error: error?.message || 'Failed to fetch pricing config' }),
      {
        status: 500,
        headers: NO_CACHE_HEADERS,
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Admin Session Security
    const user = getSessionUser();
    if (!user) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Unauthorized: Admin authentication required to modify pricing rules' }),
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();

    if (body.action === 'reset') {
      const resetConfig = await resetPricingInDB();
      return new NextResponse(
        JSON.stringify({
          success: true,
          message: 'Pricing reset to default factory values',
          config: resetConfig,
        }),
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Validate and Sanitize
    const result = savePricingConfig(body);
    if (!result.success) {
      return new NextResponse(
        JSON.stringify({ success: false, error: result.error || 'Validation or save failed' }),
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // 3. Persist to Active Database (PostgreSQL)
    await savePricingToDB(result.config);

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: 'Pricing rules updated and persisted to database',
        config: result.config,
      }),
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({ success: false, error: error?.message || 'Invalid request payload' }),
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
