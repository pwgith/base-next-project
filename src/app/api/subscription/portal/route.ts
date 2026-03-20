/**
 * POST /api/subscription/portal — create a Stripe Customer Portal session for
 * managing billing (upgrade between paid plans, downgrade, cancel, update payment method).
 * Returns: { data: { url: string } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/modules/auth/authService';
import { createPortalSession } from '@/modules/subscription/subscriptionService';
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

  try {
    const url = await createPortalSession(supabaseUserId);
    return NextResponse.json({ data: { url } });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: { message: err.message } }, { status: 400 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: { message: err.message } }, { status: 404 });
    }
    console.error('[POST /api/subscription/portal] Unexpected error:', err);
    return NextResponse.json(
      { error: { message: 'Unable to create billing portal session.' } },
      { status: 500 },
    );
  }
}
