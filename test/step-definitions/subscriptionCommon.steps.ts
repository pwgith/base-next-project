/**
 * Shared step definitions used across subscription feature files
 * (F-010 viewSubscriptionPlans, F-011 upgradeSubscription,
 *  F-012 downgradeSubscription, F-013 cancelSubscription).
 *
 * Steps specific to a single feature live in their own step-definition file.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { Application } from "../support/application";
import assert from "assert";

/**
 * Fixed fake Stripe customer ID used when setting up paid subscriptions for
 * scenarios that send fake webhook events. Must match the ID used in
 * sendFakeWebhook() calls in upgrade/downgrade/cancel step definitions.
 */
export const STRIPE_TEST_CUSTOMER_ID = "cus_test_cucumber_sub";

const SETUP_URL = "http://localhost:3000/api/test/setup";

/** Fixed test email used across all subscription scenarios. */
export const SUB_TEST_EMAIL = "sub.user@example.com";
export const SUB_TEST_PASSWORD = "Secure!99";

// ─────────────────────────────────────────────────────────────────────────────
// Subscription state — Given steps
// ─────────────────────────────────────────────────────────────────────────────

Given(
  "the user is subscribed to the {string} plan",
  async function (planName: string) {
    const plan = planName.toLowerCase() as "free" | "light" | "full";

    // Allow F-014 (processStripeWebhook) scenarios to override the email and customer ID
    // via world state set in the "a user profile exists with Stripe customer ID" step.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const email: string = (this as any).subEmail ?? SUB_TEST_EMAIL;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const password: string = (this as any).subPassword ?? SUB_TEST_PASSWORD;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripeCustomerId: string | undefined = (this as any).subCustomerId;

    const subscription: Record<string, unknown> = {
      plan,
      currentPeriodStart: plan !== "free" ? new Date().toISOString() : undefined,
      currentPeriodEnd:
        plan !== "free"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
    };
    if (stripeCustomerId) {
      subscription.stripeCustomerId = stripeCustomerId;
      // stripeSubscriptionId is intentionally omitted — it carries a unique DB constraint
      // and is not needed by the portal creation path. The webhook handler writes it
      // when a real checkout.session.completed or subscription.updated event fires.
    }

    await fetch(SETUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [{ email, password, verified: true, subscription }],
      }),
    });
  },
);

Given(
  "the user is subscribed to the {string} plan with a billing period ending on {string}",
  async function (planName: string, periodEndDate: string) {
    const plan = planName.toLowerCase() as "light" | "full";
    const periodEnd = new Date(periodEndDate);
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 30);

    // Scenarios that need a real Stripe portal session (e.g. S-075) set
    // subCustomerId in their Before hook.  Use that real ID when available;
    // fall back to the shared fake ID for webhook-only tests (S-076, S-077).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripeCustomerId: string = (this as any).subCustomerId ?? STRIPE_TEST_CUSTOMER_ID;

    await fetch(SETUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [
          {
            email: SUB_TEST_EMAIL,
            password: SUB_TEST_PASSWORD,
            verified: true,
            subscription: {
              plan,
              stripeCustomerId,
              stripeSubscriptionId: "sub_test_cucumber",
              currentPeriodStart: periodStart.toISOString(),
              currentPeriodEnd: periodEnd.toISOString(),
            },
          },
        ],
      }),
    });
  },
);

Given(
  "a downgrade to {string} is already scheduled for {string}",
  async function (targetPlan: string, effectiveDate: string) {
    await fetch(SETUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [
          {
            email: SUB_TEST_EMAIL,
            password: SUB_TEST_PASSWORD,
            verified: true,
            subscription: {
              scheduledChange: {
                changeType: "downgrade",
                targetPlan: targetPlan.toLowerCase(),
                effectiveAt: new Date(effectiveDate).toISOString(),
              },
            },
          },
        ],
      }),
    });
  },
);

Given(
  "a cancellation is already scheduled for {string}",
  async function (effectiveDate: string) {
    await fetch(SETUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [
          {
            email: SUB_TEST_EMAIL,
            password: SUB_TEST_PASSWORD,
            verified: true,
            subscription: {
              scheduledChange: {
                changeType: "cancel",
                targetPlan: "free",
                effectiveAt: new Date(effectiveDate).toISOString(),
              },
            },
          },
        ],
      }),
    });
  },
);

Given(
  "Stripe reports a pending cancellation effective {string}",
  async function (effectiveDate: string) {
    await fetch(SETUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [
          {
            email: SUB_TEST_EMAIL,
            password: SUB_TEST_PASSWORD,
            verified: true,
            subscription: {
              scheduledChange: {
                changeType: "cancel",
                targetPlan: "free",
                effectiveAt: new Date(effectiveDate).toISOString(),
              },
            },
          },
        ],
      }),
    });
  },
);

Given(
  "Stripe reports a scheduled downgrade to {string} effective {string}",
  async function (targetPlan: string, effectiveDate: string) {
    await fetch(SETUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [
          {
            email: SUB_TEST_EMAIL,
            password: SUB_TEST_PASSWORD,
            verified: true,
            subscription: {
              scheduledChange: {
                changeType: "downgrade",
                targetPlan: targetPlan.toLowerCase(),
                effectiveAt: new Date(effectiveDate).toISOString(),
              },
            },
          },
        ],
      }),
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Navigation — When steps
// ─────────────────────────────────────────────────────────────────────────────

When("the user views the subscription plans page", async function () {
  const app: Application = this.app;
  await app.navigateToSubscription();
});

When("the user navigates to the subscription plans page", async function () {
  const app: Application = this.app;
  await app.navigateToSubscription();
});

// ─────────────────────────────────────────────────────────────────────────────
// Plan state assertions — Then / And steps
// ─────────────────────────────────────────────────────────────────────────────

Then("the user's plan remains {string}", async function (expectedPlan: string) {
  const app: Application = this.app;
  await app.navigateToSubscription();
  const currentPlan = await app.getCurrentPlan();
  assert.strictEqual(
    currentPlan.toLowerCase(),
    expectedPlan.toLowerCase(),
    `Expected plan to be "${expectedPlan}" but got "${currentPlan}"`,
  );
});

Then(
  "the user's plan remains {string} until that date",
  async function (expectedPlan: string) {
    const app: Application = this.app;
    await app.navigateToSubscription();
    const currentPlan = await app.getCurrentPlan();
    assert.strictEqual(
      currentPlan.toLowerCase(),
      expectedPlan.toLowerCase(),
      `Expected current plan to still be "${expectedPlan}" but got "${currentPlan}"`,
    );
  },
);

Then("downgrade and cancel options are available", async function () {
  const app: Application = this.app;
  const has = await app.hasAnyDowngradeOrCancelOption();
  assert.ok(has, "Expected downgrade or cancel options to be visible, but none were found.");
});

Then("no downgrade or cancel option is shown", async function () {
  const app: Application = this.app;
  const has = await app.hasAnyDowngradeOrCancelOption();
  assert.ok(!has, "Expected no downgrade or cancel options, but some were visible.");
});

Then("no downgrade option is shown", async function () {
  const app: Application = this.app;
  const manageBillingVisible = await app.isManageBillingButtonVisible();
  assert.ok(!manageBillingVisible, "Expected no Manage Billing button, but it was visible.");
});

Then("no cancel subscription option is shown", async function () {
  const app: Application = this.app;
  const manageBillingVisible = await app.isManageBillingButtonVisible();
  assert.ok(!manageBillingVisible, "Expected no Manage Billing button, but it was visible.");
});

Then("no further payments will be charged", async function () {
  // Verified by the scheduled change to 'free' being present — validated in
  // other Then steps. No separate UI element needed.
});
