import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { markOrderPaid, getOrderById } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id');

    if (!sessionId || !orderId) {
      return NextResponse.json({ success: false, error: 'Session ID and Order ID are required' }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      await markOrderPaid(orderId, session.payment_intent as string);
      const order = await getOrderById(orderId);

      return NextResponse.json({
        success: true,
        paid: true,
        order,
        customerEmail: session.customer_details?.email,
      });
    }

    return NextResponse.json({
      success: true,
      paid: false,
      status: session.payment_status,
    });
  } catch (err: any) {
    console.error('Verify session error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Verification failed' }, { status: 500 });
  }
}
