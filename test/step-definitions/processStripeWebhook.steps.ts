/**
 * Step definitions for F-014 — Process Stripe webhook (UC-SYS-001).
 *
 * These tests POST requests directly to /api/subscription/webhook using
 * properly signed payloads built with `stripe.webhooks.generateTestHeaderString`.
 * They require STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY to be set in .env.local.
 *
 * DB state is verified through the test-only /api/test/subscription-state endpoint
 * so that step definitions do not need a direct Prisma dependency.
 */

import { Before, Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

const BASE_URL = "http://localhost:3000";
const WEBHOOK_URL = `${BASE_URL}/api/subscription/webhook`;
const SETUP_URL = `${BASE_URL}/api/test/setup`;
const TEARDOWN_URL = `${BASE_URL}/api/test/teardown`;
const SUB_STATE_URL = `${BASE_URL}/api/test/subscription-state`;

const WEBHOOK_TEST_EMAIL = "webhook.test@example.com";
const WEBHOOK_TEST_PASSWORD = "Secure!99";

/** Stripe customer ID used across all F-014 scenarios. */
const F014_CUSTOMER_ID = "cus_ABC123";

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function getStripeSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set in .env.local");
  return secret;
}

function getStripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder");
}

/** Build and POST a signed Stripe webhook event. Returns the HTTP response. */
async function sendWebhook(eventPayload: Record<string, unknown>): Promise<Response> {
  const secret = getStripeSecret();
  const stripe = getStripeClient();
  const payload = JSON.stringify(eventPayload);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });

  return fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": header },
    body: payload,
  });
}

/** Build a minimal Stripe subscription object suitable for subscription.* events. */
function buildStripeSubscription(overrides: {
  id?: string;
  customer: string;
  priceId?: string;
  status?: string;
  cancelAtPeriodEnd?: boolean;
  periodEnd?: Date;
}): Record<string, unknown> {
  const periodEnd = overrides.periodEnd ?? new Date("2026-04-06");
  const periodEndTs = Math.floor(periodEnd.getTime() / 1000);
  const periodStartTs = periodEndTs - 30 * 86_400;

  return {
    id: overrides.id ?? "sub_test_f014",
    object: "subscription",
    customer: overrides.customer,
    status: overrides.status ?? "active",
    cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
    current_period_start: periodStartTs,
    current_period_end: periodEndTs,
    items: {
      data: [
        {
          id: "si_test",
          price: {
            id: overrides.priceId ?? "price_unknown_placeholder",
            currency: "aud",
            unit_amount: 999,
          },
          current_period_start: periodStartTs,
          current_period_end: periodEndTs,
        },
      ],
    },
  };
}

type SubscriptionState = {
  profileId: string;
  plan: string;
  status: string;
  stripeSubscriptionId: string | null;
  scheduledChange: {
    changeType: string;
    targetPlan: string;
    effectiveAt: string;
  } | null;
};

type SubStateResponse = {
  subscription: SubscriptionState | null;
};

type EventProcessedResponse = {
  processed: boolean;
};

/** Fetch the current subscription state for a given Stripe customer ID via the test API. */
async function fetchSubscriptionState(customerId: string): Promise<SubscriptionState | null> {
  const res = await fetch(`${SUB_STATE_URL}?customerId=${encodeURIComponent(customerId)}`);
  if (!res.ok) throw new Error(`Subscription state query failed with HTTP ${res.status}`);
  const body = (await res.json()) as SubStateResponse;
  return body.subscription;
}

/** Check via the test API whether a Stripe event ID has already been processed. */
async function isEventProcessed(stripeEventId: string): Promise<boolean> {
  const res = await fetch(SUB_STATE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ stripeEventId }),
  });
  if (!res.ok) throw new Error(`Event check failed with HTTP ${res.status}`);
  const body = (await res.json()) as EventProcessedResponse;
  return body.processed;
}

/** POST to the test setup API to upsert a user + subscription. */
async function setupUser(subscription: {
  plan: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  scheduledChange?: { changeType: string; targetPlan: string; effectiveAt: string };
}): Promise<void> {
  const res = await fetch(SETUP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      users: [
        {
          email: WEBHOOK_TEST_EMAIL,
          password: WEBHOOK_TEST_PASSWORD,
          verified: true,
          subscription,
        },
      ],
    }),
  });
  assert.ok(res.ok, `Test setup failed with HTTP ${res.status}`);
}

// ───────────────────────────────────────────────
// Lifecycle hooks
// ───────────────────────────────────────────────

Before({ tags: "@F-014" }, async function () {
  await fetch(TEARDOWN_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails: [WEBHOOK_TEST_EMAIL] }),
  });
});

// ───────────────────────────────────────────────
// Given steps
// ───────────────────────────────────────────────

Given(
  "a user profile exists with Stripe customer ID {string}",
  async function (customerId: string) {
    // Store in world state so context-aware shared steps (subscriptionCommon,
    // downgradeSubscription) use this user instead of the default SUB_TEST_EMAIL.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).subEmail = WEBHOOK_TEST_EMAIL;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).subPassword = WEBHOOK_TEST_PASSWORD;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).subCustomerId = customerId;
    await setupUser({ plan: "free", stripeCustomerId: customerId });

    // Capture the profile ID so webhook metadata.profileId can be set correctly
    // in When steps that send checkout.session.completed events.
    const sub = await fetchSubscriptionState(customerId);
    if (!sub?.profileId) {
      throw new Error(`Could not retrieve profileId for customer ${customerId} after setup`);
    }
    this.webhookProfileId = sub.profileId;
  },
);

Given("the user is on the {string} plan", async function (planName: string) {
  const plan = planName.toLowerCase();
  await setupUser({ plan, stripeCustomerId: F014_CUSTOMER_ID });
  this.currentPlan = plan;
});

// NOTE: "the user is subscribed to the {string} plan" is handled by subscriptionCommon.steps.ts.
// When this.subCustomerId is set (as done by "a user profile exists with Stripe customer ID"),
// that step includes stripeCustomerId in the subscription setup for F-014 scenarios.

Given(
  "the user is subscribed to the {string} plan with a pending cancellation",
  async function (planName: string) {
    const plan = planName.toLowerCase();
    const periodEnd = new Date("2026-04-06");
    await setupUser({
      plan,
      stripeCustomerId: F014_CUSTOMER_ID,
      stripeSubscriptionId: "sub_test_f014",
      currentPeriodStart: new Date(periodEnd.getTime() - 30 * 86_400_000).toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      scheduledChange: {
        changeType: "cancel",
        targetPlan: "free",
        effectiveAt: periodEnd.toISOString(),
      },
    });
    this.currentPlan = plan;
  },
);

Given("the application has a configured Stripe webhook secret", async function () {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  assert.ok(secret, "STRIPE_WEBHOOK_SECRET must be set in .env.local");
});

Given(
  "the {string} event with ID {string} has already been processed for this customer",
  async function (_eventType: string, eventId: string) {
    // Send the event once so the idempotency guard marks it as processed.
    const subObject = buildStripeSubscription({ customer: F014_CUSTOMER_ID });
    const event = {
      id: eventId,
      object: "event",
      type: "customer.subscription.updated",
      data: { object: subObject },
    };
    const res = await sendWebhook(event);
    assert.strictEqual(
      res.status,
      200,
      `Expected HTTP 200 pre-processing event "${eventId}", got ${res.status}`,
    );
  },
);

Given(
  "no user profile exists for Stripe customer ID {string}",
  async function (_customerId: string) {
    // The Before hook tears down the test user which owns F014_CUSTOMER_ID.
    // For any other customer ID, no action is needed — the DB has no record of it.
  },
);

// ───────────────────────────────────────────────
// When steps
// ───────────────────────────────────────────────

/**
 * S-090: checkout.session.completed for customer + plan.
 *
 * Sends a properly-signed checkout.session.completed webhook to the real endpoint.
 * The handler resolves the plan from session.metadata.priceId (set by createCheckoutSession),
 * so no stripe.subscriptions.retrieve() call is needed and no real Stripe subscription ID
 * is required. The Stripe CLI must be running (npm run stripe-cli) when testing.
 */
When(
  "Stripe sends a valid {string} webhook for customer {string} with plan {string}",
  async function (_eventType: string, customerId: string, planName: string) {
    const plan = planName.toLowerCase();
    const priceKey = `STRIPE_PRICE_ID_${plan.toUpperCase()}`;
    const priceId = process.env[priceKey];
    if (!priceId) {
      throw new Error(
        `${priceKey} is not set in .env.local — required to send checkout.session.completed webhook`,
      );
    }
    const profileId = this.webhookProfileId as string;
    if (!profileId) {
      throw new Error(
        "webhookProfileId is not set — the Given step 'a user profile exists with Stripe customer ID' must run first",
      );
    }

    const event = {
      id: `evt_test_checkout_${Date.now()}`,
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          mode: "subscription",
          customer: customerId,
          subscription: "sub_test_checkout_f014",
          metadata: { profileId, priceId },
        },
      },
    };

    const res = await sendWebhook(event);
    assert.strictEqual(
      res.status,
      200,
      `Expected webhook to return HTTP 200 but got ${res.status}`,
    );
    this.webhookResponse = { status: res.status };
    this.targetPlan = plan;
  },
);

/**
 * S-091: customer.subscription.updated webhook indicating a downgrade.
 */
When(
  "Stripe sends a valid {string} webhook for customer {string} indicating a downgrade to {string} at {string}",
  async function (
    _eventType: string,
    customerId: string,
    targetPlan: string,
    effectiveDate: string,
  ) {
    const plan = targetPlan.toLowerCase();
    const priceKey = `STRIPE_PRICE_ID_${plan.toUpperCase()}`;
    const priceId = process.env[priceKey] ?? `price_${plan}_placeholder`;
    const periodEnd = new Date(effectiveDate);

    const subscriptionObject = buildStripeSubscription({
      customer: customerId,
      priceId,
      status: "active",
      cancelAtPeriodEnd: true,
      periodEnd,
    });

    const event = {
      id: `evt_test_downgrade_${Date.now()}`,
      object: "event",
      type: "customer.subscription.updated",
      data: { object: subscriptionObject },
    };

    const res = await sendWebhook(event);
    this.webhookResponse = { status: res.status };
    this.targetPlan = plan;
    this.effectiveDate = effectiveDate;
  },
);

/**
 * S-092: customer.subscription.updated webhook indicating cancellation at period end.
 */
When(
  "Stripe sends a valid {string} webhook for customer {string} indicating cancellation at {string}",
  async function (_eventType: string, customerId: string, effectiveDate: string) {
    const periodEnd = new Date(effectiveDate);

    const subscriptionObject = buildStripeSubscription({
      customer: customerId,
      priceId: "price_cancel_placeholder",  // no mapped plan → cancel to free
      status: "active",
      cancelAtPeriodEnd: true,
      periodEnd,
    });

    const event = {
      id: `evt_test_cancel_${Date.now()}`,
      object: "event",
      type: "customer.subscription.updated",
      data: { object: subscriptionObject },
    };

    const res = await sendWebhook(event);
    this.webhookResponse = { status: res.status };
    this.effectiveDate = effectiveDate;
  },
);

/**
 * S-093: customer.subscription.deleted — reverts user to Free plan.
 * S-096: checkout.session.completed for an unknown customer — acknowledged without state change.
 */
When(
  "Stripe sends a valid {string} webhook for customer {string}",
  async function (eventType: string, customerId: string) {
    let eventPayload: Record<string, unknown>;

    if (eventType === "checkout.session.completed") {
      // Build a checkout session payload WITHOUT a subscription ID so the handler
      // returns early at the `!session.subscription` guard (returns HTTP 200).
      eventPayload = {
        id: `evt_test_checkout_${Date.now()}`,
        object: "event",
        type: "checkout.session.completed",
        data: {
          object: {
            id: `cs_test_${Date.now()}`,
            mode: "subscription",
            customer: customerId,
            subscription: null,
            metadata: {},
          },
        },
      };
    } else {
      // Default: customer.subscription.deleted
      const subscriptionObject = buildStripeSubscription({
        customer: customerId,
        status: "canceled",
      });
      eventPayload = {
        id: `evt_test_deleted_${Date.now()}`,
        object: "event",
        type: eventType,
        data: { object: subscriptionObject },
      };
    }

    const res = await sendWebhook(eventPayload);
    this.webhookResponse = { status: res.status };
  },
);

/**
 * S-094: Webhook with an invalid signature is rejected with HTTP 400.
 */
When("Stripe sends a webhook with an invalid signature", async function () {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": "t=12345,v1=invalidsig",
    },
    body: JSON.stringify({ id: "evt_invalid", type: "test.event", data: {} }),
  });
  this.webhookResponse = { status: res.status };
});

/**
 * S-095: Resending an already-processed event is acknowledged without re-processing.
 */
When(
  "Stripe resends the {string} webhook with event ID {string}",
  async function (_eventType: string, eventId: string) {
    const event = {
      id: eventId,
      object: "event",
      type: "customer.subscription.updated",
      data: {
        object: buildStripeSubscription({ customer: F014_CUSTOMER_ID }),
      },
    };

    const res = await sendWebhook(event);
    this.webhookResponse = { status: res.status };
    this.duplicateEventId = eventId;
  },
);

// ───────────────────────────────────────────────
// Then steps
// ───────────────────────────────────────────────

Then(
  "the user's subscription is updated to {string} with status {string}",
  async function (expectedPlan: string, expectedStatus: string) {
    const sub = await fetchSubscriptionState(F014_CUSTOMER_ID);
    assert.ok(sub, `No subscription found for customer ${F014_CUSTOMER_ID}`);
    assert.strictEqual(
      sub.plan.toLowerCase(),
      expectedPlan.toLowerCase(),
      `Expected plan "${expectedPlan}" but got "${sub.plan}"`,
    );
    assert.strictEqual(
      sub.status.toLowerCase(),
      expectedStatus.toLowerCase(),
      `Expected status "${expectedStatus}" but got "${sub.status}"`,
    );
  },
);

Then(
  "the Stripe subscription ID is recorded against the user's profile",
  async function () {
    const sub = await fetchSubscriptionState(F014_CUSTOMER_ID);
    assert.ok(sub, `No subscription found for customer ${F014_CUSTOMER_ID}`);
    assert.ok(
      sub.stripeSubscriptionId && sub.stripeSubscriptionId.length > 0,
      `Expected a Stripe subscription ID to be recorded but got: "${sub.stripeSubscriptionId}"`,
    );
  },
);

Then("the user's current plan remains {string}", async function (expectedPlan: string) {
  const sub = await fetchSubscriptionState(F014_CUSTOMER_ID);
  assert.ok(sub, `No subscription found for customer ${F014_CUSTOMER_ID}`);
  assert.strictEqual(
    sub.plan.toLowerCase(),
    expectedPlan.toLowerCase(),
    `Expected plan to remain "${expectedPlan}" but got "${sub.plan}"`,
  );
});

// NOTE: "a downgrade to {string} is recorded as scheduled for {string}" is handled by
// downgradeSubscription.steps.ts. That step checks via world state (this.subCustomerId)
// to use the API for F-014 or the subscription page UI for F-012.

Then(
  "a cancellation is recorded as scheduled for {string}",
  async function (effectiveDate: string) {
    const sub = await fetchSubscriptionState(F014_CUSTOMER_ID);
    assert.ok(sub, `No subscription found for customer ${F014_CUSTOMER_ID}`);
    assert.ok(
      sub.scheduledChange,
      "Expected a scheduled change to be recorded, but none was found",
    );
    assert.strictEqual(
      sub.scheduledChange.changeType,
      "cancel",
      `Expected changeType "cancel" but got "${sub.scheduledChange.changeType}"`,
    );
    const expectedDate = new Date(effectiveDate).toDateString();
    const actualDate = new Date(sub.scheduledChange.effectiveAt).toDateString();
    assert.strictEqual(
      actualDate,
      expectedDate,
      `Expected effectiveAt "${expectedDate}" but got "${actualDate}"`,
    );
  },
);

Then("the user's plan is updated to {string}", async function (expectedPlan: string) {
  const sub = await fetchSubscriptionState(F014_CUSTOMER_ID);
  assert.ok(sub, `No subscription found for customer ${F014_CUSTOMER_ID}`);
  assert.strictEqual(
    sub.plan.toLowerCase(),
    expectedPlan.toLowerCase(),
    `Expected plan "${expectedPlan}" but got "${sub.plan}"`,
  );
});

Then("the subscription status is set to {string}", async function (expectedStatus: string) {
  const sub = await fetchSubscriptionState(F014_CUSTOMER_ID);
  assert.ok(sub, `No subscription found for customer ${F014_CUSTOMER_ID}`);
  assert.strictEqual(
    sub.status.toLowerCase(),
    expectedStatus.toLowerCase(),
    `Expected status "${expectedStatus}" but got "${sub.status}"`,
  );
});

Then("the system returns HTTP {int}", async function (expectedStatus: number) {
  const response = this.webhookResponse as { status: number };
  assert.strictEqual(
    response.status,
    expectedStatus,
    `Expected HTTP ${expectedStatus} but got ${response.status}`,
  );
});

Then("no subscription state is changed", async function () {
  // Verify the subscription for the test customer is either absent or still on "free".
  const sub = await fetchSubscriptionState(F014_CUSTOMER_ID);
  if (sub) {
    assert.strictEqual(
      sub.plan,
      "free",
      `Expected plan to remain "free" (unchanged) but got "${sub.plan}"`,
    );
  }
  // null means no subscription exists — also "unchanged".
});

Then("no duplicate subscription record is created", async function () {
  const eventId: string = this.duplicateEventId;
  const processed = await isEventProcessed(eventId);
  assert.ok(processed, `Expected event "${eventId}" to be in the processed_stripe_event table`);

  const sub = await fetchSubscriptionState(F014_CUSTOMER_ID);
  assert.ok(sub, `Expected a subscription for customer ${F014_CUSTOMER_ID}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// S-098 — Unrecognised price ID does not silently revert plan to Free
// ─────────────────────────────────────────────────────────────────────────────

/**
 * S-098: checkout.session.completed with an unrecognised price ID.
 *
 * Sends a properly-signed checkout.session.completed webhook where metadata.priceId
 * is a value not matching any STRIPE_PRICE_ID_* env var. The handler must detect
 * this, log an error, and return without modifying subscription state.
 */
When(
  "Stripe sends a {string} webhook for customer {string} with an unrecognised price ID",
  async function (eventType: string, customerId: string) {
    const profileId = this.webhookProfileId as string;
    if (!profileId) {
      throw new Error(
        "webhookProfileId is not set — the Given step 'a user profile exists with Stripe customer ID' must run first",
      );
    }

    const event = {
      id: `evt_test_unrecognised_price_${Date.now()}`,
      object: "event",
      type: eventType,
      data: {
        object: {
          id: `cs_test_badprice_${Date.now()}`,
          mode: "subscription",
          customer: customerId,
          subscription: "sub_test_badprice_f014",
          metadata: { profileId, priceId: "price_UNRECOGNISED_9999" },
        },
      },
    };

    const res = await sendWebhook(event);
    // The handler should acknowledge (HTTP 200) but not update the subscription.
    assert.strictEqual(
      res.status,
      200,
      `Expected webhook to return HTTP 200 but got ${res.status}`,
    );
    this.webhookResponse = { status: res.status };
  },
);

Then("the user's subscription remains {string}", async function (expectedPlan: string) {
  const sub = await fetchSubscriptionState(F014_CUSTOMER_ID);
  assert.ok(sub, `No subscription found for customer ${F014_CUSTOMER_ID}`);
  assert.strictEqual(
    sub.plan.toLowerCase(),
    expectedPlan.toLowerCase(),
    `Expected plan to remain "${expectedPlan}" but got "${sub.plan}" — ` +
    `an unrecognised Stripe price ID must not silently revert the subscription to Free`,
  );
});
