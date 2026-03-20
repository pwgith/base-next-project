import { Page, Locator } from "playwright";

/**
 * Page Object for the Change Email page (/account/change-email).
 */
export class ChangeEmailPage {
  private readonly page: Page;

  readonly newEmailInput: Locator;
  readonly confirmEmailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly alertMessage: Locator;
  readonly verificationSentHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newEmailInput = page.locator('input[name="newEmail"]');
    this.confirmEmailInput = page.locator('input[name="confirmEmail"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.getByRole("button", { name: "Update email address" });
    this.alertMessage = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
    this.verificationSentHeading = page.getByRole("heading", {
      name: /verify your new email/i,
    });
  }

  async goto(): Promise<void> {
    await this.page.goto("http://localhost:3000/account/change-email");
    await this.page.waitForLoadState("networkidle", { timeout: 60_000 });
  }

  async fillNewEmail(email: string): Promise<void> {
    await this.newEmailInput.fill(email);
  }

  async fillConfirmEmail(email: string): Promise<void> {
    await this.confirmEmailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
    await Promise.race([
      this.verificationSentHeading.waitFor({ state: "visible", timeout: 30_000 }),
      this.alertMessage.waitFor({ state: "visible", timeout: 30_000 }),
      this.page.waitForSelector("p.text-xs.text-red-600", { timeout: 30_000 }),
    ]).catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  }

  /** Returns the text of the general alert on the form, or null if none. */
  async getAlertMessage(): Promise<string | null> {
    try {
      await this.alertMessage.waitFor({ state: "visible", timeout: 5_000 });
      return (await this.alertMessage.textContent())?.trim() ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Returns the field-level error text for the given field, or null if none.
   */
  async getFieldError(
    field: "newEmail" | "confirmEmail" | "password",
  ): Promise<string | null> {
    try {
      const input = this.page.locator(`input[name="${field}"]`);
      const errorEl = input.locator(
        "xpath=following-sibling::p[contains(@class,'text-red-600')]",
      );
      await errorEl.waitFor({ state: "visible", timeout: 5_000 });
      return (await errorEl.textContent())?.trim() ?? null;
    } catch {
      return null;
    }
  }

  /** Returns true if the verification-sent screen is visible. */
  async isVerificationSentVisible(): Promise<boolean> {
    try {
      await this.verificationSentHeading.waitFor({ state: "visible", timeout: 15_000 });
      return true;
    } catch {
      return false;
    }
  }
}
