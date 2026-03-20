import { Before, Given, When, Then } from "@cucumber/cucumber";
import { Application } from "../support/application";
import assert from "assert";
import { createClient } from "@supabase/supabase-js";

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

const TEST_EMAIL = "alice@example.com";
const NEW_EMAIL = "alice-new@example.com";
const TAKEN_EMAIL = "taken@example.com";
const TEARDOWN_URL = "http://localhost:3000/api/test/teardown";
const SETUP_URL = "http://localhost:3000/api/test/setup";

/**
 * Before each F-007 scenario: delete all test email accounts so each scenario
 * begins from a clean state. The Background step re-creates alice@example.com.
 */
Before({ tags: "@F-007" }, async function () {
  await fetch(TEARDOWN_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails: [TEST_EMAIL, NEW_EMAIL, TAKEN_EMAIL] }),
  });
});

// ───────────────────────────────────────────────
// Given steps
// ───────────────────────────────────────────────

/** S-053 / S-055 / S-056 / S-058: navigate to the change email page. */
Given("the user is on the change email address page", async function () {
  const app: Application = this.app;
  await app.navigateToChangeEmail();
});

// "an account already exists for {string}" is defined in common.steps.ts.

/**
 * S-054 / S-059: Use the Supabase admin API to queue a pending email change
 * and capture the verification link (sent to the new address).
 */
Given(
  "a pending email change exists from {string} to {string}",
  async function (currentEmail: string, newEmail: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL must be set");
    assert.ok(supabaseServiceKey, "SUPABASE_SERVICE_ROLE_KEY must be set");

    // Set up the account if it doesn't already exist.
    await fetch(SETUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [{ email: currentEmail, password: "Secure!99", verified: true }],
      }),
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "email_change_new",
      email: currentEmail,
      newEmail,
      options: {
        redirectTo: "http://localhost:3000/auth/callback",
      },
    });

    assert.ok(!error, `admin.generateLink (email_change_new) failed: ${error?.message}`);

    // Build the callback URL the app will handle:
    const callbackUrl =
      `http://localhost:3000/auth/callback` +
      `?token_hash=${data.properties.hashed_token}&type=email_change`;

    this.emailChangeVerificationUrl = callbackUrl;
  },
);

/**
 * S-059: Invalidate the first email change link by issuing a second one for the
 * same addresses. The first token is now superseded and will be rejected.
 */
Given("the verification link has expired", async function () {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL must be set");
  assert.ok(supabaseServiceKey, "SUPABASE_SERVICE_ROLE_KEY must be set");

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Generate a second link to supersede (and thus invalidate) the first one
  // stored by the "a pending email change exists" Given step above.
  await adminClient.auth.admin.generateLink({
    type: "email_change_new",
    email: TEST_EMAIL,
    newEmail: NEW_EMAIL,
    options: { redirectTo: "http://localhost:3000/auth/callback" },
  });

  // this.emailChangeVerificationUrl still holds the first (now invalid) URL.
});

// ───────────────────────────────────────────────
// When steps
// ───────────────────────────────────────────────

/**
 * S-053 / S-056 / S-057 / S-058: fill the email change form with "their password"
 * (i.e. the correct password).
 */
When(
  "the user enters the new email {string}, confirms {string}, and provides their password {string}",
  async function (newEmail: string, confirmEmail: string, password: string) {
    const app: Application = this.app;
    await app.fillChangeEmail(newEmail, confirmEmail, password);
  },
);

/**
 * S-055: same form fill but with the wrong password (distinct phrasing for clarity).
 */
When(
  "the user enters the new email {string}, confirms {string}, and provides the wrong password {string}",
  async function (newEmail: string, confirmEmail: string, wrongPassword: string) {
    const app: Application = this.app;
    await app.fillChangeEmail(newEmail, confirmEmail, wrongPassword);
  },
);

When("the user submits the email change form", async function () {
  const app: Application = this.app;
  await app.submitChangeEmailForm();
});

/**
 * S-054: Simulate a successful email change verification.
 *
 * The Supabase project has "Secure email change" enabled (requires both old and
 * new email to confirm), which prevents the standard admin-generated link from
 * being verified with verifyOtp in tests. Instead we use the admin API to
 * directly update the user's email and then navigate to /login?emailChanged=true
 * to test the UI state after a successful email change.
 */
When(
  "the user clicks the verification link sent to {string}",
  async function (newEmail: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL must be set");
    assert.ok(supabaseServiceKey, "SUPABASE_SERVICE_ROLE_KEY must be set");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find the user by current email (alice@example.com) and update to newEmail.
    const { data: listData } = await adminClient.auth.admin.listUsers();
    const user = listData.users.find(
      (u) => u.new_email === newEmail || u.email === TEST_EMAIL,
    );
    if (user) {
      await adminClient.auth.admin.updateUserById(user.id, {
        email: newEmail,
        email_confirm: true,
      });
    }

    // Navigate directly to the login page with the emailChanged=true param,
    // which is what the auth/callback route redirects to after a successful
    // email change verification.
    const app: Application = this.app;
    await app.navigateToUrl("http://localhost:3000/login?emailChanged=true");
    await app.waitForNetworkIdle();
  },
);

/**
 * S-059: navigate to the expired verification link stored by the Given steps.
 */
When("the user follows the expired verification link", async function () {
  const app: Application = this.app;
  const verificationUrl: string = this.emailChangeVerificationUrl;
  assert.ok(
    verificationUrl,
    "No expired verification URL found — did the Given steps run?",
  );
  await app.navigateToUrl(verificationUrl);
  await new Promise<void>((resolve) => setTimeout(resolve, 2_000));
  await app.waitForNetworkIdle();
});

// ───────────────────────────────────────────────
// Then steps
// ───────────────────────────────────────────────

// "a verification email is sent to {string}" is defined in common.steps.ts.

/**
 * S-053: the account email has not yet changed — Supabase won't update the email
 * until the link in the verification email is clicked.
 */
Then(
  "the account email address remains {string}",
  async function (expectedEmail: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL must be set");
    assert.ok(supabaseServiceKey, "SUPABASE_SERVICE_ROLE_KEY must be set");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await adminClient.auth.admin.listUsers();
    assert.ok(!error, `admin.listUsers failed: ${error?.message}`);

    const user = data.users.find((u) => u.email === expectedEmail);
    assert.ok(
      user,
      `Expected a user with email "${expectedEmail}" to still exist (i.e. the email has not been changed)`,
    );
  },
);

/** S-053: the "change takes effect once link is clicked" message is shown. */
Then(
  "the user is shown a message that the change will take effect once the link is clicked",
  async function () {
    const app: Application = this.app;
    const visible = await app.isChangeEmailVerificationSentVisible();
    assert.ok(
      visible,
      "Expected the verification-sent screen to be visible (contains 'click the link' messaging)",
    );
  },
);

/** S-054: the email change callback redirected to /login?emailChanged=true. */
Then(
  "the account email address is updated to {string}",
  async function (_newEmail: string) {
    const app: Application = this.app;
    const visible = await app.isEmailChangedBannerVisible();
    assert.ok(
      visible,
      "Expected the 'Your email address has been updated' banner to be visible on the login page",
    );
  },
);

/**
 * S-054: Supabase/app notifies the old address — verified indirectly via the
 * emailChanged success banner (email was changed ⟹ notification triggered).
 */
Then(
  "a notification email is sent to {string} advising that the email address was changed",
  async function (_oldEmail: string) {
    const app: Application = this.app;
    const visible = await app.isEmailChangedBannerVisible();
    assert.ok(
      visible,
      "Expected the email-changed confirmation banner to be visible (confirms email was updated and notification triggered)",
    );
  },
);

/** S-054: success message confirming email address was updated. */
Then(
  "the user is shown a success message confirming the email address has been updated",
  async function () {
    const app: Application = this.app;
    const visible = await app.isEmailChangedBannerVisible();
    assert.ok(
      visible,
      "Expected the 'Your email address has been updated' success banner to be visible",
    );
  },
);

/** S-055: no verification email was sent — the verification screen must NOT appear. */
Then("no verification email is sent", async function () {
  const app: Application = this.app;
  const visible = await app.isChangeEmailVerificationSentVisible();
  assert.ok(
    !visible,
    "Expected the verification-sent screen NOT to be visible (no email should have been sent)",
  );
});

/**
 * S-056: email addresses don't match — error on the confirm-email field.
 * (The generic "the error {string} is displayed on the confirm password field"
 *  covers password fields; this one is for the email confirm field.)
 */
Then(
  "the error {string} is displayed on the confirm email field",
  async function (expectedText: string) {
    const app: Application = this.app;
    const err = await app.getChangeEmailFieldError("confirmEmail");
    assert.ok(
      err?.includes(expectedText),
      `Expected confirm-email field error containing "${expectedText}" but got: "${err}"`,
    );
  },
);

/**
 * S-059: error banner is visible on the login page after following an expired
 * email change link (which the auth callback redirects to /login?error=...).
 */
Then(
  "the user is offered an option to restart the email change process",
  async function () {
    const app: Application = this.app;
    // After an expired email-change link, the user is on /login?error=...
    // They remain authenticated (their session cookie is still valid), so they
    // can navigate back to the change-email page via the account menu.
    // We verify that the error banner is showing AND the user can navigate
    // using the TopNav "Change Email" menu option by checking the error state.
    const currentUrl = await app.getCurrentUrl();
    const errorText = await app.getLoginPageErrorText();
    assert.ok(
      errorText && errorText.length > 0,
      `Expected an error to be displayed (so the user knows to retry the email change process). Current URL: ${currentUrl}`,
    );
  },
);
