import { NextResponse } from 'next/server';
import { createOrder, getOrders, createCustomerAccount, findCustomerByEmail } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { hashPassword, createCustomerSessionToken, getCustomerSession, CUSTOMER_SESSION_COOKIE } from '@/lib/customerAuth';
import { OrderRecord } from '@/types/order';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST: Customer places an order for a custom cue
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer, cue, pricing, paymentMethod, notes, accountPassword } = body;

    // Validate customer contact & shipping
    if (!customer?.fullName?.trim()) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    }
    if (!customer?.email?.trim() || !customer.email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email address is required' }, { status: 400 });
    }
    if (!customer?.phone?.trim()) {
      return NextResponse.json({ success: false, error: 'Phone number is required for courier delivery' }, { status: 400 });
    }
    if (!customer?.addressLine1?.trim()) {
      return NextResponse.json({ success: false, error: 'Shipping street address is required' }, { status: 400 });
    }
    if (!customer?.city?.trim()) {
      return NextResponse.json({ success: false, error: 'City is required' }, { status: 400 });
    }
    if (!customer?.postcode?.trim()) {
      return NextResponse.json({ success: false, error: 'Postcode / ZIP is required' }, { status: 400 });
    }
    if (!customer?.country?.trim()) {
      return NextResponse.json({ success: false, error: 'Country is required' }, { status: 400 });
    }

    // Validate account password if provided or enforce account creation
    if (accountPassword && accountPassword.trim().length < 6) {
      return NextResponse.json({ success: false, error: 'Account password must be at least 6 characters long' }, { status: 400 });
    }

    // Validate cue configuration & pricing
    if (!cue || !cue.shaft?.name) {
      return NextResponse.json({ success: false, error: 'Valid cue configuration is required' }, { status: 400 });
    }
    const totalPrice = Number(pricing?.total);
    if (isNaN(totalPrice) || totalPrice <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid total order amount' }, { status: 400 });
    }

    // Generate human-friendly, unique order reference (e.g. MC-268492)
    const timestamp = Date.now();
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `MC-${new Date().getFullYear().toString().slice(-2)}${randomDigits}`;
    const orderId = `ord_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

    // Create or Link Customer Account
    let customerId: string | undefined = undefined;
    let sessionToken: string | undefined = undefined;

    // Check if customer is actively logged in via session cookie
    const activeSession = getCustomerSession();
    let orderCustomerEmail = customer.email.trim().toLowerCase();

    if (activeSession?.customerId) {
      // Priority 1: User is already signed in - link directly to their account
      customerId = activeSession.customerId;
      // Use their verified signed-in email to prevent extension/form-filler discrepancies
      orderCustomerEmail = activeSession.email.trim().toLowerCase();
    } else {
      // Priority 2: Guest checkout - check if an account with this email exists
      const existingCustomer = await findCustomerByEmail(orderCustomerEmail);
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else if (accountPassword && accountPassword.trim().length >= 6) {
        // Priority 3: New customer creating account with password
        const passwordHash = await hashPassword(accountPassword.trim());
        customerId = `cust_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
        const customerAccount = await createCustomerAccount({
          id: customerId,
          email: orderCustomerEmail,
          passwordHash,
          fullName: customer.fullName.trim(),
          phone: customer.phone.trim(),
          shippingAddress: customer,
          createdAt: new Date().toISOString(),
        });
        customerId = customerAccount.id;
        sessionToken = createCustomerSessionToken({
          customerId: customerAccount.id,
          email: customerAccount.email,
          fullName: customerAccount.fullName,
        });
      }
    }

    // Turnaround Service Level
    const isPriority =
      body.serviceLevel === 'priority' ||
      Boolean(cue?.priorityService) ||
      Number(pricing?.priorityServicePrice) > 0;
    const serviceLevel = isPriority ? 'priority' : 'standard';
    const targetCompletionWeeks = isPriority ? 6 : 12;
    const priorityServicePrice = isPriority
      ? (Number(pricing?.priorityServicePrice) || 40)
      : 0;

    const orderRecord: OrderRecord = {
      id: orderId,
      orderNumber,
      customerId,
      customer: {
        fullName: customer.fullName.trim(),
        email: orderCustomerEmail,
        phone: customer.phone.trim(),
        addressLine1: customer.addressLine1.trim(),
        addressLine2: customer.addressLine2?.trim() || '',
        city: customer.city.trim(),
        stateOrRegion: customer.stateOrRegion?.trim() || '',
        postcode: customer.postcode.trim().toUpperCase(),
        country: customer.country.trim(),
      },
      cue: {
        ...cue,
        priorityService: isPriority,
      },
      pricing: {
        total: totalPrice,
        shaftPrice: Number(pricing.shaftPrice) || 0,
        lengthPrice: Number(pricing.lengthPrice) || 0,
        buttTimberPrice: Number(pricing.buttTimberPrice) || 0,
        largeSplicePrice: Number(pricing.largeSplicePrice) || 0,
        smallSplicePrice: Number(pricing.smallSplicePrice) || 0,
        largeVeneersPrice: Number(pricing.largeVeneersPrice) || 0,
        smallVeneersPrice: Number(pricing.smallVeneersPrice) || 0,
        endButtJoinPrice: Number(pricing.endButtJoinPrice) || 0,
        domeJointPrice: Number(pricing.domeJointPrice) || 0,
        ferrulePrice: Number(pricing.ferrulePrice) || 0,
        tipPrice: Number(pricing.tipPrice) || 0,
        platePrice: Number(pricing.platePrice) || 0,
        engravingPrice: Number(pricing.engravingPrice) || 0,
        miniButtPrice: Number(pricing.miniButtPrice) || 0,
        extensionsPrice: Number(pricing.extensionsPrice) || 0,
        priorityServicePrice,
        currency: pricing.currency || '£',
      },
      serviceLevel,
      targetCompletionWeeks,
      paymentMethod: paymentMethod || 'invoice_bank_transfer',
      notes: notes?.trim() || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const savedOrder = await createOrder(orderRecord);

    const response = NextResponse.json({
      success: true,
      orderNumber: savedOrder.orderNumber,
      order: savedOrder,
      accountCreated: Boolean(customerId),
      message: 'Order placed successfully! Handcrafted cue specifications permanently saved.',
    });

    if (sessionToken) {
      response.cookies.set(CUSTOMER_SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (err: any) {
    console.error('Error placing order:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to place order' },
      { status: 500 }
    );
  }
}

// GET: Store owner retrieves orders (protected by admin session)
export async function GET(req: Request) {
  try {
    const user = getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const orders = await getOrders(limit, offset);

    return new NextResponse(
      JSON.stringify({
        success: true,
        orders,
        count: orders.length,
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
    console.error('Error fetching orders:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
