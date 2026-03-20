/**
 * Step definitions for F-011 — Upgrade subscription (UC-USR-012).
 */

import { Before, Given, When, Then } from "@cucumber/cucumber";
import { Application } from "../support/application";
import assert from "assert";
import { SUB_TEST_EMAIL, SUB_TEST_PASSWORD } from "./subscriptionCommon.steps";

const SETUP_URL = "http://localhost:3000/api/test/setup";
const TEARDOWN_URL = "http://localhost:3000/api/test/teardown";

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle hooks
// ─────────────────────────────────────────────────────────────────────────────

Before({ tags: "@F-011" }, async function () {
  await fetch(TEARDOWN_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails: [SUB_TEST_EMAIL] }),
  });
});

/**
 * S-088 — Paid plan user upgrading via the Customer Portal needs a real Stripe
 * customer so the portal session creation succeeds.
 */
Before({ tags: "@S-088" }, async function () {
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
// Given steps
// ─────────────────────────────────────────────────────────────────────────────

Given(
  "the user has completed payment for the {string} plan in Stripe Checkout",
  async function (planName: string) {
    const plan = planName.toLowerCase() as "hobby" | "investor";
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
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000).toISOString(),
            },
          },
        ],
      }),
    });
  },
);

Given(
  "the user has been redirected to Stripe Checkout for the {string} plan",
  async function (_plan: string) {
    // State label only — the redirect has occurred outside of the browser context.
    // Nothing to set up here; the subscription remains Free.
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// When steps
// ─────────────────────────────────────────────────────────────────────────────

When(
  "the user requests an upgrade to the {string} plan",
  async function (targetPlan: string) {
    const app: Application = this.app;
    await app.navigateToSubscription();
    const url = await app.clickUpgrade(targetPlan.toLowerCase() as "hobby" | "investor");
    this.stripeRedirectUrl = url;
  },
);

When("Stripe redirects the user back to the application success URL", async function () {
  const app: Application = this.app;
  await app.navigateTo("/subscription/success");
});

When(
  "the user cancels and Stripe redirects back to the application cancel URL",
  async function () {
    const app: Application = this.app;
    await app.navigateTo("/subscription");
  },
);

// S-074 — payment declined in Stripe Checkout requires a real Stripe test card
When("the user's payment is declined by Stripe", async function () {
  return "pending";
});

// ─────────────────────────────────────────────────────────────────────────────
// Then steps
// ─────────────────────────────────────────────────────────────────────────────

Then(
  "the user is redirected to the Stripe Checkout page for the {string} plan",
  async function (_plan: string) {
    assert.ok(
      typeof this.stripeRedirectUrl === "string" &&
        this.stripeRedirectUrl.includes("checkout.stripe.com"),
      `Expected redirect to checkout.stripe.com but got: ${String(this.stripeRedirectUrl)}`,
    );
  },
);

Then("the user is redirected to the Stripe Customer Portal", async function () {
  assert.ok(
    typeof this.stripeRedirectUrl === "string" &&
      this.stripeRedirectUrl.includes("billing.stripe.com"),
    `Expected redirect to billing.stripe.com but got: ${String(this.stripeRedirectUrl)}`,
  );
});

Then("the success confirmation is displayed", async function () {
  const app: Application = this.app;
  // Navigate to the success page in case a previous step navigated away.
  await app.navigateTo("/subscription/success");
  const heading = await app.getPageHeading();
  assert.ok(
    heading.toLowerCase().includes("all set") || heading.toLowerCase().includes("activated"),
    `Expected success heading but got: "${heading}"`,
  );
});

Then(
  "the user's plan is shown as {string}",
  async function (expectedPlan: string) {
    const app: Application = this.app;
    await app.navigateToSubscription();
    const currentPlan = await app.getCurrentPlan();
    assert.strictEqual(
      currentPlan.toLowerCase(),
      expectedPlan.toLowerCase(),
      `Expected plan to be "${expectedPlan}" but got "${currentPlan}"`,
    );
  },
);

Then("the user is returned to the subscription plans page", async function () {
  const app: Application = this.app;
  const path = await app.currentPath();
  assert.strictEqual(path, "/subscription", `Expected path /subscription but got ${path}`);
});

Then("Stripe Checkout displays a payment failure message", async function () {
  // Requires real Stripe Checkout integration — kept pending until E2E Stripe test mode is set up.
  return "pending";
});

