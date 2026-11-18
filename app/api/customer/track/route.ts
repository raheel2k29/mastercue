import { NextResponse } from 'next/server';
import { getOrderById } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderNumber, email } = body;

    if (!orderNumber?.trim() || !email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Order reference number and email are required' },
        { status: 400 }
      );
    }

    const order = await getOrderById(orderNumber.trim().toUpperCase());
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'No order found with that reference number' },
        { status: 404 }
      );
    }

    if (order.customer.email.toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Email address does not match order records' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Lookup failed' },
      { status: 500 }
    );
  }
}
