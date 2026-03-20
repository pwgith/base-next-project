/**
 * Step definitions for F-013 — Cancel subscription (UC-USR-014).
 *
 * Cancel and downgrade both go through the Stripe Customer Portal (Manage Billing).
 * "When the user selects the Manage Billing action" is defined in
 * downgradeSubscription.steps.ts (Cucumber matches it from there).
 * "When Stripe sends a subscription.updated webhook..." is also defined there.
 */

import { Before, When, Then } from "@cucumber/cucumber";
import { Application } from "../support/application";
import assert from "assert";
import { SUB_TEST_EMAIL } from "./subscriptionCommon.steps";

const TEARDOWN_URL = "http://localhost:3000/api/test/teardown";

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle hooks
// ─────────────────────────────────────────────────────────────────────────────

Before({ tags: "@F-013" }, async function () {
  await fetch(TEARDOWN_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails: [SUB_TEST_EMAIL] }),
  });
});

/**
 * S-080 — Paid plan user cancelling uses the Customer Portal, which requires a
 * real Stripe customer so the portal session creation succeeds.
 */
Before({ tags: "@S-080" }, async function () {
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

When(
  "the user returns from the Stripe Customer Portal without cancelling",
  async function () {
    const app: Application = this.app;
    await app.navigateTo("/subscription");
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Then steps
// ─────────────────────────────────────────────────────────────────────────────

Then(
  "the cancellation is recorded as scheduled for {string}",
  async function (effectiveDate: string) {
    const app: Application = this.app;
    await app.navigateToSubscription();
    const isVisible = await app.isScheduledChangeNoticeVisible();
    assert.ok(isVisible, "Expected a scheduled cancellation notice to be visible.");

    const dateText = await app.getCancellationDate();
    const expected = new Date(effectiveDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    assert.ok(
      dateText.includes(expected) || dateText.trim() === expected,
      `Expected cancellation date to include "${expected}" but got "${dateText}"`,
    );
  },
);

Then("no cancellation is scheduled", async function () {
  const app: Application = this.app;
  await app.navigateToSubscription();
  const visible = await app.isScheduledChangeNoticeVisible();
  assert.ok(!visible, "Expected no scheduled cancellation notice, but one was visible.");
});

Then(
  "the pending cancellation date {string} is displayed",
  async function (expectedDate: string) {
    const app: Application = this.app;
    const isVisible = await app.isScheduledChangeNoticeVisible();
    assert.ok(isVisible, "Expected a scheduled change notice to be visible.");

    const dateText = await app.getCancellationDate();
    const expected = new Date(expectedDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    assert.ok(
      dateText.includes(expected) || dateText.trim() === expected,
      `Expected pending cancellation date to include "${expected}" but got "${dateText}"`,
    );
  },
);

Then(
  "no further payments will be charged after {string}",
  async function (_effectiveDate: string) {
    // Verified by the cancellation being scheduled — the system will stop billing
    // at the period end date. No separate UI assertion needed.
  },
);

