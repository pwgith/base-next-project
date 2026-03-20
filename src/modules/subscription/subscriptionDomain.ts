/**
 * Subscription domain functions.
 * Pure functions only — no I/O, no side effects, no mutation of inputs.
 */

import { DomainError } from '@/lib/errors';
import type { Plan, Subscription } from './subscriptionTypes';
import { PLAN_RANK } from './subscriptionTypes';

/** Number of days in a standard billing period (simplified monthly). */
const BILLING_PERIOD_DAYS = 30;

/**
 * Apply an upgrade to a higher plan.
 * Takes effect immediately; resets the billing period; clears any pending change.
 * @throws {DomainError} if target plan is not higher than the current plan.
 */
export function upgradeSubscription(
  subscription: Subscription,
  targetPlan: Plan,
  now: Date,
): Subscription {
  if (PLAN_RANK[targetPlan] <= PLAN_RANK[subscription.plan]) {
    throw new DomainError(
      `Cannot upgrade from "${subscription.plan}" to "${targetPlan}" — target plan must be higher.`,
    );
  }

  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + BILLING_PERIOD_DAYS);

  return {
    ...subscription,
    plan: targetPlan,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    scheduledChange: null, // Any pending change is superseded by the upgrade.
  };
}

/**
 * Compute the scheduled change record for a downgrade.
 * The downgrade takes effect at the end of the current billing period.
 * @throws {DomainError} if target plan is not lower than the current plan, or plan is Free.
 */
export function computeScheduledDowngrade(
  subscription: Subscription,
  targetPlan: Plan,
  now: Date,
): { targetPlan: Plan; effectiveAt: Date } {
  if (subscription.plan === 'free') {
    throw new DomainError('Cannot downgrade from the Free plan.');
  }
  if (PLAN_RANK[targetPlan] >= PLAN_RANK[subscription.plan]) {
    throw new DomainError(
      `Cannot downgrade from "${subscription.plan}" to "${targetPlan}" — target plan must be lower.`,
    );
  }

  const effectiveAt = subscription.currentPeriodEnd ?? now;
  return { targetPlan, effectiveAt };
}

/**
 * Compute the scheduled change record for a cancellation (revert to Free).
 * Takes effect at the end of the current billing period.
 * @throws {DomainError} if the user is already on the Free plan.
 */
export function computeScheduledCancellation(
  subscription: Subscription,
  now: Date,
): { targetPlan: Plan; effectiveAt: Date } {
  if (subscription.plan === 'free') {
    throw new DomainError('Cannot cancel a Free plan subscription.');
  }

  const effectiveAt = subscription.currentPeriodEnd ?? now;
  return { targetPlan: 'free' as Plan, effectiveAt };
}
