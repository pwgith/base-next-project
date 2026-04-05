import { Page, Locator } from "playwright";

export class SubscriptionPlansPage {
  private readonly page: Page;

  // ── Page-level locators ────────────────────────────────────────────────────
  readonly pageContainer: Locator;
  readonly currentPlanLabel: Locator;
  readonly billingDate: Locator;
  readonly scheduledChangeNotice: Locator;
  readonly cancellationDate: Locator;
  readonly scheduledChangeDate: Locator;

  // ── Plan card locators ─────────────────────────────────────────────────────
  readonly planCardFree: Locator;
  readonly planCardLight: Locator;
  readonly planCardFull: Locator;
  readonly planPriceFree: Locator;
  readonly planPriceLight: Locator;
  readonly planPriceFull: Locator;

  // ── Action button locators ─────────────────────────────────────────────────
  readonly upgradeBtnLight: Locator;
  readonly upgradeBtnFull: Locator;
  readonly manageBillingBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageContainer = page.locator('[data-testid="subscription-page"]');
    this.currentPlanLabel = page.locator('[data-testid="current-plan"]');
    this.billingDate = page.locator('[data-testid="billing-date"]');
    this.scheduledChangeNotice = page.locator('[data-testid="scheduled-change-notice"]');
    this.cancellationDate = page.locator('[data-testid="cancellation-date"]');
    this.scheduledChangeDate = page.locator('[data-testid="scheduled-change-date"]');

    this.planCardFree = page.locator('[data-testid="plan-card-free"]');
    this.planCardLight = page.locator('[data-testid="plan-card-light"]');
    this.planCardFull = page.locator('[data-testid="plan-card-full"]');
    this.planPriceFree = page.locator('[data-testid="plan-price-free"]');
    this.planPriceLight = page.locator('[data-testid="plan-price-light"]');
    this.planPriceFull = page.locator('[data-testid="plan-price-full"]');

    this.upgradeBtnLight = page.locator('[data-testid="upgrade-btn-light"]');
    this.upgradeBtnFull = page.locator('[data-testid="upgrade-btn-full"]');
    this.manageBillingBtn = page.locator('[data-testid="manage-billing-btn"]');
  }

  async goto(): Promise<void> {
    await this.page.goto("http://localhost:3000/subscription");
    await this.page.waitForLoadState("networkidle", { timeout: 60_000 });
    // Wait for the page to finish loading subscription data.
    await this.pageContainer.waitFor({ state: "visible", timeout: 15_000 });
    await this.currentPlanLabel.waitFor({ state: "visible", timeout: 15_000 });
  }

  // ── Current plan ───────────────────────────────────────────────────────────

  async getCurrentPlan(): Promise<string> {
    return (await this.currentPlanLabel.textContent()) ?? "";
  }

  async getPlanPrice(plan: "free" | "light" | "full"): Promise<string> {
    const locator = plan === "free" ? this.planPriceFree : plan === "light" ? this.planPriceLight : this.planPriceFull;
    return (await locator.textContent())?.trim() ?? "";
  }

  async hasBillingDate(): Promise<boolean> {
    return this.billingDate.isVisible();
  }

  async hasScheduledChangeNotice(): Promise<boolean> {
    return this.scheduledChangeNotice.isVisible();
  }

  async getCancellationDate(): Promise<string> {
    return (await this.cancellationDate.textContent()) ?? "";
  }

  async getScheduledChangeDate(): Promise<string> {
    // Downgrade type shows data-testid="scheduled-change-date".
    if (await this.scheduledChangeDate.isVisible()) {
      return (await this.scheduledChangeDate.textContent())?.trim() ?? "";
    }
    // Cancel type ("downgrade to Free") shows data-testid="cancellation-date" instead.
    return (await this.cancellationDate.textContent())?.trim() ?? "";
  }

  async getScheduledChangeText(): Promise<string> {
    return (await this.scheduledChangeNotice.textContent()) ?? "";
  }

  // ── Upgrade buttons ────────────────────────────────────────────────────────

  async isUpgradeBtnVisible(plan: "light" | "full"): Promise<boolean> {
    const btn = plan === "light" ? this.upgradeBtnLight : this.upgradeBtnFull;
    return btn.isVisible();
  }

  /**
   * Clicks the upgrade button for the given plan and intercepts the API response
   * before the browser is redirected to Stripe. Returns the Stripe Checkout or
   * Customer Portal URL depending on the user's current plan.
   */
  async clickUpgrade(plan: "light" | "full"): Promise<string> {
    const btn = plan === "light" ? this.upgradeBtnLight : this.upgradeBtnFull;

    let resolveUrl!: (url: string) => void;
    const urlPromise = new Promise<string>((resolve) => {
      resolveUrl = resolve;
    });

    // Intercept the top-level navigation to stripe.com, capture the URL, then
    // abort so the test browser stays on the current page.
    await this.page.route(/stripe\.com/, async (route) => {
      resolveUrl(route.request().url());
      await route.abort();
    });

    await btn.click();

    const url = await Promise.race([
      urlPromise,
      new Promise<string>((_resolve, reject) =>
        setTimeout(() => reject(new Error("Timeout waiting for Stripe redirect")), 15_000),
      ),
    ]);

    await this.page.unroute(/stripe\.com/);
    return url;
  }

  // ── Manage Billing button (downgrade / cancel entry point) ─────────────────

  async isManageBillingVisible(): Promise<boolean> {
    return this.manageBillingBtn.isVisible();
  }

  /**
   * Clicks Manage Billing and captures the Stripe Customer Portal URL that the
   * client-side handler sets as the redirect target.  Instead of reading the
   * API response body (which becomes unavailable once the navigation fires),
   * we intercept the outbound navigation to stripe.com and capture the URL
   * directly from the request.
   */
  async clickManageBilling(): Promise<string> {
    let resolveUrl!: (url: string) => void;
    const urlPromise = new Promise<string>((resolve) => {
      resolveUrl = resolve;
    });

    // Intercept the top-level navigation to stripe.com, capture the URL, then
    // abort so the test browser stays on the current page.
    await this.page.route(/stripe\.com/, async (route) => {
      resolveUrl(route.request().url());
      await route.abort();
    });

    await this.manageBillingBtn.click();

    // Wait up to 15 s for the navigation to fire.
    const url = await Promise.race([
      urlPromise,
      new Promise<string>((_resolve, reject) =>
        setTimeout(() => reject(new Error("Timeout waiting for Stripe redirect")), 15_000),
      ),
    ]);

    await this.page.unroute(/stripe\.com/);
    return url;
  }

  // ── Composite helpers ──────────────────────────────────────────────────────

  /** Returns true if the Manage Billing button is visible (i.e. paid plan user). */
  async hasAnyDowngradeOrCancelOption(): Promise<boolean> {
    return this.manageBillingBtn.isVisible();
  }

  async hasAnyUpgradeOption(): Promise<boolean> {
    const [lightVisible, fullVisible] = await Promise.all([
      this.upgradeBtnLight.isVisible(),
      this.upgradeBtnFull.isVisible(),
    ]);
    return lightVisible || fullVisible;
  }
}
