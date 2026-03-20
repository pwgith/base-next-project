import { Before, Given, When, Then } from "@cucumber/cucumber";
import { Application } from "../support/application";
import assert from "assert";

const TEST_EMAILS = ["alice@example.com"];
const TEARDOWN_URL = "http://localhost:3000/api/test/teardown";

Before({ tags: "@F-004" }, async function () {
  await fetch(TEARDOWN_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails: TEST_EMAILS }),
  });
});

// ───────────────────────────────────────────────
// When steps
// ───────────────────────────────────────────────

/** S-036 / S-038: sign out via the account menu. */
When("the user signs out", async function () {
  const app: Application = this.app;
  await app.signOut();
});

// ───────────────────────────────────────────────
// Given steps
// ───────────────────────────────────────────────

/**
 * S-037: the user has already completed sign-out.
 * We clear the session cookie directly so the browser has no authentication
 * state without navigating through the sign-out UI again.
 */
Given("the user has signed out", async function () {
  const app: Application = this.app;
  await app.signOut();
});

/**
 * S-038: simulate an expired session by deleting the session cookie directly.
 * The Supabase client-side session may still be present in memory, which is
 * the realistic "expired session" scenario — the server-side cookie is gone
 * but the client still thinks the user is signed in.
 */
Given("the user's session has already expired", async function () {
  const app: Application = this.app;
  await app.ensureSignedOut();
});

/** S-037: navigate to a protected route (identical to the login.feature step). */
When("the user attempts to access {string}", async function (path: string) {
  const app: Application = this.app;
  await app.navigateTo(path);
});

// ───────────────────────────────────────────────
// Then steps
// ───────────────────────────────────────────────

// "the user is redirected to the sign-in page" is defined in accessProtectedRoute.steps.ts.

/** S-036: verify the signed-out confirmation banner is visible. */
Then(
  "a confirmation message is shown that the user has been signed out",
  async function () {
    const app: Application = this.app;
    const visible = await app.isSignedOutBannerVisible();
    assert.ok(visible, "Expected the signed-out confirmation banner to be visible");
  },
);

/** S-038: verify that no session cookies remain after sign-out. */
Then("any locally stored authentication data is cleared", async function () {
  const app: Application = this.app;
  const hasCookie = await app.hasSessionCookie();
  assert.ok(
    !hasCookie,
    "Expected the sb_session cookie to be absent after sign-out",
  );
});
