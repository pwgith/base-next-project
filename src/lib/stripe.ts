/**
 * Server-side Stripe client.
 * Never import this from a client component — the secret key is server-only.
 */

import Stripe from 'stripe';
import { env } from '@/lib/env';

export const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: '2026-02-25.clover',
});

/** Validate the Stripe webhook signature and return the parsed event. */
export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
}
