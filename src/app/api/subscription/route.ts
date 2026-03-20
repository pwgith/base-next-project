/**
 * GET /api/subscription — returns the signed-in user's current subscription.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/modules/auth/authService';
import { getSubscription } from '@/modules/subscription/subscriptionService';
import { AuthorisationError, NotFoundError } from '@/lib/errors';

export async function GET(request: NextRequest): Promise<NextResponse> {
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
    const subscription = await getSubscription(supabaseUserId);

    return NextResponse.json({
      data: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        scheduledChange: subscription.scheduledChange
          ? {
              changeType: subscription.scheduledChange.changeType,
              targetPlan: subscription.scheduledChange.targetPlan,
              effectiveAt: subscription.scheduledChange.effectiveAt.toISOString(),
            }
          : null,
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: { message: err.message } }, { status: 404 });
    }
    console.error('[GET /api/subscription] Unexpected error:', err);
    return NextResponse.json(
      { error: { message: 'Unable to load subscription.' } },
      { status: 500 },
    );
  }
}
