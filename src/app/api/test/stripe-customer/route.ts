/**
 * Test-only endpoint: find or create a Stripe test-mode customer for a given
 * email address.  Returns the Stripe customer ID so Cucumber scenarios can
 * wire up a realistic Stripe customer without hard-coding IDs.
 *
 * Only available in development — returns 404 in production.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: 'email is required.' }, { status: 400 });
  }

  // Reuse an existing test customer if one already exists for this email.
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) {
    return NextResponse.json({ data: { customerId: existing.data[0].id } });
  }

  const customer = await stripe.customers.create({ email });
  return NextResponse.json({ data: { customerId: customer.id } });
}
