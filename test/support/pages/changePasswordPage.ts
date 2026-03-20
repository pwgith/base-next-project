import { Page, Locator } from "playwright";

/**
 * Page Object for the Change Password page (/account/change-password).
 */
export class ChangePasswordPage {
  private readonly page: Page;

  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly alertMessage: Locator;
  readonly successHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.currentPasswordInput = page.locator('input[name="currentPassword"]');
    this.newPasswordInput = page.locator('input[name="newPassword"]');
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    this.submitButton = page.getByRole("button", { name: "Update password" });
    this.alertMessage = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
    this.successHeading = page.getByRole("heading", { name: /password has been changed/i });
  }

  async goto(): Promise<void> {
    await this.page.goto("http://localhost:3000/account/change-password");
    await this.page.waitForLoadState("networkidle", { timeout: 60_000 });
  }

  async fillCurrentPassword(password: string): Promise<void> {
    await this.currentPasswordInput.fill(password);
  }

  async fillNewPassword(password: string): Promise<void> {
    await this.newPasswordInput.fill(password);
  }

  async fillConfirmPassword(password: string): Promise<void> {
    await this.confirmPasswordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
    // Wait for either a success heading or an error/field error to appear.
    await Promise.race([
      this.successHeading.waitFor({ state: "visible", timeout: 30_000 }),
      this.alertMessage.waitFor({ state: "visible", timeout: 30_000 }),
      this.page.waitForSelector("p.text-xs.text-red-600", { timeout: 30_000 }),
    ]).catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  }

  /** Returns the text of the general alert message, or null if none. */
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
   * The form renders error text in a <p class="text-xs text-red-600"> immediately
   * after the corresponding input.
   */
  async getFieldError(
    field: "currentPassword" | "newPassword" | "confirmPassword",
  ): Promise<string | null> {
    try {
      const input = this.page.locator(`input[name="${field}"]`);
      // The error paragraph is a sibling inside the same parent div.
      const errorEl = input
        .locator("xpath=ancestor::div[1]/following-sibling::p[contains(@class,'text-red-600')]");
      await errorEl.waitFor({ state: "visible", timeout: 5_000 });
      return (await errorEl.textContent())?.trim() ?? null;
    } catch {
      return null;
    }
  }

  async isSuccessVisible(): Promise<boolean> {
    try {
      await this.successHeading.waitFor({ state: "visible", timeout: 15_000 });
      return true;
    } catch {
      return false;
    }
  }
}
