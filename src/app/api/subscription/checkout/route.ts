/**
 * POST /api/subscription/checkout — create a Stripe Checkout session for upgrading
 * from the Free plan to a paid plan.
 * Body: { plan: 'hobby' | 'investor' }
 * Returns: { data: { url: string } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/modules/auth/authService';
import { createCheckoutSession } from '@/modules/subscription/subscriptionService';
import { AuthorisationError, NotFoundError, ValidationError } from '@/lib/errors';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyToken(request);
  } catch (err) {
    if (err instanceof AuthorisationError) {
      return NextResponse.json({ error: { message: err.message } }, { status: 401 });
    }
    return NextResponse.json({ error: { message: 'Unauthorised.' } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid request body.' } }, { status: 400 });
  }

  const { plan } = body as Record<string, unknown>;

  try {
    const url = await createCheckoutSession(supabaseUserId, plan);
    return NextResponse.json({ data: { url } });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { error: { message: err.message, fields: err.fields } },
        { status: 400 },
      );
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: { message: err.message } }, { status: 404 });
    }
    console.error('[POST /api/subscription/checkout] Unexpected error:', err);
    return NextResponse.json(
      { error: { message: 'Unable to create checkout session.' } },
      { status: 500 },
    );
  }
}
