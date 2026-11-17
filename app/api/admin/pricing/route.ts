import { NextRequest, NextResponse } from 'next/server';
import { getPricingConfig, savePricingConfig, resetPricingConfig } from '@/lib/pricingStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = getPricingConfig();
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
    const body = await req.json();

    if (body.action === 'reset') {
      const resetConfig = resetPricingConfig();
      return NextResponse.json({
        success: true,
        message: 'Pricing reset to default factory values',
        config: resetConfig,
      });
    }

    const result = savePricingConfig(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Validation or save failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pricing rules updated successfully',
      config: result.config,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Invalid request payload' },
      { status: 500 }
    );
  }
}
