/**
 * Step definitions for F-012 — Downgrade subscription (UC-USR-013).
 */

import { Before, When, Then } from "@cucumber/cucumber";
import { Application } from "../support/application";
import assert from "assert";
import Stripe from "stripe";
import dotenv from "dotenv";
import { SUB_TEST_EMAIL, STRIPE_TEST_CUSTOMER_ID } from "./subscriptionCommon.steps";

// Load .env.local so STRIPE_* vars are available in the test process.
dotenv.config({ path: ".env.local" });

const TEARDOWN_URL = "http://localhost:3000/api/test/teardown";
const WEBHOOK_URL = "http://localhost:3000/api/subscription/webhook";

// ─────────────────────────────────────────────────────────────────────────────
// Webhook helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a minimal Stripe subscription object and POST it to the local webhook
 * endpoint with a correctly signed `stripe-signature` header.
 *
 * @param overrides   Stripe.Subscription fields to override (must include cancel_at_period_end).
 * @param periodEnd   The period-end date used for both the subscription and the scheduled change.
 * @param targetPlan  When simulating a downgrade (not a full cancellation), provide the target
 *                    plan ('hobby' | 'investor'). The webhook will carry that plan's price ID so
 *                    the handler can distinguish a downgrade from a cancellation.
 */
async function sendSubscriptionUpdatedWebhook(
  overrides: Partial<Stripe.Subscription> & { cancel_at_period_end: boolean },
  periodEnd: Date = new Date("2026-04-06"),
  targetPlan?: string,
): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set in .env.local");

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder");

  const periodEndTs = Math.floor(periodEnd.getTime() / 1000);

  // Determine the price ID to embed in the webhook items:
  //  • For a downgrade: use the TARGET plan's price so the handler can record a downgrade.
  //  • For a cancellation: use a placeholder that doesn't map to any plan (→ handler records cancel).
  let priceId: string;
  if (targetPlan) {
    const planKey = targetPlan.toUpperCase();
    priceId = process.env[`STRIPE_PRICE_ID_${planKey}`] ?? `price_${targetPlan.toLowerCase()}_placeholder`;
  } else if (overrides.cancel_at_period_end) {
    // Cancellation — no specific target plan price.
    priceId = "price_cancel_placeholder";
  } else {
    priceId = process.env.STRIPE_PRICE_ID_HOBBY ?? "price_hobby_placeholder";
  }

  const subscriptionObject: Record<string, unknown> = {
    id: "sub_test_cucumber",
    object: "subscription",
    customer: STRIPE_TEST_CUSTOMER_ID,
    status: "active",
    cancel_at_period_end: overrides.cancel_at_period_end,
    current_period_start: periodEndTs - 30 * 86_400,
    current_period_end: periodEndTs,
    items: {
      data: [
        {
          id: "si_test",
          price: {
            id: priceId,
            currency: "aud",
            unit_amount: 999,
          },
          current_period_start: periodEndTs - 30 * 86_400,
          current_period_end: periodEndTs,
        },
      ],
    },
  };

  const event = {
    id: `evt_test_${Date.now()}`,
    object: "event",
    type: "customer.subscription.updated",
    data: { object: subscriptionObject },
  };

  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": header },
    body: payload,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webhook call failed (${res.status}): ${text}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle hooks
// ─────────────────────────────────────────────────────────────────────────────

Before({ tags: "@F-012" }, async function () {
  await fetch(TEARDOWN_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails: [SUB_TEST_EMAIL] }),
  });
});

/**
 * S-075 — Paid plan user downgrading uses the Customer Portal, which requires
 * a real Stripe customer so the portal session creation succeeds.
 */
Before({ tags: "@S-075" }, async function () {
  const res = await fetch("http://localhost:3000/api/test/stripe-customer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: SUB_TEST_EMAIL }),
  });
  if (!res.ok) {
    throw new Error(`Failed to find/create Stripe test customer: ${res.status}`);
  }
  const json = (await res.json()) as { data?: { customerId: string } };
  if (!json.data?.customerId) {
    throw new Error("stripe-customer endpoint returned no customerId");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (this as any).subCustomerId = json.data.customerId;
});

// ─────────────────────────────────────────────────────────────────────────────
// When steps
// ─────────────────────────────────────────────────────────────────────────────

When("the user selects the Manage Billing action", async function () {
  const app: Application = this.app;
  await app.navigateToSubscription();
  const url = await app.clickManageBilling();
  this.stripeRedirectUrl = url;
});

When(
  "Stripe sends a subscription.updated webhook indicating a downgrade to {string} at period end",
  async function (targetPlan: string) {
    // Pass targetPlan so the webhook carries the target plan's price ID, allowing
    // the handler to record a downgrade rather than a full cancellation.
    await sendSubscriptionUpdatedWebhook(
      { cancel_at_period_end: true },
      new Date("2026-04-06"),
      targetPlan.toLowerCase(),
    );
  },
);

When(
  "Stripe sends a subscription.updated webhook indicating cancellation at period end",
  async function () {
    await sendSubscriptionUpdatedWebhook(
      { cancel_at_period_end: true },
      new Date("2026-04-06"),
    );
  },
);

When(
  "the user returns from the Stripe Customer Portal without changing their plan",
  async function () {
    const app: Application = this.app;
    await app.navigateTo("/subscription");
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Then steps
// ─────────────────────────────────────────────────────────────────────────────

Then("no downgrade is scheduled", async function () {
  const app: Application = this.app;
  await app.navigateToSubscription();
  const visible = await app.isScheduledChangeNoticeVisible();
  assert.ok(!visible, "Expected no scheduled change notice, but one was visible.");
});

Then(
  "a downgrade to {string} is recorded as scheduled for {string}",
  async function (targetPlan: string, effectiveDate: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subCustomerId: string | undefined = (this as any).subCustomerId;

    if (subCustomerId) {
      // F-014 (API-only test): verify via the subscription-state test endpoint.
      const res = await fetch(
        `http://localhost:3000/api/test/subscription-state?customerId=${encodeURIComponent(subCustomerId)}`,
      );
      assert.ok(res.ok, `Subscription state query failed with HTTP ${res.status}`);
      const body = (await res.json()) as {
        subscription: {
          scheduledChange: { changeType: string; targetPlan: string; effectiveAt: string } | null;
        } | null;
      };
      const sub = body.subscription;
      assert.ok(sub, `No subscription found for customer ${subCustomerId}`);
      assert.ok(sub.scheduledChange, "Expected a scheduled change but none was found");
      assert.strictEqual(sub.scheduledChange.changeType, "downgrade",
        `Expected "downgrade" but got "${sub.scheduledChange.changeType}"`);
      assert.strictEqual(
        sub.scheduledChange.targetPlan.toLowerCase(),
        targetPlan.toLowerCase(),
        `Expected targetPlan "${targetPlan}" but got "${sub.scheduledChange.targetPlan}"`,
      );
      const expectedDate = new Date(effectiveDate).toDateString();
      const actualDate = new Date(sub.scheduledChange.effectiveAt).toDateString();
      assert.strictEqual(actualDate, expectedDate,
        `Expected effectiveAt "${expectedDate}" but got "${actualDate}"`);
      return;
    }

    // F-012 (browser test): verify via the subscription page UI.
    const app: Application = this.app;
    await app.navigateToSubscription();
    const isVisible = await app.isScheduledChangeNoticeVisible();
    assert.ok(isVisible, `Expected a scheduled change notice to be visible.`);

    const dateText = await app.getScheduledChangeDate();
    const expected = new Date(effectiveDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    assert.ok(
      dateText.includes(expected) || dateText.trim() === expected,
      `Expected scheduled change date to include "${expected}" but got "${dateText}"`,
    );
  },
);

