/**
 * Test-only endpoint to query subscription state by Stripe customer ID.
 * Only available in development — returns 404 in production.
 *
 * GET /api/test/subscription-state?customerId=cus_ABC123
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const customerId = request.nextUrl.searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json(
      { error: "Missing 'customerId' query parameter." },
      { status: 400 },
    );
  }

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { scheduledChange: true },
  });

  if (!subscription) {
    return NextResponse.json({ subscription: null });
  }

  return NextResponse.json({
    subscription: {
      profileId: subscription.profileId,
      plan: subscription.plan,
      status: subscription.status,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      stripeCustomerId: subscription.stripeCustomerId,
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
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = (await request.json()) as { stripeEventId?: string };
  const { stripeEventId } = body;

  if (!stripeEventId) {
    return NextResponse.json({ error: "Missing 'stripeEventId' in body." }, { status: 400 });
  }

  const event = await prisma.processedStripeEvent.findUnique({
    where: { stripeEventId },
  });

  return NextResponse.json({ processed: event !== null });
}
