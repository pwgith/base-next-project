/**
 * GET /api/subscription/prices — returns the current plan prices fetched live
 * from the Stripe API.
 *
 * This endpoint is intentionally unauthenticated: subscription plan prices are
 * public information and must be displayed before a user signs in (e.g. on a
 * marketing/plans page). Stripe is the single source of truth for prices; the
 * application never hardcodes them.
 */

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';

type PlanPrices = {
  free: string;
  hobby: string;
  investor: string;
};

/** Format a Stripe unit_amount (in cents) and currency code as "A$X.XX / month". */
function formatPrice(unitAmount: number | null, currency: string): string {
  const dollars = (unitAmount ?? 0) / 100;
  const symbol = currency.toUpperCase() === 'AUD' ? 'A$' : '$';
  return `${symbol}${dollars.toFixed(2)} / month`;
}

export async function GET(): Promise<NextResponse> {
  try {
    const [hobbyPrice, investorPrice] = await Promise.all([
      stripe.prices.retrieve(env.stripePriceIdHobby),
      stripe.prices.retrieve(env.stripePriceIdInvestor),
    ]);

    const prices: PlanPrices = {
      free: 'A$0 / month',
      hobby: formatPrice(hobbyPrice.unit_amount, hobbyPrice.currency),
      investor: formatPrice(investorPrice.unit_amount, investorPrice.currency),
    };

    return NextResponse.json({ data: prices });
  } catch (err) {
    console.error('[GET /api/subscription/prices] Failed to fetch prices from Stripe:', err);
    return NextResponse.json(
      { error: { message: 'Unable to fetch subscription prices.' } },
      { status: 502 },
    );
  }
}
