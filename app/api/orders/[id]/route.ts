import { NextResponse } from 'next/server';
import { getOrderById, updateOrderStatus } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { OrderStatus } from '@/types/order';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Retrieve a single order by ID or orderNumber
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await getOrderById(params.id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve order' },
      { status: 500 }
    );
  }
}

// PATCH: Update order status (Admin only)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    const validStatuses: OrderStatus[] = [
      'pending',
      'confirmed',
      'in_crafting',
      'shipped',
      'completed',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    await updateOrderStatus(params.id, status);

    return NextResponse.json({
      success: true,
      message: `Order ${params.id} status updated to ${status}`,
      status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update order status' },
      { status: 500 }
    );
  }
}
