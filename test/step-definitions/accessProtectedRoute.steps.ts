import { Given, When, Then } from "@cucumber/cucumber";
import { Application } from "../support/application";
import assert from "assert";

// ─── F-008 / UC-USR-009: Access Protected Route Without Session ───────────────

/**
 * S-060: A fresh browser context has no session by default.
 * Explicitly clearing cookies ensures the step is correct even if other
 * scenarios in the same run left residual state.
 */
Given("the user has no active session", async function () {
  const app: Application = this.app;
  await app.ensureSignedOut();
});

/** S-060: Navigate directly to a protected path. */
When("the user navigates to {string}", async function (path: string) {
  const app: Application = this.app;
  await app.navigateTo(path);
});

/** S-036/S-037/S-038/S-060: The middleware should have redirected to the sign-in page. */
Then("the user is redirected to the sign-in page", async function () {
  const app: Application = this.app;
  const path = await app.currentPath();
  assert.ok(path.startsWith("/login"), `Expected to be on the sign-in page (/login) but current path is "${path}"`);
});

/**
 * S-060: The redirectTo query parameter should carry the originally requested path
 * so the user is returned there after a successful sign-in.
 */
Then(
  "the sign-in page preserves {string} as the return destination",
  async function (expectedPath: string) {
    const app: Application = this.app;
    const target = await app.getLoginRedirectTarget();
    assert.strictEqual(
      target,
      expectedPath,
      `Expected redirectTo="${expectedPath}" in the sign-in URL but got "${target}"`,
    );
  },
);
