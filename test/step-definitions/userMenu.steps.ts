/**
 * Step definitions for F-009 — User account menu (UC-USR-010).
 *
 * Steps specific to the hamburger / avatar dropdown menu feature.
 * Shared steps (e.g. "the user is signed in as") live in common.steps.ts.
 * "the user is redirected to the sign-in page" is defined in accessProtectedRoute.steps.ts.
 */
import { Before, Given, When, Then } from "@cucumber/cucumber";
import { Application } from "../support/application";
import assert from "assert";

const TEARDOWN_URL = "http://localhost:3000/api/test/teardown";

const TEST_EMAILS = ["alice@example.com"];

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Before each F-009 scenario: delete test users so each run starts clean.
 * The Background step (in common.steps.ts) re-creates and signs in alice.
 */
Before({ tags: "@F-009" }, async function () {
  await fetch(TEARDOWN_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails: TEST_EMAILS }),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Viewport
// ─────────────────────────────────────────────────────────────────────────────

Given("the user is on a desktop viewport", async function () {
  const app: Application = this.app;
  await app.setViewportToDesktop();
});

Given("the user is on a mobile viewport", async function () {
  const app: Application = this.app;
  await app.setViewportToMobile();
});

// ─────────────────────────────────────────────────────────────────────────────
// Account menu setup (Given)
// ─────────────────────────────────────────────────────────────────────────────

Given("the user has opened the account menu", async function () {
  const app: Application = this.app;
  await app.openAccountMenu();
});

// ─────────────────────────────────────────────────────────────────────────────
// Desktop menu — When
// ─────────────────────────────────────────────────────────────────────────────

When("the user opens the account menu", async function () {
  const app: Application = this.app;
  await app.openAccountMenu();
});

When("the user selects {string}", async function (label: string) {
  const app: Application = this.app;
  await app.selectAccountMenuItem(label);
});

When("the user clicks outside the account menu", async function () {
  const app: Application = this.app;
  await app.dismissAccountMenuByClickingOutside();
});

When("the user presses the Escape key", async function () {
  const app: Application = this.app;
  await app.dismissAccountMenuByEscape();
});

// ─────────────────────────────────────────────────────────────────────────────
// Mobile menu — When
// ─────────────────────────────────────────────────────────────────────────────

When("the user taps the hamburger icon", async function () {
  const app: Application = this.app;
  await app.openHamburgerMenu();
});

// ─────────────────────────────────────────────────────────────────────────────
// Desktop menu — Then
// ─────────────────────────────────────────────────────────────────────────────

Then(
  "the menu displays the identity header {string}",
  async function (email: string) {
    const app: Application = this.app;
    const actual = await app.getAccountMenuIdentityEmail();
    assert.strictEqual(
      actual.trim(),
      email,
      `Expected identity header to show "${email}" but got "${actual}"`,
    );
  },
);

Then("the menu contains the {string} action", async function (label: string) {
  const app: Application = this.app;
  const visible = await app.isAccountMenuItemVisible(label);
  assert.ok(
    visible,
    `Expected "${label}" action to be visible in the account menu`,
  );
});

Then("the user is navigated to the profile page", async function () {
  const app: Application = this.app;
  const path = await app.currentPath();
  assert.strictEqual(
    path,
    "/account/profile",
    `Expected path /account/profile but got ${path}`,
  );
});

Then(
  "the user is navigated to the change password page",
  async function () {
    const app: Application = this.app;
    const path = await app.currentPath();
    assert.strictEqual(
      path,
      "/account/change-password",
      `Expected path /account/change-password but got ${path}`,
    );
  },
);

Then("the account menu is closed", async function () {
  const app: Application = this.app;
  const open = await app.isAccountMenuOpen();
  assert.ok(!open, "Expected the account menu to be closed");
});

Then("the user remains on the current page", async function () {
  const app: Application = this.app;
  const path = await app.currentPath();
  assert.strictEqual(
    path,
    "/plans",
    `Expected to remain on /plans but current path is ${path}`,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Mobile menu — Then
// ─────────────────────────────────────────────────────────────────────────────

Then("the slide-down panel is visible", async function () {
  const app: Application = this.app;
  const open = await app.isMobileMenuOpen();
  assert.ok(open, "Expected the mobile navigation panel to be visible");
});

Then(
  "the panel displays the identity header {string}",
  async function (email: string) {
    const app: Application = this.app;
    const actual = await app.getMobileMenuIdentityEmail();
    assert.strictEqual(
      actual.trim(),
      email,
      `Expected mobile panel identity header to show "${email}" but got "${actual}"`,
    );
  },
);

Then(
  "the panel contains the {string} navigation link",
  async function (label: string) {
    const app: Application = this.app;
    const visible = await app.isMobileNavLinkVisible(label);
    assert.ok(
      visible,
      `Expected "${label}" navigation link to be visible in the mobile panel`,
    );
  },
);

Then(
  "the panel contains the {string} action",
  async function (label: string) {
    const app: Application = this.app;
    const visible = await app.isMobileMenuItemVisible(label);
    assert.ok(
      visible,
      `Expected "${label}" action to be visible in the mobile panel`,
    );
  },
);
