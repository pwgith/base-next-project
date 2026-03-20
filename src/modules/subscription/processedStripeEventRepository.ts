/**
 * Processed Stripe event repository.
 * Provides idempotency for Stripe webhook processing — records each
 * successfully-processed Stripe event ID so duplicates are detected and skipped.
 */

import { prisma } from '@/lib/prisma';

export const processedStripeEventRepository = {
  /**
   * Check whether a Stripe event has already been processed.
   */
  async hasBeenProcessed(stripeEventId: string): Promise<boolean> {
    const record = await prisma.processedStripeEvent.findUnique({
      where: { stripeEventId },
    });
    return record !== null;
  },

  /**
   * Record that a Stripe event has been successfully processed.
   * Silently ignores duplicate inserts (idempotent).
   */
  async markProcessed(stripeEventId: string): Promise<void> {
    await prisma.processedStripeEvent.upsert({
      where: { stripeEventId },
      create: { stripeEventId },
      update: {}, // no-op if already present
    });
  },
};
