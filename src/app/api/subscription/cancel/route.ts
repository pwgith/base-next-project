/**
 * POST /api/subscription/cancel -- deprecated; cancellation is handled via the
 * Stripe Customer Portal. Redirects to the portal endpoint permanently.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const url = new URL('/api/subscription/portal', request.url);
  return NextResponse.redirect(url, { status: 308 });
}
