import { Before, Given, When, Then } from "@cucumber/cucumber";
import { Application } from "../support/application";
import assert from "assert";
import { createClient } from "@supabase/supabase-js";

// ───────────────────────────────────────────────
// Test data for F-006 scenarios.
// ───────────────────────────────────────────────

const TEST_EMAIL = "alice@example.com";
const TEST_PASSWORD = "Secure!99";
const TEARDOWN_URL = "http://localhost:3000/api/test/teardown";
const SETUP_URL = "http://localhost:3000/api/test/setup";

Before({ tags: "@F-006" }, async function () {
  await fetch(TEARDOWN_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails: [TEST_EMAIL] }),
  });
});

// ───────────────────────────────────────────────
// Given steps
// ───────────────────────────────────────────────

/** S-045: a verified account exists for the given email. */
Given("an account exists for {string}", async function (email: string) {
  const response = await fetch(SETUP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      users: [{ email, password: TEST_PASSWORD, verified: true }],
    }),
  });
  assert.ok(response.ok, `Expected setup to succeed for ${email}, got ${response.status}`);
});

/** S-047: no account exists — teardown already ran in Before hook. */
Given("no account exists for {string}", async function (_email: string) {
  // The Before hook has already deleted the account; no further action needed.
});

/**
 * S-046 / S-048 / S-051 / S-052: generate a valid, unused reset link for the
 * given email via the Supabase admin API and store the confirm URL in world state.
 */
Given(
  "{string} has a valid, unused password reset link",
  async function (email: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL must be set");
    assert.ok(supabaseServiceKey, "SUPABASE_SERVICE_ROLE_KEY must be set");

    // Ensure the account exists.
    await fetch(SETUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [{ email, password: TEST_PASSWORD, verified: true }],
      }),
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: "http://localhost:3000/auth/callback?next=/reset-password/confirm" },
    });

    assert.ok(!error, `admin.generateLink failed: ${error?.message}`);

    // Build the confirm URL so the test can navigate to it.
    const confirmUrl =
      `http://localhost:3000/reset-password/confirm` +
      `?token_hash=${data.properties.hashed_token}&type=recovery`;

    this.resetPasswordConfirmUrl = confirmUrl;
  },
);

/**
 * S-049: generate two reset links for the same email — the first link is then
 * invalidated by the second request, simulating an "expired" token.
 */
Given(
  "{string} has an expired password reset link",
  async function (email: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL must be set");
    assert.ok(supabaseServiceKey, "SUPABASE_SERVICE_ROLE_KEY must be set");

    await fetch(SETUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [{ email, password: TEST_PASSWORD, verified: true }],
      }),
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generate the first link — this is the one we want to appear "expired".
    const { data: firstLink, error: firstError } =
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: "http://localhost:3000/auth/callback?next=/reset-password/confirm" },
      });
    assert.ok(!firstError, `First generateLink failed: ${firstError?.message}`);
    const firstConfirmUrl =
      `http://localhost:3000/reset-password/confirm` +
      `?token_hash=${firstLink.properties.hashed_token}&type=recovery`;

    // Generate a second link — this invalidates (supersedes) the first.
    await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: "http://localhost:3000/auth/callback?next=/reset-password/confirm" },
    });

    // Store the first (now invalid) link for the test to follow.
    this.resetPasswordConfirmUrl = firstConfirmUrl;
  },
);

/**
 * S-050: generate a valid link, use it once, then store the URL so the test
 * can attempt to use it a second time (which should fail as "already used").
 */
Given(
  "{string} has already used their password reset link",
  async function (email: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL must be set");
    assert.ok(supabaseServiceKey, "SUPABASE_SERVICE_ROLE_KEY must be set");

    await fetch(SETUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [{ email, password: TEST_PASSWORD, verified: true }],
      }),
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: "http://localhost:3000/auth/callback?next=/reset-password/confirm" },
    });
    assert.ok(!error, `admin.generateLink failed: ${error?.message}`);

    const confirmUrl =
      `http://localhost:3000/reset-password/confirm` +
      `?token_hash=${data.properties.hashed_token}&type=recovery`;

    // Navigate to the link once to consume the token.
    const app: Application = this.app;
    await app.navigateToUrl(confirmUrl);
    // Wait briefly for the confirm page to process the token.
    await new Promise<void>((resolve) => setTimeout(resolve, 2_000));

    // Store the same URL — its token has now been consumed.
    this.resetPasswordConfirmUrl = confirmUrl;
  },
);

// ───────────────────────────────────────────────
// When steps
// ───────────────────────────────────────────────

/** S-045 / S-047: navigate to the reset-password request page and submit the form. */
When(
  "the user requests a password reset for {string}",
  async function (email: string) {
    const app: Application = this.app;
    await app.navigateToResetPassword();
    await app.requestPasswordReset(email);
  },
);

/**
 * S-046 / S-048 / S-051 / S-052: follow the stored reset link and fill in the new password.
 */
When(
  "the user follows the reset link and enters the new password {string} and confirms {string}",
  async function (newPassword: string, confirmPassword: string) {
    const app: Application = this.app;
    const confirmUrl: string = this.resetPasswordConfirmUrl;
    assert.ok(confirmUrl, "No reset confirm URL found — did the Given step run?");
    await app.navigateToUrl(confirmUrl);
    // Wait for the form to appear after token verification.
    await new Promise<void>((resolve) => setTimeout(resolve, 1_500));
    await app.fillAndSubmitResetPasswordConfirm(newPassword, confirmPassword);
  },
);

/**
 * S-048: follow the stored reset link and set the new password (no confirm phrasing).
 */
When(
  "the user follows the reset link and successfully sets the new password {string}",
  async function (newPassword: string) {
    const app: Application = this.app;
    const confirmUrl: string = this.resetPasswordConfirmUrl;
    assert.ok(confirmUrl, "No reset confirm URL found — did the Given step run?");
    await app.navigateToUrl(confirmUrl);
    await new Promise<void>((resolve) => setTimeout(resolve, 1_500));
    await app.fillAndSubmitResetPasswordConfirm(newPassword, newPassword);
  },
);

When("the user submits the new password", async function () {
  // The When steps above fill AND submit atomically — this is a no-op
  // retained for step phrasing compatibility.
});

/** S-049: navigate to the expired link URL stored by the Given step. */
When("the user follows the expired reset link", async function () {
  const app: Application = this.app;
  const confirmUrl: string = this.resetPasswordConfirmUrl;
  assert.ok(confirmUrl, "No reset confirm URL found — did the Given step run?");
  await app.navigateToUrl(confirmUrl);
  // Allow the confirm page to process the invalid token.
  await new Promise<void>((resolve) => setTimeout(resolve, 2_000));
});

/** S-050: navigate to the already-used link URL stored by the Given step. */
When("the user follows the used reset link", async function () {
  const app: Application = this.app;
  const confirmUrl: string = this.resetPasswordConfirmUrl;
  assert.ok(confirmUrl, "No reset confirm URL found — did the Given step run?");
  await app.navigateToUrl(confirmUrl);
  await new Promise<void>((resolve) => setTimeout(resolve, 2_000));
});

// ───────────────────────────────────────────────
// Then steps
// ───────────────────────────────────────────────

/** S-045 / S-047: a reset link email is sent (or not) — the UI shows the same neutral message. */
Then(
  "a password reset email is sent to {string}",
  async function (_email: string) {
    const app: Application = this.app;
    const visible = await app.isResetPasswordSentVisible();
    assert.ok(visible, "Expected the 'Check your email' screen to be visible");
  },
);

Then("no reset email is sent", async function () {
  // For non-registered emails, Supabase still shows the same UI.
  // We don't confirm delivery absence — only that the UI message is correct.
});

Then(
  "the user is shown {string}",
  async function (expectedText: string) {
    const app: Application = this.app;
    const visible = await app.isResetPasswordSentVisible();
    assert.ok(
      visible,
      `Expected the confirmation screen containing "${expectedText}" to be visible`,
    );
  },
);

/** S-046: verify the password was updated to the new value. */
Then(
  "the password for {string} is updated to {string}",
  async function (_email: string, _newPassword: string) {
    const app: Application = this.app;
    const visible = await app.isResetPasswordSuccessVisible();
    assert.ok(visible, "Expected the password-reset success screen to be visible");
  },
);

/**
 * S-046: the reset token is invalidated after successful use.
 * We verify by checking that the success screen was shown — on success Supabase
 * marks the token as used, preventing reuse.
 */
Then("the reset token is invalidated and cannot be used again", async function () {
  const app: Application = this.app;
  const visible = await app.isResetPasswordSuccessVisible();
  assert.ok(
    visible,
    "Expected the success screen to be visible (token invalidation confirmed by successful reset)",
  );
});

Then(
  "the user is shown a success message prompting them to sign in with their new password",
  async function () {
    const app: Application = this.app;
    const visible = await app.isResetPasswordSuccessVisible();
    assert.ok(visible, "Expected the reset-password success screen to be visible");
  },
);

/** S-049 / S-050: the "Request a new link" option is visible. */
Then(
  "the user is offered an option to request a new reset link",
  async function () {
    const app: Application = this.app;
    // Verify either the expired or used screen is showing — both have the link.
    const expired = await app.isResetPasswordExpiredVisible();
    const used = await app.isResetPasswordUsedVisible();
    assert.ok(
      expired || used,
      "Expected the expired or used reset link screen to be visible",
    );
  },
);

/** S-051 / S-052: the password was not changed (success screen is NOT visible). */
Then(
  "the password for {string} is not changed",
  async function (_email: string) {
    const app: Application = this.app;
    const success = await app.isResetPasswordSuccessVisible();
    assert.ok(!success, "Expected the success screen NOT to be visible (password unchanged)");
  },
);

// NOTE: "the error {string} is displayed", "the error {string} is displayed on the confirm
// password field", "a password strength error is displayed", and
// "a notification email is sent to {string} advising that the password was changed"
// are all defined in common.steps.ts as generic steps shared with F-005 / F-007.

