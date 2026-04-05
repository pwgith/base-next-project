// Subscription domain types

export type Plan = 'free' | 'light' | 'full';

/** Status mirrors the Stripe subscription status (plus 'inactive' for the Free plan). */
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'inactive';

/** The type of scheduled change pending at period end. */
export type ChangeType = 'downgrade' | 'cancel';

/** Ascending rank: free (0) < light (1) < full (2). */
export const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  light: 1,
  full: 2,
};

export function normalizePlan(plan: string): Plan {
  switch (plan) {
    case 'free':
    case 'light':
    case 'full':
      return plan;
    case 'hobby':
      return 'light';
    case 'investor':
      return 'full';
    default:
      throw new Error(`Unknown subscription plan: ${plan}`);
  }
}

export interface SubscriptionScheduledChange {
  id: string;
  subscriptionId: string;
  changeType: ChangeType;
  targetPlan: Plan;
  effectiveAt: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  profileId: string;
  /** Stripe customer ID (cus_…). Null for users who have never subscribed to a paid plan. */
  stripeCustomerId: string | null;
  /** Stripe subscription ID (sub_…). Null for Free plan users. */
  stripeSubscriptionId: string | null;
  plan: Plan;
  status: SubscriptionStatus;
  /** null for the Free plan (no billing). */
  currentPeriodStart: Date | null;
  /** null for the Free plan (no billing). */
  currentPeriodEnd: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  /** Set when a downgrade or cancellation is pending. */
  scheduledChange: SubscriptionScheduledChange | null;
}

export interface CreateSubscriptionInput {
  profileId: string;
  plan?: Plan;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}
