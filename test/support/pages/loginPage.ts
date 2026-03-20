import { Page, Locator } from "playwright";

/**
 * Page Object for the Login page (/login).
 */
export class LoginPage {
  private readonly page: Page;

  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly submitButton: Locator;
  readonly generalError: Locator;
  readonly forgotPasswordLink: Locator;
  readonly resendVerificationButton: Locator;
  readonly verificationSuccessBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.rememberMeCheckbox = page.locator('input[name="rememberMe"]');
    this.submitButton = page.getByRole("button", { name: "Sign in" });
    // Exclude the Next.js internal route-announcer element which also carries
    // role="alert" / aria-live="assertive".
    this.generalError = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
    this.forgotPasswordLink = page.getByRole("link", { name: "Forgot password?" });
    this.resendVerificationButton = page.getByRole("button", { name: /resend verification/i });
    this.verificationSuccessBanner = page.getByRole("status");
  }

  async goto(): Promise<void> {
    await this.page.goto("http://localhost:3000/login");
    await this.page.waitForLoadState("networkidle", { timeout: 60_000 });
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();

    // Wait for EITHER:
    //   • the URL to change away from /login (successful sign-in + redirect), OR
    //   • an error/status alert to appear (failed sign-in).
    // This is more reliable than a fixed timeout or a pure networkidle wait.
    await Promise.race([
      this.page.waitForURL(
        (url) => !url.pathname.startsWith("/login"),
        { timeout: 30_000 },
      ),
      this.page.waitForSelector(
        '[role="alert"]:not([id="__next-route-announcer__"])',
        { timeout: 30_000 },
      ),
    ]).catch(() => {
      // Neither happened within 30s — let assertions report the failure.
    });

    // Allow any remaining navigation to fully settle.
    await this.page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(
      () => {},
    );
    await this.page.waitForTimeout(300);
  }

  async fillAndSubmit(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async getGeneralErrorText(): Promise<string | null> {
    try {
      await this.generalError.waitFor({ state: "visible", timeout: 10_000 });
      const text = await this.generalError.textContent();
      return text?.trim() ?? null;
    } catch {
      return null;
    }
  }

  async isUnverifiedAlertVisible(): Promise<boolean> {
    try {
      await this.generalError.waitFor({ state: "visible", timeout: 10_000 });
      const text = await this.generalError.textContent();
      return (text ?? "").toLowerCase().includes("verify");
    } catch {
      return false;
    }
  }

  async isResendVerificationVisible(): Promise<boolean> {
    return this.resendVerificationButton.isVisible();
  }

  async isSignedOutBannerVisible(): Promise<boolean> {
    try {
      await this.verificationSuccessBanner.waitFor({ state: "visible", timeout: 5_000 });
      const text = await this.verificationSuccessBanner.textContent();
      return (text ?? "").toLowerCase().includes("signed out");
    } catch {
      return false;
    }
  }

  async isVerificationSuccessBannerVisible(): Promise<boolean> {
    try {
      await this.verificationSuccessBanner.waitFor({ state: "visible", timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  /** Returns true if the "Your email address has been updated" banner is visible. */
  async isEmailChangedBannerVisible(): Promise<boolean> {
    try {
      await this.verificationSuccessBanner.waitFor({ state: "visible", timeout: 10_000 });
      const text = await this.verificationSuccessBanner.textContent();
      return (text ?? "").toLowerCase().includes("email address has been updated");
    } catch {
      return false;
    }
  }

  /** Returns the text of the error alert on the login page, or null if none. */
  async getErrorText(): Promise<string | null> {
    try {
      await this.generalError.waitFor({ state: "visible", timeout: 5_000 });
      return (await this.generalError.textContent())?.trim() ?? null;
    } catch {
      return null;
    }
  }

  /** Returns the current page URL path. */
  currentPath(): string {
    return new URL(this.page.url()).pathname;
  }

  /** Returns the current full URL. */
  currentUrl(): string {
    return this.page.url();
  }
}
