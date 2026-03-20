/**
 * POST /api/subscription/upgrade -- deprecated; use /api/subscription/checkout instead.
 * Redirects the client to the new checkout endpoint permanently.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const url = new URL('/api/subscription/checkout', request.url);
  return NextResponse.redirect(url, { status: 308 });
}
