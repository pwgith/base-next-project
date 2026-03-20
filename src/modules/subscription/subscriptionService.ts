/**
 * Subscription application service.
 * Orchestrates validation → domain → repository for subscription operations.
 * All plan changes are initiated via Stripe Checkout or Customer Portal and
 * confirmed via Stripe webhook events — never modified directly from user actions.
 */

import { NotFoundError, ValidationError } from '@/lib/errors';
import { stripe } from '@/lib/stripe';
import { constructWebhookEvent } from '@/lib/stripe';
import { env } from '@/lib/env';
import { subscriptionRepository } from './subscriptionRepository';
import { processedStripeEventRepository } from './processedStripeEventRepository';
import { profileRepository } from '@/modules/profile/profileRepository';
import type { Plan, SubscriptionStatus, Subscription } from './subscriptionTypes';
import { PLAN_RANK } from './subscriptionTypes';
import type Stripe from 'stripe';

const PLAN_TO_PRICE_ID: Record<Exclude<Plan, 'free'>, string> = {
  hobby: env.stripePriceIdHobby,
  investor: env.stripePriceIdInvestor,
};

/** Map a Stripe Price ID back to an application Plan. */
function priceIdToPlan(priceId: string): Plan | null {
  for (const [plan, id] of Object.entries(PLAN_TO_PRICE_ID)) {
    if (id === priceId) return plan as Plan;
  }
  return null;
}

// ─── getSubscription ──────────────────────────────────────────────────────────

/**
 * Load the subscription for the given Supabase user.
 * If no subscription row exists (legacy user), a Free subscription is created on the fly.
 */
export async function getSubscription(supabaseUserId: string): Promise<Subscription> {
  const profile = await profileRepository.findBySupabaseUserId(supabaseUserId);
  if (!profile) {
    throw new NotFoundError(`Profile not found for user ${supabaseUserId}`);
  }

  const existing = await subscriptionRepository.findByProfileId(profile.id);
  if (existing) return existing;

  // Legacy user — create a Free subscription.
  return subscriptionRepository.create({ profileId: profile.id });
}

// ─── createDefaultSubscription ────────────────────────────────────────────────

/**
 * Create a Free subscription immediately after a profile is created.
 * Called from the sign-up route handler.
 */
export async function createDefaultSubscription(profileId: string): Promise<Subscription> {
  return subscriptionRepository.create({ profileId, plan: 'free' });
}

// ─── createCheckoutSession ────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout session for upgrading from Free to a paid plan.
 * Returns the Stripe-hosted Checkout URL to redirect the user to.
 */
export async function createCheckoutSession(
  supabaseUserId: string,
  targetPlan: unknown,
): Promise<string> {
  if (
    typeof targetPlan !== 'string' ||
    targetPlan === 'free' ||
    !Object.keys(PLAN_TO_PRICE_ID).includes(targetPlan)
  ) {
    throw new ValidationError('Invalid plan.', {
      plan: 'Must be hobby or investor.',
    });
  }

  const profile = await profileRepository.findBySupabaseUserId(supabaseUserId);
  if (!profile) throw new NotFoundError(`Profile not found for user ${supabaseUserId}`);

  const subscription = await subscriptionRepository.findByProfileId(profile.id);
  if (!subscription) throw new NotFoundError(`Subscription not found for profile ${profile.id}`);

  if (PLAN_RANK[subscription.plan] >= PLAN_RANK[targetPlan as Plan]) {
    throw new ValidationError('Cannot upgrade to an equal or lower plan.', {});
  }

  const priceId = PLAN_TO_PRICE_ID[targetPlan as Exclude<Plan, 'free'>];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/subscription`,
    // Include priceId in metadata so that the checkout.session.completed webhook handler
    // can resolve the plan without a separate stripe.subscriptions.retrieve() API call.
    metadata: { profileId: profile.id, priceId },
  };

  // Attach to existing Stripe customer if one exists.
  if (subscription.stripeCustomerId) {
    sessionParams.customer = subscription.stripeCustomerId;
  } else {
    sessionParams.customer_email = profile.email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return session.url!;
}

// ─── createPortalSession ──────────────────────────────────────────────────────

/**
 * Create a Stripe Customer Portal session for managing the current subscription
 * (upgrade between paid plans, downgrade, cancel, update payment method).
 * Returns the Stripe-hosted portal URL to redirect the user to.
 */
export async function createPortalSession(supabaseUserId: string): Promise<string> {
  const profile = await profileRepository.findBySupabaseUserId(supabaseUserId);
  if (!profile) throw new NotFoundError(`Profile not found for user ${supabaseUserId}`);

  const subscription = await subscriptionRepository.findByProfileId(profile.id);
  if (!subscription) throw new NotFoundError(`Subscription not found for profile ${profile.id}`);

  if (!subscription.stripeCustomerId) {
    throw new ValidationError('No billing account found. Please subscribe to a paid plan first.', {});
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${baseUrl}/subscription`,
  });

  return session.url;
}

// ─── processWebhookEvent ──────────────────────────────────────────────────────

/**
 * Verify a Stripe webhook signature and process the event.
 * Idempotent — duplicate events are detected and silently skipped.
 */
export async function processWebhookEvent(
  rawBody: Buffer,
  stripeSignature: string,
): Promise<void> {
  const event = constructWebhookEvent(rawBody, stripeSignature);

  // Idempotency check — skip already-processed events.
  if (await processedStripeEventRepository.hasBeenProcessed(event.id)) {
    return;
  }

  console.log(`[processWebhookEvent] Processing Stripe event: ${event.type} (${event.id})`);

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      // Unhandled event type — acknowledge and ignore.
      break;
  }

  await processedStripeEventRepository.markProcessed(event.id);
}

// ─── Webhook event handlers ───────────────────────────────────────────────────

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  console.log(`[handleCheckoutSessionCompleted] mode=${session.mode} subscription=${String(session.subscription)} customer=${String(session.customer)} metadata=${JSON.stringify(session.metadata)}`);

  if (session.mode !== 'subscription' || !session.subscription || !session.customer) {
    console.log('[handleCheckoutSessionCompleted] Skipping — not a subscription checkout or missing subscription/customer IDs.');
    return;
  }

  const profileId = session.metadata?.profileId;
  if (!profileId) {
    console.error('[handleCheckoutSessionCompleted] No profileId in session metadata — cannot locate subscription.');
    return;
  }

  const subscription = await subscriptionRepository.findByProfileId(profileId);
  if (!subscription) {
    console.error(`[handleCheckoutSessionCompleted] No subscription found for profileId=${profileId}`);
    return;
  }

  // Resolve the plan from the session.
  //
  // Preferred path: read priceId from session metadata (set by createCheckoutSession).
  // This avoids a round-trip to the Stripe API in the webhook handler hot path.
  //
  // Fallback path: retrieve the subscription from Stripe (for sessions created before
  // metadata.priceId was added, or for events forwarded by the Stripe CLI from real
  // Stripe checkout flows).
  let plan: Plan | null;
  let currentPeriodStart: Date | null = null;
  let currentPeriodEnd: Date | null = null;

  const metadataPriceId = session.metadata?.priceId;
  if (metadataPriceId) {
    plan = priceIdToPlan(metadataPriceId);
    console.log(`[handleCheckoutSessionCompleted] Resolved plan from metadata priceId="${metadataPriceId}" → plan=${String(plan)}`);
  } else {
    console.log('[handleCheckoutSessionCompleted] No priceId in metadata — retrieving subscription from Stripe.');
    const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
    const firstItem = stripeSub.items.data[0];
    plan = priceIdToPlan(firstItem?.price.id ?? '');
    console.log(`[handleCheckoutSessionCompleted] Resolved plan from Stripe subscription priceId="${firstItem?.price.id ?? ''}" → plan=${String(plan)}`);
    currentPeriodStart = firstItem ? new Date(firstItem.current_period_start * 1000) : null;
    currentPeriodEnd = firstItem ? new Date(firstItem.current_period_end * 1000) : null;
  }

  if (!plan) {
    // Price ID from Stripe does not match any configured plan. This indicates a
    // misconfigured STRIPE_PRICE_ID_* env var or a price ID mismatch in Stripe.
    // Log clearly and skip — do not silently revert the subscription to Free.
    console.error(
      `[handleCheckoutSessionCompleted] Unrecognised Stripe price ID "${metadataPriceId ?? '(from subscription retrieve)'}" — ` +
      `no matching STRIPE_PRICE_ID_* env var. Subscription not updated. ` +
      `Check STRIPE_PRICE_ID_HOBBY and STRIPE_PRICE_ID_INVESTOR in your environment. ` +
      `Configured: HOBBY=${process.env.STRIPE_PRICE_ID_HOBBY ?? 'unset'}, INVESTOR=${process.env.STRIPE_PRICE_ID_INVESTOR ?? 'unset'}`,
    );
    return;
  }

  // When using the metadata path, period dates are not available from the checkout event
  // itself. They will be populated by the subsequent customer.subscription.updated event
  // that Stripe fires immediately after a successful checkout.
  await subscriptionRepository.applyWebhookUpdate(
    subscription.id,
    {
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      plan,
      status: 'active',
      currentPeriodStart,
      currentPeriodEnd,
    },
    subscription.version,
  );
  console.log(`[handleCheckoutSessionCompleted] Successfully updated subscription ${subscription.id} to plan=${plan}`);

  // Any pending scheduled change is cleared — a fresh subscription supersedes it.
  await subscriptionRepository.clearScheduledChange(subscription.id);
}

async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription): Promise<void> {
  const stripeCustomerId = stripeSub.customer as string;
  const subscription = await subscriptionRepository.findByStripeCustomerId(stripeCustomerId);
  if (!subscription) return;

  const firstItem = stripeSub.items.data[0];
  const priceId = firstItem?.price.id ?? '';
  const status = mapStripeStatus(stripeSub.status);
  const periodStart = firstItem ? new Date(firstItem.current_period_start * 1000) : null;
  const periodEnd = firstItem ? new Date(firstItem.current_period_end * 1000) : null;

  if (stripeSub.cancel_at_period_end && periodEnd) {
    // The subscription is set to cancel (or downgrade) at period end.
    // Keep the CURRENT plan in the DB — the user retains their existing plan's
    // features until the billing period ends.
    const targetPlan = priceIdToPlan(priceId);

    const updated = await subscriptionRepository.applyWebhookUpdate(
      subscription.id,
      {
        stripeSubscriptionId: stripeSub.id,
        plan: subscription.plan,  // Preserve current plan — don't change until period ends
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      subscription.version,
    );

    if (targetPlan && targetPlan !== 'free') {
      // Scheduled downgrade to a lower paid plan (e.g. Investor → Hobby).
      await subscriptionRepository.setScheduledChange(
        updated.id,
        'downgrade',
        targetPlan,
        periodEnd,
      );
    } else {
      // Scheduled cancellation — will revert to Free at period end.
      await subscriptionRepository.setScheduledChange(
        updated.id,
        'cancel',
        'free',
        periodEnd,
      );
    }
  } else {
    // Immediate plan change (no pending scheduled end) — update the plan now.
    const plan = priceIdToPlan(priceId);

    if (!plan) {
      console.error(
        `[handleSubscriptionUpdated] Unrecognised Stripe price ID "${priceId}" — ` +
        `no matching STRIPE_PRICE_ID_* env var. Subscription not updated. ` +
        `Check STRIPE_PRICE_ID_HOBBY and STRIPE_PRICE_ID_INVESTOR in your environment.`,
      );
      return;
    }

    const updated = await subscriptionRepository.applyWebhookUpdate(
      subscription.id,
      {
        stripeSubscriptionId: stripeSub.id,
        plan,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      subscription.version,
    );

    // Clear any previously recorded scheduled change.
    await subscriptionRepository.clearScheduledChange(updated.id);
  }
}

async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
  const stripeCustomerId = stripeSub.customer as string;
  const subscription = await subscriptionRepository.findByStripeCustomerId(stripeCustomerId);
  if (!subscription) return;

  await subscriptionRepository.applyWebhookUpdate(
    subscription.id,
    {
      stripeSubscriptionId: null,
      plan: 'free',
      status: 'inactive',
      currentPeriodStart: null,
      currentPeriodEnd: null,
    },
    subscription.version,
  );

  await subscriptionRepository.clearScheduledChange(subscription.id);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const stripeCustomerId = invoice.customer as string;
  const subscription = await subscriptionRepository.findByStripeCustomerId(stripeCustomerId);
  if (!subscription) return;

  await subscriptionRepository.applyWebhookUpdate(
    subscription.id,
    {
      plan: subscription.plan,
      status: 'past_due',
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
    },
    subscription.version,
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    default:
      return 'inactive';
  }
}

