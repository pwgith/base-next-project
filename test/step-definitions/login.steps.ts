import { Before, Given, When, Then } from "@cucumber/cucumber";
import { Application } from "../support/application";
import assert from "assert";

// ───────────────────────────────────────────────
// Test email addresses used across F-003 scenarios.
// Deleted before every scenario so each run starts from a clean state.
// ───────────────────────────────────────────────

const TEST_EMAILS = [
  "alice@example.com",
  "unverified@example.com",
  "unknown@example.com",
];

const TEARDOWN_URL = "http://localhost:3000/api/test/teardown";
const SETUP_URL = "http://localhost:3000/api/test/setup";

/**
 * Before each F-003 scenario:
 *  1. Delete all test users so each run starts clean.
 *
 * The Background step then re-creates alice@example.com as a verified account.
 */
Before({ tags: "@F-003" }, async function () {
  await fetch(TEARDOWN_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails: TEST_EMAILS }),
  });
});

// ───────────────────────────────────────────────
// Background / shared Given steps
// ───────────────────────────────────────────────

/**
 * Background: creates a verified account via the test-setup API.
 * This is faster than going through the sign-up form and clicking a
 * verification link because it uses the Supabase admin API directly.
 */
Given(
  "a verified account exists for {string} with password {string}",
  async function (email: string, password: string) {
    const response = await fetch(SETUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [{ email, password, verified: true }],
      }),
    });
    assert.ok(
      response.ok,
      `Expected setup to succeed for verified ${email}, got ${response.status}`,
    );
  },
);

/**
 * S-034 (also S-029 in F-002): create an account that has NOT been email-verified.
 * Uses the sign-up API, which sets email_confirm: false.
 */
Given(
  "a user has registered with {string} but has not yet verified their email",
  async function (email: string) {
    const response = await fetch("http://localhost:3000/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        displayName: "Unverified User",
        password: "Secure!99",
        confirmPassword: "Secure!99",
      }),
    });
    assert.ok(
      response.status === 201,
      `Expected 201 when creating unverified account for ${email}, got ${response.status}`,
    );
  },
);

/**
 * S-035: ban alice@example.com to simulate a locked account.
 * Alice will already exist from the Background step, so the setup endpoint
 * updates her ban_duration via the admin API.
 */
Given(
  "the account for {string} is locked due to too many failed sign-in attempts",
  async function (email: string) {
    const response = await fetch(SETUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [{ email, password: "Secure!99", verified: true, banned: true }],
      }),
    });
    assert.ok(
      response.ok,
      `Expected setup to succeed for banning ${email}, got ${response.status}`,
    );
  },
);

/** S-030, S-032, S-033, S-035: navigate to the login page via the normal URL. */
Given("the user is on the sign-in page", async function () {
  const app: Application = this.app;
  await app.navigateToLogin();
});

/**
 * S-031: navigate to a protected route without being signed in.
 * The middleware redirects to /login?redirectTo=<path>.
 */
Given(
  "the user attempted to access {string} without being signed in",
  async function (path: string) {
    const app: Application = this.app;
    await app.navigateTo(path);
  },
);

// ───────────────────────────────────────────────
// When steps
// ───────────────────────────────────────────────

/**
 * S-030 / S-031: successful sign-in (expects to be redirected away from /login).
 */
When(
  "the user signs in with {string} and {string}",
  async function (email: string, password: string) {
    const app: Application = this.app;
    await app.fillAndSubmitLogin(email, password);
  },
);

/**
 * S-032 / S-033 / S-034 / S-035: sign-in attempt that is expected to fail.
 * Always navigates to the login page first so the page is in a known state
 * (this step is used in scenarios that have no explicit "Given the user is on
 * the sign-in page" step, e.g. S-034).
 */
When(
  "the user attempts to sign in with {string} and {string}",
  async function (email: string, password: string) {
    const app: Application = this.app;
    await app.navigateToLogin();
    await app.fillAndSubmitLogin(email, password);
  },
);

// ───────────────────────────────────────────────
// Then steps
// ───────────────────────────────────────────────

/** S-030: after successful login the user should be on the plans/main page. */
Then("the user is redirected to the main page", async function () {
  const app: Application = this.app;
  const path = await app.currentPath();
  assert.strictEqual(
    path,
    "/plans",
    `Expected redirect to /plans but current path is "${path}"`,
  );
});

/** S-030: the session cookie has been set. */
Then("the user has an active authenticated session", async function () {
  const app: Application = this.app;
  const active = await app.hasActiveSession();
  assert.ok(active, "Expected user to have an active authenticated session");
});

/** S-031: after sign-in the user should be on the originally requested page. */
Then("the user is redirected to {string}", async function (expectedPath: string) {
  const app: Application = this.app;
  const currentPath = await app.currentPath();
  assert.strictEqual(
    currentPath,
    expectedPath,
    `Expected to be redirected to "${expectedPath}" but current path is "${currentPath}"`,
  );
});

/** S-032 / S-033 / S-035: user remains on the sign-in page after a failed attempt. */
Then("the user is not signed in", async function () {
  const app: Application = this.app;
  const path = await app.currentPath();
  assert.ok(
    path.startsWith("/login"),
    `Expected to remain on /login but current path is "${path}"`,
  );
});

/** S-034 (also S-029): the resend-verification button is visible. */
Then(
  "a link to resend the verification email is shown",
  async function () {
    const app: Application = this.app;
    const visible = await app.isResendVerificationVisible();
    assert.ok(visible, "Expected the resend verification button to be visible");
  },
);
