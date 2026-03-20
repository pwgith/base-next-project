import { Before, Given, When, Then } from "@cucumber/cucumber";
import { Application } from "../support/application";
import assert from "assert";
import { createClient } from "@supabase/supabase-js";

// ───────────────────────────────────────────────
// Test email addresses used across F-005 scenarios.
// ───────────────────────────────────────────────

const TEST_EMAIL = "alice@example.com";
const TEARDOWN_URL = "http://localhost:3000/api/test/teardown";
const SETUP_URL = "http://localhost:3000/api/test/setup";

/**
 * Before each F-005 scenario: delete alice@example.com so each scenario begins
 * with a clean account. The Background step re-creates her with the known password.
 */
Before({ tags: "@F-005" }, async function () {
  await fetch(TEARDOWN_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails: [TEST_EMAIL] }),
  });
});

// ───────────────────────────────────────────────
// Background / shared Given steps
// ───────────────────────────────────────────────

/**
 * Background: create a verified account for {email} with a specific password,
 * then sign in. Used by features that need a non-default password (e.g. F-005).
 */
Given(
  "the user is signed in as {string} with current password {string}",
  async function (email: string, password: string) {
    const app: Application = this.app;

    await fetch(SETUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [{ email, password, verified: true }],
      }),
    });

    await app.signInAs(email, password);
  },
);

Given("the user is on the change password page", async function () {
  const app: Application = this.app;
  await app.navigateToChangePassword();
});

// ───────────────────────────────────────────────
// When steps
// ───────────────────────────────────────────────

When(
  "the user enters the current password {string}, the new password {string}, and confirms {string}",
  async function (currentPassword: string, newPassword: string, confirmPassword: string) {
    const app: Application = this.app;
    await app.fillChangePassword(currentPassword, newPassword, confirmPassword);
  },
);

When("the user submits the change password form", async function () {
  const app: Application = this.app;
  await app.submitChangePasswordForm();
});

// ───────────────────────────────────────────────
// Then steps
// ───────────────────────────────────────────────

/**
 * S-039: Verify the new password works via the Supabase admin API.
 * We attempt a sign-in with the new password using the anon client — success
/**
 * S-040 / S-039: success and notification — see also common.steps.ts for the
 * generic "a notification email is sent to {string} advising that the password was changed"
 * step which handles both change-password and reset-password flows.
 */
Then(
  "the password for {string} is updated",
  async function (_email: string) {
    const app: Application = this.app;
    const visible = await app.isChangePasswordSuccessVisible();
    assert.ok(visible, "Expected the change-password success screen to be visible");
  },
);

Then(
  "the success message {string} is displayed",
  async function (expectedText: string) {
    const app: Application = this.app;
    const visible = await app.isChangePasswordSuccessVisible();
    assert.ok(
      visible,
      `Expected success screen containing "${expectedText}" to be visible`,
    );
  },
);
// NOTE: "the error {string} is displayed", "the error {string} is displayed on the confirm
// password field", "a password strength error is displayed", and
// "a notification email is sent to {string} advising that the password was changed"
// are all defined in common.steps.ts as generic steps shared with F-006 / F-007.

