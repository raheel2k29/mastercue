import { NextRequest, NextResponse } from 'next/server';
import { loadPricingFromDB, savePricingToDB, resetPricingInDB } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { savePricingConfig, resetPricingConfig } from '@/lib/pricingStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await loadPricingFromDB();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch pricing config' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Admin Session Security
    const user = getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required to modify pricing rules' },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (body.action === 'reset') {
      const resetConfig = await resetPricingInDB();
      return NextResponse.json({
        success: true,
        message: 'Pricing reset to default factory values',
        config: resetConfig,
      });
    }

    // 2. Validate and Sanitize
    const result = savePricingConfig(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Validation or save failed' },
        { status: 400 }
      );
    }

    // 3. Persist to Active Database (PostgreSQL or Local File)
    await savePricingToDB(result.config);

    return NextResponse.json({
      success: true,
      message: 'Pricing rules updated and persisted to database',
      config: result.config,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Invalid request payload' },
      { status: 500 }
    );
  }
}
