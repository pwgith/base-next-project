import { Browser, BrowserContext, Page, chromium } from "playwright";
import type { ToolCallDetail } from "@/types/aiChat";
import { PlansPage } from "./pages/plansPage";
import { LoginPage } from "./pages/loginPage";
import { SignUpPage } from "./pages/signUpPage";
import { TopNavPage } from "./pages/topNavPage";
import { SubscriptionPlansPage } from "./pages/subscriptionPlansPage";
import { ChangePasswordPage } from "./pages/changePasswordPage";
import { ChangeEmailPage } from "./pages/changeEmailPage";
import { ResetPasswordPage } from "./pages/resetPasswordPage";
import { IfcWorkspacePage } from "./pages/ifcWorkspacePage";
import { AiChatPanelPage } from "./pages/aiChatPanelPage";
import path from "path";

export class Application {
  private browser!: Browser;
  private context!: BrowserContext;
  private page!: Page;
  private plansPage!: PlansPage;
  private loginPage!: LoginPage;
  private signUpPage!: SignUpPage;
  private topNavPage!: TopNavPage;
  private subscriptionPlansPage!: SubscriptionPlansPage;
  private changePasswordPage!: ChangePasswordPage;
  private changeEmailPage!: ChangeEmailPage;
  private resetPasswordPage!: ResetPasswordPage;
  private ifcWorkspacePage!: IfcWorkspacePage;
  private aiChatPanelPage!: AiChatPanelPage;

  async launch(): Promise<void> {
    this.browser = await chromium.launch();
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    this.plansPage = new PlansPage(this.page);
    this.loginPage = new LoginPage(this.page);
    this.signUpPage = new SignUpPage(this.page);
    this.topNavPage = new TopNavPage(this.page);
    this.subscriptionPlansPage = new SubscriptionPlansPage(this.page);
    this.changePasswordPage = new ChangePasswordPage(this.page);
    this.changeEmailPage = new ChangeEmailPage(this.page);
    this.resetPasswordPage = new ResetPasswordPage(this.page);
    this.ifcWorkspacePage = new IfcWorkspacePage(this.page);
    this.aiChatPanelPage = new AiChatPanelPage(this.page);
  }

  async close(): Promise<void> {
    await this.browser.close();
  }

  /** Returns the current page URL. */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  // ─── Viewport ───────────────────────────────────────────────

  /** Set the browser viewport to a desktop size (1280 × 800). */
  async setViewportToDesktop(): Promise<void> {
    await this.topNavPage.setDesktopViewport();
  }

  /** Set the browser viewport to a mobile size (375 × 812). */
  async setViewportToMobile(): Promise<void> {
    await this.topNavPage.setMobileViewport();
  }

  // ─── Sign in (composite) ────────────────────────────────────

  /**
   * Navigate to the login page, sign in with the given credentials, and wait
   * for the session to be established. After this method resolves the browser
   * will be on the /plans page with an active session.
   */
  async signInAs(email: string, password: string): Promise<void> {
    await this.loginPage.goto();
    await this.loginPage.fillAndSubmit(email, password);
    // Wait for redirect away from /login, indicating successful sign-in.
    await this.page
      .waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })
      .catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    // Allow Supabase auth state to propagate to the TopNav.
    await this.page.waitForTimeout(500);
  }

  // ─── User menu (desktop) ────────────────────────────────────

  /** Open the desktop account dropdown menu. */
  async openAccountMenu(): Promise<void> {
    await this.topNavPage.openAccountMenu();
  }

  /** Returns true if the desktop account dropdown is visible. */
  async isAccountMenuOpen(): Promise<boolean> {
    return this.topNavPage.isAccountMenuOpen();
  }

  /** Returns the email displayed in the desktop dropdown identity header. */
  async getAccountMenuIdentityEmail(): Promise<string> {
    return this.topNavPage.getDesktopIdentityEmail();
  }

  /** Returns true if the named item is visible in the desktop dropdown. */
  async isAccountMenuItemVisible(label: string): Promise<boolean> {
    return this.topNavPage.isDesktopMenuItemVisible(label);
  }

  /** Select (click) a named item in the desktop account dropdown. */
  async selectAccountMenuItem(label: string): Promise<void> {
    const currentUrl = this.page.url();
    await Promise.all([
      this.page.waitForURL((url) => url.href !== currentUrl, { timeout: 30_000 }),
      this.topNavPage.selectDesktopMenuItem(label),
    ]).catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  }

  /** Click outside the open desktop dropdown to dismiss it. */
  async dismissAccountMenuByClickingOutside(): Promise<void> {
    await this.topNavPage.clickOutsideAccountMenu();
    await this.page.waitForTimeout(200);
  }

  /** Press Escape to dismiss the open account menu. */
  async dismissAccountMenuByEscape(): Promise<void> {
    await this.topNavPage.pressEscape();
    await this.page.waitForTimeout(200);
  }

  // ─── User menu (mobile) ─────────────────────────────────────

  /** Tap the hamburger button to open the mobile navigation panel. */
  async openHamburgerMenu(): Promise<void> {
    await this.topNavPage.openHamburgerMenu();
  }

  /** Returns true if the mobile navigation panel is visible. */
  async isMobileMenuOpen(): Promise<boolean> {
    return this.topNavPage.isMobileMenuOpen();
  }

  /** Returns the email displayed in the mobile panel identity strip. */
  async getMobileMenuIdentityEmail(): Promise<string> {
    return this.topNavPage.getMobileIdentityEmail();
  }

  /** Returns true if the named item is visible in the mobile panel. */
  async isMobileMenuItemVisible(label: string): Promise<boolean> {
    return this.topNavPage.isMobileMenuItemVisible(label);
  }

  /** Returns true if the named nav link is visible in the mobile panel. */
  async isMobileNavLinkVisible(label: string): Promise<boolean> {
    return this.topNavPage.isMobileNavLinkVisible(label);
  }

  // ─── Navigation ────────────────────────────────────────────

  /** Navigate to the Plans page. */
  async navigateToPlans(): Promise<void> {
    await this.plansPage.goto();
  }

  /** Navigate to the Login page. */
  async navigateToLogin(): Promise<void> {
    await this.loginPage.goto();
  }

  /** Navigate to the Sign-Up page. */
  async navigateToSignUp(): Promise<void> {
    await this.signUpPage.goto();
  }

  /** Navigate to a specific path on the app. */
  async navigateTo(urlPath: string): Promise<void> {
    await this.page.goto(`http://localhost:3000${urlPath}`);
    await this.page.waitForLoadState("networkidle");
  }

  /** Navigate to an arbitrary full URL (used for email verification links). */
  async navigateToUrl(url: string): Promise<void> {
    await this.page.goto(url);
    await this.page.waitForLoadState("networkidle");
  }

  /** Wait for the browser to finish any pending network requests. */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  }

  /** Returns the current page URL path. */
  async currentPath(): Promise<string> {
    return new URL(this.page.url()).pathname;
  }

  /** Returns the text content of the first h1 element on the current page. */
  async getPageHeading(): Promise<string> {
    return (await this.page.locator("h1").first().textContent()) ?? "";
  }

  /** Returns true if an authenticated session cookie is present. */
  async hasActiveSession(): Promise<boolean> {
    const cookies = await this.context.cookies();
    return cookies.some(
      (c) =>
        c.name.includes("auth-token") ||
        c.name.includes("sb-") ||
        c.name === "sb_session",
    );
  }

  /** Clears all cookies so the browser has no active session. */
  async ensureSignedOut(): Promise<void> {
    await this.context.clearCookies();
  }

  /** Returns true if the sb_session cookie is present (i.e. the server-side session is active). */
  async hasSessionCookie(): Promise<boolean> {
    const cookies = await this.context.cookies();
    return cookies.some((c) => c.name === "sb_session");
  }

  /** Returns true if the current page is the sign-in page. */
  async isOnSignInPage(): Promise<boolean> {
    const path = await this.currentPath();
    return path.startsWith("/login");
  }

  /**
   * Returns the value of the `redirectTo` query parameter on the current page URL,
   * or null if it is not present.
   */
  async getLoginRedirectTarget(): Promise<string | null> {
    const url = new URL(this.page.url());
    return url.searchParams.get("redirectTo");
  }

  // ─── Login ─────────────────────────────────────────────────

  /** Fill and submit the login form. */
  async fillAndSubmitLogin(email: string, password: string): Promise<void> {
    await this.loginPage.fillAndSubmit(email, password);
  }

  /** Get the login page general error text, or null if none. */
  async getLoginError(): Promise<string | null> {
    return this.loginPage.getGeneralErrorText();
  }

  /** Returns true if the resend-verification button is visible on the login page. */
  async isResendVerificationVisible(): Promise<boolean> {
    return this.loginPage.isResendVerificationVisible();
  }

  /** Returns true if the email-verified success banner is visible. */
  async isVerifiedBannerVisible(): Promise<boolean> {
    return this.loginPage.isVerificationSuccessBannerVisible();
  }

  // ─── Sign-Up ───────────────────────────────────────────────

  /** Fill the sign-up email field. */
  async fillSignUpEmail(email: string): Promise<void> {
    await this.signUpPage.fillEmail(email);
  }

  /** Fill the sign-up display name field. */
  async fillSignUpDisplayName(displayName: string): Promise<void> {
    await this.signUpPage.fillDisplayName(displayName);
  }

  /** Fill the sign-up password field. */
  async fillSignUpPassword(password: string): Promise<void> {
    await this.signUpPage.fillPassword(password);
  }

  /** Fill the sign-up confirm-password field. */
  async fillSignUpConfirmPassword(confirm: string): Promise<void> {
    await this.signUpPage.fillConfirmPassword(confirm);
  }

  /** Submit the sign-up form. */
  async submitSignUp(): Promise<void> {
    await this.signUpPage.submit();
  }

  /** Fill all sign-up fields and submit. */
  async fillAndSubmitSignUp(options: {
    email: string;
    password: string;
    confirmPassword: string;
    displayName?: string;
  }): Promise<void> {
    await this.signUpPage.fillAndSubmit(options);
  }

  /** Returns true if the verification-sent screen is visible. */
  async isVerificationSentVisible(): Promise<boolean> {
    return this.signUpPage.isVerificationSentVisible();
  }

  /** Get the sign-up page general error text, or null if none. */
  async getSignUpGeneralError(): Promise<string | null> {
    return this.signUpPage.getGeneralErrorText();
  }

  /** Returns true if the password-mismatch field error is visible. */
  async isPasswordMismatchErrorVisible(): Promise<boolean> {
    return this.signUpPage.isPasswordMismatchErrorVisible();
  }

  /** Returns true if the password-strength field error is visible. */
  async isPasswordStrengthErrorVisible(): Promise<boolean> {
    return this.signUpPage.isPasswordStrengthErrorVisible();
  }

  /** Returns true if an email field error containing the given text is visible. */
  async isSignUpEmailErrorVisible(partialText: string): Promise<boolean> {
    return this.signUpPage.isEmailErrorVisible(partialText);
  }

  // ─── Upload ────────────────────────────────────────────────

  /** Upload a floor plan image file by filename (relative to test/test-data/). */
  async uploadFloorPlan(fileName: string): Promise<void> {
    const filePath = path.resolve("test/test-data", fileName);
    await this.plansPage.uploadFile(filePath);
  }

  /** Select a file for upload (doesn't confirm). */
  async selectFileForUpload(fileName: string): Promise<void> {
    const filePath = path.resolve("test/test-data", fileName);
    await this.plansPage.uploadFile(filePath);
  }

  /** Paste an image from the clipboard (simulated from a test-data file). */
  async pasteImage(fileName: string): Promise<void> {
    const filePath = path.resolve("test/test-data", fileName);
    await this.plansPage.pasteImage(filePath);
  }

  /** Paste text (no image) from the clipboard. */
  async pasteText(text: string): Promise<void> {
    await this.plansPage.pasteText(text);
  }

  /** Check whether a pasted image preview is visible. */
  async isPastedPreviewVisible(): Promise<boolean> {
    return await this.plansPage.isPastedPreviewVisible();
  }

  /** Check whether a preview of the given file is visible. */
  async isPreviewVisible(fileName: string): Promise<boolean> {
    return await this.plansPage.isPreviewVisible(fileName);
  }

  // ─── Roof Height ───────────────────────────────────────────

  /** Get the value currently shown in the roof height field. */
  async getRoofHeight(): Promise<string> {
    return await this.plansPage.getRoofHeightValue();
  }

  /** Set the roof height to a specific value. */
  async setRoofHeight(value: string): Promise<void> {
    await this.plansPage.setRoofHeight(value);
  }

  // ─── Submit ────────────────────────────────────────────────

  /** Click the "Analyse Floor Plan" button to confirm the upload. */
  async confirmUpload(): Promise<void> {
    await this.plansPage.clickAnalyse();
  }

  /** Attempt to confirm the upload (used when expecting validation errors). */
  async attemptConfirmUpload(): Promise<void> {
    await this.plansPage.clickAnalyse();
  }

  // ─── Results ───────────────────────────────────────────────

  /** Wait for analysis to complete and results to be visible. */
  async waitForResults(): Promise<void> {
    await this.plansPage.waitForResults();
  }

  /** Wait for either results or an error to appear. */
  async waitForResultsOrError(): Promise<void> {
    await this.plansPage.waitForResultsOrError();
  }

  /** Check if the annotated floor plan is the first result element. */
  async isAnnotatedPlanFirst(): Promise<boolean> {
    return await this.plansPage.isAnnotatedPlanFirst();
  }

  /** Get all room names from the analysis results. */
  async getRoomNames(): Promise<string[]> {
    return await this.plansPage.getRoomNames();
  }

  /** Get the total floor area displayed in the results. */
  async getTotalFloorArea(): Promise<number> {
    return await this.plansPage.getTotalFloorArea();
  }

  /** Get room details (width, length, height) for a specific room. */
  async getRoomDimensions(
    roomName: string,
  ): Promise<{ width: number; length: number; height: number }> {
    return await this.plansPage.getRoomDimensions(roomName);
  }

  /** Get the floor area for a specific room. */
  async getRoomFloorArea(roomName: string): Promise<number> {
    return await this.plansPage.getRoomFloorArea(roomName);
  }

  /** Get the ceiling area for a specific room. */
  async getRoomCeilingArea(roomName: string): Promise<number> {
    return await this.plansPage.getRoomCeilingArea(roomName);
  }

  /** Get wall areas for a specific room. */
  async getRoomWallAreas(
    roomName: string,
  ): Promise<{ label: string; area: number }[]> {
    return await this.plansPage.getRoomWallAreas(roomName);
  }

  /** Get the total wall area for a specific room. */
  async getRoomTotalWallArea(roomName: string): Promise<number> {
    return await this.plansPage.getRoomTotalWallArea(roomName);
  }

  /** Check if a room diagram has specific wall labels. */
  async getRoomDiagramLabels(roomName: string): Promise<string[]> {
    return await this.plansPage.getRoomDiagramLabels(roomName);
  }

  // ─── Downloads ─────────────────────────────────────────────

  /** Download the analysis as JSON. */
  async downloadJson(): Promise<string> {
    return await this.plansPage.downloadJson();
  }

  /** Download the analysis as a spreadsheet. */
  async downloadSpreadsheet(): Promise<string> {
    return await this.plansPage.downloadSpreadsheet();
  }

  // ─── Errors & Validation ──────────────────────────────────

  /** Check if a format error is displayed. */
  async getFormatError(): Promise<string | null> {
    return await this.plansPage.getFormatError();
  }

  /** Check if an analysis error is displayed. */
  async getAnalysisError(): Promise<string | null> {
    return await this.plansPage.getAnalysisError();
  }

  /** Check if a roof height validation error is displayed. */
  async getRoofHeightError(): Promise<string | null> {
    return await this.plansPage.getRoofHeightError();
  }

  /** Check if the upload form is still displayed (i.e. upload was not submitted). */
  async isUploadFormVisible(): Promise<boolean> {
    return await this.plansPage.isUploadFormVisible();
  }

  // ─── Composite helpers ─────────────────────────────────────

  /**
   * Upload a floor plan and wait for analysis to finish using the real AI API.
   * No mocking — the request goes through to the actual /api/analyse endpoint.
   */
  async uploadAndAnalyse(
    fileName: string,
    roofHeight?: string,
  ): Promise<void> {
    await this.uploadFloorPlan(fileName);
    if (roofHeight !== undefined) {
      await this.setRoofHeight(roofHeight);
    }
    await this.confirmUpload();
    await this.plansPage.waitForResultsOrError();
  }

  // ─── Subscription ──────────────────────────────────────────────────────────

  /** Navigate to the Subscription Plans page. */
  async navigateToSubscription(): Promise<void> {
    await this.subscriptionPlansPage.goto();
  }

  /** Returns the name of the user's current plan as shown on the page. */
  async getCurrentPlan(): Promise<string> {
    return this.subscriptionPlansPage.getCurrentPlan();
  }

  /** Returns the price string displayed for the given plan card. */
  async getPlanPrice(plan: "free" | "hobby" | "investor"): Promise<string> {
    return this.subscriptionPlansPage.getPlanPrice(plan);
  }

  /**
   * Fetches the current Stripe plan price for the given plan via the prices API
   * and asserts it matches the expected formatted price string (e.g. "A$3.00 / month").
   * Throws if the prices API is unreachable or the price does not match.
   */
  async verifyStripePlanPrice(plan: "free" | "hobby" | "investor", expectedPrice: string): Promise<void> {
    const res = await fetch("http://localhost:3000/api/subscription/prices");
    if (!res.ok) {
      throw new Error(`Prices API returned ${res.status} — is the app running?`);
    }
    const json = (await res.json()) as { data: Record<string, string> };
    const actual = json.data[plan];
    if (actual !== expectedPrice) {
      throw new Error(
        `Expected Stripe ${plan} plan price to be "${expectedPrice}" but Stripe returned "${actual}". ` +
        `Update the feature file or configure the correct price in Stripe.`,
      );
    }
  }

  /** Returns true if the billing date section is visible on the subscription page. */
  async isBillingDateVisible(): Promise<boolean> {
    return this.subscriptionPlansPage.hasBillingDate();
  }

  /** Returns true if the scheduled change notice is visible. */
  async isScheduledChangeNoticeVisible(): Promise<boolean> {
    return this.subscriptionPlansPage.hasScheduledChangeNotice();
  }

  /** Returns the cancellation date text shown in the scheduled change notice. */
  async getCancellationDate(): Promise<string> {
    return this.subscriptionPlansPage.getCancellationDate();
  }

  /** Returns the scheduled change effective date text. */
  async getScheduledChangeDate(): Promise<string> {
    return this.subscriptionPlansPage.getScheduledChangeDate();
  }

  /** Returns true if an upgrade button for the given plan is visible. */
  async isUpgradeBtnVisible(plan: "hobby" | "investor"): Promise<boolean> {
    return this.subscriptionPlansPage.isUpgradeBtnVisible(plan);
  }

  /** Returns true if any downgrade or cancel option is visible (i.e. Manage Billing button). */
  async hasAnyDowngradeOrCancelOption(): Promise<boolean> {
    return this.subscriptionPlansPage.hasAnyDowngradeOrCancelOption();
  }

  /** Returns true if any upgrade option is visible. */
  async hasAnyUpgradeOption(): Promise<boolean> {
    return this.subscriptionPlansPage.hasAnyUpgradeOption();
  }

  /**
   * Click the upgrade button for the given plan, intercept the Stripe redirect,
   * and return the Stripe Checkout URL.
   */
  async clickUpgrade(plan: "hobby" | "investor"): Promise<string> {
    return this.subscriptionPlansPage.clickUpgrade(plan);
  }

  /**
   * Click the Manage Billing button, intercept the Stripe redirect,
   * and return the Stripe Customer Portal URL.
   */
  async clickManageBilling(): Promise<string> {
    return this.subscriptionPlansPage.clickManageBilling();
  }

  /** Returns true if the Manage Billing button is visible. */
  async isManageBillingButtonVisible(): Promise<boolean> {
    return this.subscriptionPlansPage.isManageBillingVisible();
  }

  // ─── Change Password ────────────────────────────────────────────────────

  /** Navigate to the Change Password page. */
  async navigateToChangePassword(): Promise<void> {
    await this.changePasswordPage.goto();
  }

  /** Fill and submit the change-password form. */
  async fillAndSubmitChangePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    await this.changePasswordPage.fillCurrentPassword(currentPassword);
    await this.changePasswordPage.fillNewPassword(newPassword);
    await this.changePasswordPage.fillConfirmPassword(confirmPassword);
    await this.changePasswordPage.submit();
  }

  /** Fill the change-password form fields without submitting. */
  async fillChangePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    await this.changePasswordPage.fillCurrentPassword(currentPassword);
    await this.changePasswordPage.fillNewPassword(newPassword);
    await this.changePasswordPage.fillConfirmPassword(confirmPassword);
  }

  /** Submit the already-filled change-password form. */
  async submitChangePasswordForm(): Promise<void> {
    await this.changePasswordPage.submit();
  }

  /** Returns the text of the general alert on the change-password form, or null. */
  async getChangePasswordAlertMessage(): Promise<string | null> {
    return this.changePasswordPage.getAlertMessage();
  }

  /** Returns the field-level error text for the given change-password field, or null. */
  async getChangePasswordFieldError(
    field: "currentPassword" | "newPassword" | "confirmPassword",
  ): Promise<string | null> {
    return this.changePasswordPage.getFieldError(field);
  }

  /** Returns true if the change-password success screen is visible. */
  async isChangePasswordSuccessVisible(): Promise<boolean> {
    return this.changePasswordPage.isSuccessVisible();
  }

  // ─── Change Email ────────────────────────────────────────────────────────

  /** Navigate to the Change Email page. */
  async navigateToChangeEmail(): Promise<void> {
    await this.changeEmailPage.goto();
  }

  /** Fill and submit the change-email form. */
  async fillAndSubmitChangeEmail(
    newEmail: string,
    confirmEmail: string,
    password: string,
  ): Promise<void> {
    await this.changeEmailPage.fillNewEmail(newEmail);
    await this.changeEmailPage.fillConfirmEmail(confirmEmail);
    await this.changeEmailPage.fillPassword(password);
    await this.changeEmailPage.submit();
  }

  /** Fill the change-email form fields without submitting. */
  async fillChangeEmail(
    newEmail: string,
    confirmEmail: string,
    password: string,
  ): Promise<void> {
    await this.changeEmailPage.fillNewEmail(newEmail);
    await this.changeEmailPage.fillConfirmEmail(confirmEmail);
    await this.changeEmailPage.fillPassword(password);
  }

  /** Submit the already-filled change-email form. */
  async submitChangeEmailForm(): Promise<void> {
    await this.changeEmailPage.submit();
  }

  /** Returns the field-level error for the given change-email field, or null. */
  async getChangeEmailFieldError(
    field: "newEmail" | "confirmEmail" | "password",
  ): Promise<string | null> {
    return this.changeEmailPage.getFieldError(field);
  }

  /** Returns the text of the general alert on the change-email form, or null. */
  async getChangeEmailAlertMessage(): Promise<string | null> {
    return this.changeEmailPage.getAlertMessage();
  }

  /** Returns true if the verification-sent screen is visible. */
  async isChangeEmailVerificationSentVisible(): Promise<boolean> {
    return this.changeEmailPage.isVerificationSentVisible();
  }

  // ─── Reset Password ──────────────────────────────────────────────────────

  /** Navigate to the Reset Password request page. */
  async navigateToResetPassword(): Promise<void> {
    await this.resetPasswordPage.goto();
  }

  /** Fill in the reset-password request form and submit. */
  async requestPasswordReset(email: string): Promise<void> {
    await this.resetPasswordPage.fillEmail(email);
    await this.resetPasswordPage.submit();
  }

  /** Returns true if the reset-password request confirmation screen is visible. */
  async isResetPasswordSentVisible(): Promise<boolean> {
    return this.resetPasswordPage.isSentVisible();
  }

  /** Fill and submit the reset-password confirm form (after following the link). */
  async fillAndSubmitResetPasswordConfirm(
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    await this.resetPasswordPage.fillNewPassword(newPassword);
    await this.resetPasswordPage.fillConfirmPassword(confirmPassword);
    await this.resetPasswordPage.submitConfirm();
  }

  /** Returns true if the reset-password success screen is visible. */
  async isResetPasswordSuccessVisible(): Promise<boolean> {
    return this.resetPasswordPage.isSuccessVisible();
  }

  /** Returns true if the "link has expired" screen is visible. */
  async isResetPasswordExpiredVisible(): Promise<boolean> {
    return this.resetPasswordPage.isExpiredVisible();
  }

  /** Returns true if the "link already used" screen is visible. */
  async isResetPasswordUsedVisible(): Promise<boolean> {
    return this.resetPasswordPage.isUsedVisible();
  }

  /** Returns the field-level error for the given reset-password confirm field, or null. */
  async getResetPasswordConfirmFieldError(
    field: "newPassword" | "confirmPassword",
  ): Promise<string | null> {
    return this.resetPasswordPage.getConfirmFieldError(field);
  }

  /** Click the "Request a new link" button on the expired/used reset link screen. */
  async clickRequestNewResetLink(): Promise<void> {
    await this.resetPasswordPage.clickRequestNewLink();
  }

  // ─── Sign-out ───────────────────────────────────────────────────────────

  /**
   * Sign the current user out via the account menu and wait for the /login
   * redirect to complete.
   */
  async signOut(): Promise<void> {
    await this.openAccountMenu();
    await this.selectAccountMenuItem("Sign Out");
    await this.page
      .waitForURL((url) => url.pathname.startsWith("/login"), { timeout: 30_000 })
      .catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  }

  /** Returns true if the "You have been signed out successfully" banner is visible. */
  async isSignedOutBannerVisible(): Promise<boolean> {
    return this.loginPage.isSignedOutBannerVisible();
  }

  /** Returns true if the "Your email address has been updated" banner is visible on the login page. */
  async isEmailChangedBannerVisible(): Promise<boolean> {
    return this.loginPage.isEmailChangedBannerVisible();
  }

  /** Returns the text of the error alert on the login page, or null if none. */
  async getLoginPageErrorText(): Promise<string | null> {
    return this.loginPage.getErrorText();
  }

  // ─── IFC Workspace / Viewer ─────────────────────────────────────────────

  /** Navigate to the workspace page for a given project ID. */
  async navigateToWorkspace(projectId: string): Promise<void> {
    await this.ifcWorkspacePage.goto(projectId);
  }

  /** Wait for the IFC model to finish loading (loading overlay disappears). */
  async waitForModelLoaded(): Promise<void> {
    await this.ifcWorkspacePage.waitForModelLoaded();
  }

  /** Wait for the Three.js canvas to appear. */
  async waitForCanvas(): Promise<void> {
    await this.ifcWorkspacePage.waitForCanvas();
  }

  /** Returns true if the loading indicator is currently visible. */
  async isWorkspaceLoadingVisible(): Promise<boolean> {
    return this.ifcWorkspacePage.isLoadingVisible();
  }

  /** Returns true if the Three.js canvas is rendered in the viewport. */
  async isCanvasVisible(): Promise<boolean> {
    return this.ifcWorkspacePage.isCanvasVisible();
  }

  /** Returns true if the "No visible geometry" empty state overlay is visible. */
  async isEmptyModelOverlayVisible(): Promise<boolean> {
    return this.ifcWorkspacePage.isEmptyOverlayVisible();
  }

  /** Waits until the viewer reaches a terminal state (loaded, empty, or error). */
  async waitForTerminalViewerState(): Promise<void> {
    return this.ifcWorkspacePage.waitForTerminalState();
  }

  /** Returns the current viewer state from data-viewer-state attribute (debug). */
  async getViewerState(): Promise<string | null> {
    return this.ifcWorkspacePage.getViewerState();
  }

  /** Returns true if the fetch-error overlay is visible. */
  async isFetchErrorVisible(): Promise<boolean> {
    return this.ifcWorkspacePage.isErrorFetchVisible();
  }

  /** Returns true if the conversion-error overlay is visible. */
  async isConversionErrorVisible(): Promise<boolean> {
    return this.ifcWorkspacePage.isErrorConvertVisible();
  }

  /** Returns true if the retry button is visible in the error overlay. */
  async isRetryOptionVisible(): Promise<boolean> {
    return this.ifcWorkspacePage.isRetryVisible();
  }

  /** Returns true if the "Back to projects" link is visible. */
  async isBackToProjectsVisible(): Promise<boolean> {
    return this.ifcWorkspacePage.isBackToProjectsLinkVisible();
  }

  /** Click the reset-camera toolbar button. */
  async resetCamera(): Promise<void> {
    await this.ifcWorkspacePage.clickResetCamera();
  }

  /** Click the reload toolbar button. */
  async reloadViewer(): Promise<void> {
    await this.ifcWorkspacePage.clickReload();
  }

  /** Orbit the camera by dragging in the viewport. */
  async orbitCamera(dx: number, dy: number): Promise<void> {
    await this.ifcWorkspacePage.orbitCamera(dx, dy);
  }

  /** Pan the camera by right-click dragging in the viewport. */
  async panCamera(dx: number, dy: number): Promise<void> {
    await this.ifcWorkspacePage.panCamera(dx, dy);
  }

  /** Scroll the mouse wheel in the viewport. */
  async scrollWheelInViewport(deltaY: number): Promise<void> {
    await this.ifcWorkspacePage.scrollWheel(deltaY);
  }

  /** Returns the project name displayed in the workspace nav bar. */
  async getWorkspaceProjectName(): Promise<string> {
    return this.ifcWorkspacePage.getProjectName();
  }

  /** Returns the version text displayed in the workspace nav badge. */
  async getWorkspaceVersionText(): Promise<string> {
    return this.ifcWorkspacePage.getVersionText();
  }

  /** Returns true if the camera-reset toast is visible. */
  async isCameraResetToastVisible(): Promise<boolean> {
    return this.ifcWorkspacePage.isCameraResetToastVisible();
  }

  /** Mock the IFC file endpoint to return 404 (must call before navigation). */
  async mockIfcFetch404(): Promise<void> {
    await this.ifcWorkspacePage.mockIfcFetch404();
  }

  /** Mock the IFC file endpoint to return malformed data (must call before navigation). */
  async mockIfcFetchMalformed(): Promise<void> {
    await this.ifcWorkspacePage.mockIfcFetchMalformed();
  }

  /** Clear any IFC fetch mocks. */
  async clearIfcFetchMock(): Promise<void> {
    await this.ifcWorkspacePage.clearIfcFetchMock();
  }

  // ─── AI Chat Panel ─────────────────────────────────────────────────────

  /** Wait for the AI chat panel to be visible. */
  async waitForChatPanel(): Promise<void> {
    await this.aiChatPanelPage.waitForVisible();
  }

  /** Type an instruction and click send. */
  async submitChatInstruction(text: string): Promise<void> {
    await this.aiChatPanelPage.submitInstruction(text);
  }

  /** Wait for the assistant to finish responding. */
  async waitForAssistantResponse(timeout?: number): Promise<void> {
    await this.aiChatPanelPage.waitForAssistantResponse(timeout);
  }

  /** Returns the last assistant message text. */
  async getLastAssistantMessage(): Promise<string> {
    return this.aiChatPanelPage.getLastAssistantMessage();
  }

  /** Returns all assistant messages. */
  async getAssistantMessages(): Promise<string[]> {
    return this.aiChatPanelPage.getAssistantMessages();
  }

  /** Returns all user messages. */
  async getUserMessages(): Promise<string[]> {
    return this.aiChatPanelPage.getUserMessages();
  }

  /** Returns the variant (success/warning/error/neutral) of the last assistant message. */
  async getLastAssistantMessageVariant(): Promise<string> {
    return this.aiChatPanelPage.getLastAssistantMessageVariant();
  }

  /** Returns true if the chat input is enabled. */
  async isChatInputReady(): Promise<boolean> {
    return this.aiChatPanelPage.isInputEnabled();
  }

  /** Returns true if the "Checking relevance…" indicator is visible. */
  async isCheckingRelevanceVisible(): Promise<boolean> {
    return this.aiChatPanelPage.isCheckingRelevanceVisible();
  }

  /** Returns true if the "Executing…" indicator is visible. */
  async isExecutingVisible(): Promise<boolean> {
    return this.aiChatPanelPage.isExecutingVisible();
  }

  /** Clear the chat history. */
  async clearChatHistory(): Promise<void> {
    await this.aiChatPanelPage.clearChat();
  }

  /** Returns the count of assistant messages. */
  async getAssistantMessageCount(): Promise<number> {
    return this.aiChatPanelPage.getAssistantMessageCount();
  }

  /** Mock the relevance endpoint to return a fixed response. */
  async mockRelevanceEndpoint(
    response: { relevant: boolean; reason?: string },
    statusCode?: number,
  ): Promise<void> {
    await this.aiChatPanelPage.mockRelevanceEndpoint(response, statusCode);
  }

  /** Mock the execute endpoint to return a fixed response. */
  async mockExecuteEndpoint(
    response: { reply: string; newVersion?: number; partialFailure?: boolean; toolCalls?: ToolCallDetail[] | null },
    statusCode?: number,
  ): Promise<void> {
    await this.aiChatPanelPage.mockExecuteEndpoint(response, statusCode);
  }

  /** Mock the relevance endpoint to return a 502 error. */
  async mockRelevanceUnavailable(): Promise<void> {
    await this.aiChatPanelPage.mockRelevanceUnavailable();
  }

  /** Mock the execute endpoint to return a 502 error. */
  async mockExecuteUnavailable(): Promise<void> {
    await this.aiChatPanelPage.mockExecuteUnavailable();
  }

  /** Clear all AI endpoint mocks. */
  async clearAiMocks(): Promise<void> {
    await this.aiChatPanelPage.clearAiMocks();
  }

  // ─── Tool Call Inspection ─────────────────────────────────────────────────

  /** Returns true if the "Show tool calls" toggle is visible on the last assistant message. */
  async isToolCallToggleVisible(): Promise<boolean> {
    return this.aiChatPanelPage.isToolCallToggleVisible();
  }

  /** Click the "Show tool calls" / "Hide tool calls" toggle on the last assistant message. */
  async toggleToolCalls(): Promise<void> {
    await this.aiChatPanelPage.toggleToolCalls();
  }

  /** Returns true if the tool-calls detail section is visible. */
  async isToolCallSectionVisible(): Promise<boolean> {
    return this.aiChatPanelPage.isToolCallSectionVisible();
  }

  /** Returns the number of tool call items displayed. */
  async getToolCallCount(): Promise<number> {
    return this.aiChatPanelPage.getToolCallCount();
  }

  /** Returns the HTTP method of the nth tool call. */
  async getToolCallMethod(index: number): Promise<string> {
    return this.aiChatPanelPage.getToolCallMethod(index);
  }

  /** Returns the path of the nth tool call. */
  async getToolCallPath(index: number): Promise<string> {
    return this.aiChatPanelPage.getToolCallPath(index);
  }

  /** Returns the status code of the nth tool call. */
  async getToolCallStatusCode(index: number): Promise<string> {
    return this.aiChatPanelPage.getToolCallStatusCode(index);
  }

  /** Returns the duration text of the nth tool call. */
  async getToolCallDuration(index: number): Promise<string> {
    return this.aiChatPanelPage.getToolCallDuration(index);
  }

  /** Returns true if the nth tool call is marked as an error. */
  async isToolCallError(index: number): Promise<boolean> {
    return this.aiChatPanelPage.isToolCallError(index);
  }

  /** Returns true if the nth tool call has a request payload section. */
  async hasToolCallRequestPayload(index: number): Promise<boolean> {
    return this.aiChatPanelPage.hasToolCallRequestPayload(index);
  }

  /** Returns true if the nth tool call has a response body section. */
  async hasToolCallResponseBody(index: number): Promise<boolean> {
    return this.aiChatPanelPage.hasToolCallResponseBody(index);
  }

  /** Returns the text content of the tool-calls section. */
  async getToolCallSectionText(): Promise<string> {
    return this.aiChatPanelPage.getToolCallSectionText();
  }

  /** Returns the request payload text of the nth tool call. */
  async getToolCallRequestPayloadText(index: number): Promise<string> {
    return this.aiChatPanelPage.getToolCallRequestPayloadText(index);
  }

  /** Returns the response body text of the nth tool call. */
  async getToolCallResponseBodyText(index: number): Promise<string> {
    return this.aiChatPanelPage.getToolCallResponseBodyText(index);
  }
}
