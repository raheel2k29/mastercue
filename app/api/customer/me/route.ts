import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/customerAuth';
import { findCustomerById, getCustomerOrders } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = getCustomerSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, customer: null, orders: [] });
    }

    const customer = await findCustomerById(session.customerId);
    const orders = await getCustomerOrders(session.email, session.customerId);

    return new NextResponse(
      JSON.stringify({
        authenticated: true,
        customer: {
          id: session.customerId,
          email: session.email,
          fullName: customer?.fullName || session.fullName,
          phone: customer?.phone,
          shippingAddress: customer?.shippingAddress,
          createdAt: customer?.createdAt,
        },
        orders,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (err: any) {
    console.error('Customer me error:', err);
    return NextResponse.json(
      { authenticated: false, customer: null, orders: [], error: err?.message },
      { status: 500 }
    );
  }
}
