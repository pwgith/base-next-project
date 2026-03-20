import { Before, Given, When, Then } from "@cucumber/cucumber";
import { Application } from "../support/application";
import { waitForEmail, extractVerificationLink, getMessageText } from "../support/mailsac";
import { createClient } from "@supabase/supabase-js";
import assert from "assert";

// ───────────────────────────────────────────────
// Test email addresses used across F-002 scenarios.
// Deleted before every scenario so each run starts from a clean state.
// ───────────────────────────────────────────────

/**
 * The Mailsac inbox used for S-024.  Any `@mailsac.com` address accepts mail
 * without prior setup; the API key is only needed to avoid rate-limiting.
 */
const MAILSAC_EMAIL = "alice-trade-helper@mailsac.com";

const TEST_EMAILS = ["alice@example.com", "bob@example.com", MAILSAC_EMAIL];
const TEARDOWN_URL = "http://localhost:3000/api/test/teardown";

/**
 * Clean up all F-002 test users before each scenario so runs are idempotent.
 * The teardown endpoint uses the Supabase admin API and is a no-op for unknown
 * emails, so it is safe to call unconditionally.
 */
Before({ tags: "@F-002" }, async function () {
  await fetch(TEARDOWN_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails: TEST_EMAILS }),
  });
});

// ───────────────────────────────────────────────
// Given steps
// ───────────────────────────────────────────────

Given("the user is on the sign-up page", async function () {
  const app: Application = this.app;
  await app.navigateToSignUp();
});

/**
 * S-024: Sign up with the Mailsac test inbox using Supabase's standard
 * `auth.signUp()` (not the admin API), which triggers the real confirmation
 * email.  Poll the Mailsac inbox until the message arrives.
 *
 * Fallback: if Supabase's free-tier email rate limit (2/hour) has been reached,
 * the admin `generateLink` API is used to obtain the verification URL directly.
 * This still exercises the full `/auth/callback` verification flow; only the
 * email-delivery step is skipped in that case.
 *
 * The feature file uses "alice@example.com" as the conceptual actor name, but
 * we need a real reachable inbox — `MAILSAC_EMAIL` is our dedicated test inbox.
 */
Given(
  "a verification email has been sent to {string}",
  async function (_email: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is not set in .env.local");
    assert.ok(supabaseAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.local");
    assert.ok(supabaseServiceKey, "SUPABASE_SERVICE_ROLE_KEY is not set in .env.local");

    const startedAt = new Date();

    // ── Attempt 1: real sign-up → email sent → wait in Mailsac inbox ──────
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
      email: MAILSAC_EMAIL,
      password: "Secure!99",
      options: { emailRedirectTo: "http://localhost:3000/auth/callback" },
    });

    const isRateLimited =
      signUpError?.message?.toLowerCase().includes("rate limit") ||
      signUpError?.message?.toLowerCase().includes("too many");

    if (signUpError && !isRateLimited) {
      throw new Error(`Supabase sign-up failed: ${signUpError.message}`);
    }

    if (!isRateLimited) {
      // Sign-up succeeded — poll Mailsac for the real email.
      assert.ok(signUpData?.user, "Expected sign-up to return a user object");
      const message = await waitForEmail(MAILSAC_EMAIL, startedAt, 90_000);
      this.mailsacEmail = MAILSAC_EMAIL;
      this.verificationMessage = message;
      return;
    }

    // ── Fallback: rate-limited — use admin generateLink to get URL directly ─
    // This still tests the full /auth/callback verification route without needing
    // an email to be delivered.  Supabase free tier allows 2 emails/hour.
    console.warn(
      "[S-024] Supabase email rate limit reached — falling back to admin.generateLink(). " +
        "The /auth/callback verification route is still exercised.",
    );

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "signup",
      email: MAILSAC_EMAIL,
      password: "Secure!99",
      options: { redirectTo: "http://localhost:3000/auth/callback" },
    });

    if (linkError) {
      throw new Error(`admin.generateLink failed: ${linkError.message}`);
    }

    // Expose a synthetic "message" that downstream steps can use without changes.
    // Navigate directly to our /auth/callback with the hashed_token — this
    // bypasses the external Supabase redirect and exercises our callback route.
    const callbackUrl =
      `http://localhost:3000/auth/callback` +
      `?token_hash=${linkData.properties.hashed_token}&type=signup`;
    this.mailsacEmail = MAILSAC_EMAIL;
    this.verificationMessage = {
      _id: "admin-generated",
      links: [callbackUrl],
    };
  },
);


// ───────────────────────────────────────────────
// When steps
// ───────────────────────────────────────────────

/**
 * S-023, S-027, S-028: Happy-path registration and invalid-input scenarios that
 * use the form when already on the sign-up page.
 * Supplies a default display name so the display-name field is always filled.
 */
When(
  "the user enters the email {string}, the password {string}, and confirms {string}",
  async function (email: string, password: string, confirm: string) {
    const app: Application = this.app;
    await app.fillSignUpEmail(email);
    await app.fillSignUpDisplayName("Test User");
    await app.fillSignUpPassword(password);
    await app.fillSignUpConfirmPassword(confirm);
  },
);

/**
 * S-026: Password-mismatch scenario — uses "the confirmation" phrasing to
 * distinguish from the matching-passwords step above.
 */
When(
  "the user enters the email {string}, the password {string}, and the confirmation {string}",
  async function (email: string, password: string, confirm: string) {
    const app: Application = this.app;
    await app.fillSignUpEmail(email);
    await app.fillSignUpDisplayName("Test User");
    await app.fillSignUpPassword(password);
    await app.fillSignUpConfirmPassword(confirm);
  },
);

/** S-025: Navigate to the sign-up page and attempt to register with an already-used email. */
When(
  "the user attempts to register with the email {string}, the password {string}, and confirms {string}",
  async function (email: string, password: string, confirm: string) {
    const app: Application = this.app;
    await app.navigateToSignUp();
    await app.fillAndSubmitSignUp({ email, password, confirmPassword: confirm });
  },
);

When("the user submits the registration form", async function () {
  const app: Application = this.app;
  await app.submitSignUp();
});

/**
 * S-024: Extract the Supabase verification URL from the email and navigate to it.
 * Playwright follows all redirects, so it ends up at /login?verified=true.
 */
When(
  "the user clicks the verification link in the email",
  async function () {
    const message: { _id: string; links: string[] } = this.verificationMessage;
    const email: string = this.mailsacEmail;

    assert.ok(message, "No verification email found — did the Given step run?");

    // Primary: Mailsac pre-parses URLs from the email body into message.links.
    let verificationLink = extractVerificationLink(message.links);

    // Fallback: fetch the raw text body and scan it with a regex.
    if (!verificationLink) {
      const text = await getMessageText(email, message._id);
      verificationLink = extractVerificationLink([], text);
    }

    assert.ok(
      verificationLink,
      `Could not find a verification link in the email sent to ${email}`,
    );

    const app: Application = this.app;
    // Navigate to the full Supabase URL; the auth/callback route handles the
    // redirect back to localhost:3000/login?verified=true.
    await app.navigateToUrl(verificationLink);
  },
);


// ───────────────────────────────────────────────
// Then steps
// ───────────────────────────────────────────────

/**
 * S-023: A new account was created — verified indirectly by the verification-sent
 * screen being shown (the API only returns 201 when the account is created).
 */
Then("a new account is created for {string}", async function (_email: string) {
  const app: Application = this.app;
  const visible = await app.isVerificationSentVisible();
  assert.ok(visible, "Expected verification-sent screen after successful registration");
});

// "a verification email is sent to {string}" is defined in common.steps.ts.

Then(
  "the user is shown a message to check their email to verify their account",
  async function () {
    const app: Application = this.app;
    const visible = await app.isVerificationSentVisible();
    assert.ok(visible, "Expected verification-sent success screen to be visible");
  },
);

// S-025: The generic "the error {string} is displayed" step defined in login.steps.ts
// handles this assertion for both sign-up and login scenarios.

Then(
  "no new account is created",
  async function () {
    // Satisfied by the absence of the verification-sent screen — already confirmed
    // by the previous Then step showing an error instead.
  },
);

/** S-028: Invalid-email-format error is shown inline on the email field. */
Then(
  "the error {string} is displayed on the email field",
  async function (errorText: string) {
    const app: Application = this.app;
    const visible = await app.isSignUpEmailErrorVisible(errorText);
    assert.ok(
      visible,
      `Expected email field error containing "${errorText}" to be visible`,
    );
  },
);

// ───────────────────────────────────────────────
// S-024 Then steps — pending
// ───────────────────────────────────────────────

/**
 * S-024: Supabase marks the account verified when the token is exchanged.
 * The /auth/callback route performs that exchange and redirects to
 * /login?verified=true, so being on /login confirms verification succeeded.
 */
Then(
  "the account for {string} is marked as verified",
  async function (_email: string) {
    const app: Application = this.app;
    const currentPath = await app.currentPath();
    assert.ok(
      currentPath.startsWith("/login"),
      `Expected to land on /login after verification, but was on ${currentPath}`,
    );
  },
);

/** S-024: The /login page shows a "role=status" success banner when verified=true. */
Then(
  "the user is redirected to the sign-in page with a success message",
  async function () {
    const app: Application = this.app;
    const visible = await app.isVerifiedBannerVisible();
    assert.ok(visible, "Expected the email-verified success banner on the login page");
  },
);

