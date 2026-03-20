import { Page, Locator } from "playwright";

/**
 * Page Object for the Reset Password pages:
 *   - Request page: /reset-password
 *   - Confirm page: /reset-password/confirm?token_hash=...&type=recovery
 */
export class ResetPasswordPage {
  private readonly page: Page;

  // ── Request form ────────────────────────────────────────────────────────────
  readonly emailInput: Locator;
  readonly sendResetLinkButton: Locator;
  readonly sentHeading: Locator;

  // ── Confirm form ────────────────────────────────────────────────────────────
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly setNewPasswordButton: Locator;
  readonly successHeading: Locator;
  readonly expiredHeading: Locator;
  readonly usedHeading: Locator;
  readonly requestNewLinkButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Request form
    this.emailInput = page.locator('input[name="email"]');
    this.sendResetLinkButton = page.getByRole("button", { name: "Send reset link" });
    this.sentHeading = page.getByRole("heading", { name: /check your email/i });

    // Confirm form
    this.newPasswordInput = page.locator('input[name="newPassword"]');
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    this.setNewPasswordButton = page.getByRole("button", { name: /set new password/i });
    this.successHeading = page.getByRole("heading", { name: /password reset successfully/i });
    this.expiredHeading = page.getByRole("heading", { name: /reset link has expired/i });
    this.usedHeading = page.getByRole("heading", { name: /already been used/i });
    this.requestNewLinkButton = page.getByRole("link", { name: "Request a new link" });
  }

  async goto(): Promise<void> {
    await this.page.goto("http://localhost:3000/reset-password");
    await this.page.waitForLoadState("networkidle", { timeout: 60_000 });
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async submit(): Promise<void> {
    await this.sendResetLinkButton.click();
    await Promise.race([
      this.sentHeading.waitFor({ state: "visible", timeout: 30_000 }),
    ]).catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  }

  async isSentVisible(): Promise<boolean> {
    try {
      await this.sentHeading.waitFor({ state: "visible", timeout: 10_000 });
      return true;
    } catch {
      return false;
    }
  }

  // ── Confirm page methods ───────────────────────────────────────────────────

  async fillNewPassword(password: string): Promise<void> {
    await this.newPasswordInput.fill(password);
  }

  async fillConfirmPassword(password: string): Promise<void> {
    await this.confirmPasswordInput.fill(password);
  }

  async submitConfirm(): Promise<void> {
    await this.setNewPasswordButton.click();
    await Promise.race([
      this.successHeading.waitFor({ state: "visible", timeout: 30_000 }),
      this.page.waitForSelector("p.text-xs.text-red-600", { timeout: 30_000 }),
    ]).catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  }

  async isSuccessVisible(): Promise<boolean> {
    try {
      await this.successHeading.waitFor({ state: "visible", timeout: 15_000 });
      return true;
    } catch {
      return false;
    }
  }

  async isExpiredVisible(): Promise<boolean> {
    try {
      await this.expiredHeading.waitFor({ state: "visible", timeout: 10_000 });
      return true;
    } catch {
      return false;
    }
  }

  async isUsedVisible(): Promise<boolean> {
    try {
      await this.usedHeading.waitFor({ state: "visible", timeout: 10_000 });
      return true;
    } catch {
      return false;
    }
  }

  async getConfirmFieldError(
    field: "newPassword" | "confirmPassword",
  ): Promise<string | null> {
    try {
      const input = this.page.locator(`input[name="${field}"]`);
      const errorEl = input.locator(
        "xpath=ancestor::div[1]/following-sibling::p[contains(@class,'text-red-600')]",
      );
      await errorEl.waitFor({ state: "visible", timeout: 5_000 });
      return (await errorEl.textContent())?.trim() ?? null;
    } catch {
      return null;
    }
  }

  async clickRequestNewLink(): Promise<void> {
    await this.requestNewLinkButton.first().click();
    await this.page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  }
}
