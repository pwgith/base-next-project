import { Page, Locator } from "playwright";

/**
 * Page Object for the Sign Up page (/sign-up).
 * Locators follow the Playwright priority: getByRole > getByLabel > getByText > getByTestId.
 */
export class SignUpPage {
  private readonly page: Page;

  // ─── Locators ─────────────────────────────────────────────────────────────
  readonly emailInput: Locator;
  readonly displayNameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly generalError: Locator;
  readonly successHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email address");
    this.displayNameInput = page.getByLabel("Display name");
    // getByLabel("Password") matches the "Show password" toggle buttons via aria-label,
    // so we use the input's name attribute for an unambiguous locator.
    this.passwordInput = page.locator('input[name="password"]');
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    this.submitButton = page.getByRole("button", { name: "Create account" });
    // Exclude the Next.js internal route-announcer which also carries role="alert".
    this.generalError = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
    this.successHeading = page.getByRole("heading", { name: "Check your inbox" });
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto("http://localhost:3000/sign-up");
    await this.page.waitForLoadState("networkidle", { timeout: 60_000 });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillDisplayName(displayName: string): Promise<void> {
    await this.displayNameInput.fill(displayName);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async fillConfirmPassword(password: string): Promise<void> {
    await this.confirmPasswordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
    // Wait for the page to settle: either the API response has been processed and
    // React has re-rendered (verification screen or error shown), or client-side
    // validation rejected the form immediately (field errors appear with no network call).
    await this.page.waitForLoadState("networkidle", { timeout: 30_000 });
    // Give React one tick to flush state updates after the network promise resolves.
    await this.page.waitForTimeout(300);
  }

  /**
   * Fill all sign-up fields and submit.
   * If displayName is omitted a default is used.
   */
  async fillAndSubmit(options: {
    email: string;
    password: string;
    confirmPassword: string;
    displayName?: string;
  }): Promise<void> {
    await this.fillEmail(options.email);
    await this.fillDisplayName(options.displayName ?? "Test User");
    await this.fillPassword(options.password);
    await this.fillConfirmPassword(options.confirmPassword);
    await this.submit();
  }

  // ─── State queries ────────────────────────────────────────────────────────

  /** Wait for and return true if the verification-sent screen is visible. */
  async isVerificationSentVisible(): Promise<boolean> {
    try {
      // Actively wait — the API call + React re-render can take a few seconds.
      await this.successHeading.waitFor({ state: "visible", timeout: 15_000 });
      return true;
    } catch {
      return false;
    }
  }

  async getGeneralErrorText(): Promise<string | null> {
    // 1. Check the general alert banner first.
    const alertVisible = await this.generalError.isVisible();
    if (alertVisible) {
      const alertText = await this.generalError.textContent();
      if (alertText?.trim()) return alertText.trim();
    }

    // 2. Fall back to any visible field-level inline error paragraph.
    //    EMAIL_TAKEN is displayed below the email input, not in the alert.
    //    Look for any <p> element whose text content is non-empty and
    //    whose colour styling indicates it is an error message.
    const candidates = this.page.locator(
      'p.text-red-600, p[class*="text-red-"]',
    );
    const count = await candidates.count();
    for (let i = 0; i < count; i++) {
      const el = candidates.nth(i);
      if (await el.isVisible()) {
        const text = await el.textContent();
        if (text?.trim()) return text.trim();
      }
    }

    return null;
  }

  /**
   * Get the text of a field-level error message by the label of the associated field.
   * Returns null if no error is visible.
   */
  async getFieldError(fieldLabel: string): Promise<string | null> {
    // Field errors are <p> elements that follow each input group.
    // We find the label, then look for the next sibling error paragraph.
    const label = this.page.getByText(fieldLabel, { exact: true });
    if (!(await label.isVisible())) return null;

    // Error paragraphs contain recognisable text adjacent to the field group.
    // Strategy: find any visible <p> with class text-red-600 near the field grouping.
    // The input group for each field is wrapped in a <div> — find it by label association.
    const input = this.page.getByLabel(fieldLabel);
    const inputBox = await input.boundingBox();
    if (!inputBox) return null;

    // Look for a red error paragraph below this input
    const errors = this.page.locator("p.text-red-600, p.text-xs.text-red-600");
    const count = await errors.count();

    for (let i = 0; i < count; i++) {
      const errEl = errors.nth(i);
      const box = await errEl.boundingBox();
      if (!box) continue;
      // The error paragraph is below the input (same horizontal band, lower y)
      if (
        box.y > inputBox.y &&
        box.y < inputBox.y + 200 && // within 200px below
        Math.abs(box.x - inputBox.x) < 200 // roughly same column
      ) {
        return errEl.textContent();
      }
    }

    return null;
  }

  /** Check if any password strength error is visible. */
  async isPasswordStrengthErrorVisible(): Promise<boolean> {
    const passwordErrorLocator = this.page.locator("p", {
      hasText: /password must be|password does not/i,
    });
    return passwordErrorLocator.isVisible();
  }

  /** Check if the "Passwords do not match" error is visible. */
  async isPasswordMismatchErrorVisible(): Promise<boolean> {
    const mismatchLocator = this.page.locator("p", {
      hasText: /passwords do not match/i,
    });
    return mismatchLocator.isVisible();
  }

  /** Check if the email field has an error containing the given text. */
  async isEmailErrorVisible(partialText: string): Promise<boolean> {
    const emailErrorLocator = this.page.locator("p", {
      hasText: new RegExp(partialText, "i"),
    });
    return emailErrorLocator.isVisible();
  }
}
