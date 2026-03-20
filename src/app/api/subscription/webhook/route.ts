/**
 * POST /api/subscription/webhook — receives and processes Stripe webhook events.
 *
 * Stripe requires the raw request body to verify the signature. We use
 * request.arrayBuffer() to get the raw bytes (Next.js App Router does not
 * parse the body for this route).
 */

import { NextRequest, NextResponse } from 'next/server';
import { processWebhookEvent } from '@/modules/subscription/subscriptionService';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json(
      { error: { message: 'Missing Stripe signature.' } },
      { status: 400 },
    );
  }

  const rawBody = Buffer.from(await request.arrayBuffer());

  try {
    await processWebhookEvent(rawBody, signature);
    return NextResponse.json({ received: true });
  } catch (err) {
    // Return 400 for signature/parse errors so Stripe does not retry with the same invalid payload.
    const message = err instanceof Error ? err.message : 'Webhook processing failed.';
    if (
      message.includes('signature') ||
      message.includes('Webhook') ||
      message.includes('timestamp')
    ) {
      return NextResponse.json({ error: { message } }, { status: 400 });
    }
    // For all other errors, return 500 so Stripe will retry.
    console.error('[POST /api/subscription/webhook] Unexpected error:', err);
    return NextResponse.json({ error: { message: 'Internal server error.' } }, { status: 500 });
  }
}
