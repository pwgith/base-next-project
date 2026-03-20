import { Page, Locator } from "playwright";

/**
 * Page Object for the TopNav component, which is present on every page.
 * Covers the desktop account dropdown and mobile hamburger menu.
 */
export class TopNavPage {
  private readonly page: Page;

  // ─── Nav-level locators ────────────────────────────────────────────────────

  /** Desktop: avatar/email button that opens the account dropdown. */
  readonly accountMenuButton: Locator;

  /** Mobile: hamburger button that toggles the slide-down panel. */
  readonly hamburgerButton: Locator;

  // ─── Desktop dropdown ─────────────────────────────────────────────────────

  /** The desktop account dropdown menu container. */
  readonly accountDropdown: Locator;

  /** The signed-in email shown in the dropdown identity header. */
  readonly desktopSignedInEmail: Locator;

  /** Profile menu item in the desktop dropdown. */
  readonly desktopProfileItem: Locator;

  /** Change Password menu item in the desktop dropdown. */
  readonly desktopChangePasswordItem: Locator;

  /** Sign Out menu item in the desktop dropdown. */
  readonly desktopSignOutItem: Locator;

  // ─── Mobile slide-down panel ──────────────────────────────────────────────

  /** The mobile navigation panel container. */
  readonly mobileMenu: Locator;

  /** The signed-in email shown in the mobile panel identity strip. */
  readonly mobileSignedInEmail: Locator;

  /** Profile menu item in the mobile panel. */
  readonly mobileProfileItem: Locator;

  /** Change Password menu item in the mobile panel. */
  readonly mobileChangePasswordItem: Locator;

  /** Sign Out menu item in the mobile panel. */
  readonly mobileSignOutItem: Locator;

  constructor(page: Page) {
    this.page = page;

    // ── Nav-level ────────────────────────────────────────────────────────────
    this.accountMenuButton = page.getByRole("button", { name: "Account menu" });
    this.hamburgerButton = page.getByRole("button", { name: "Toggle navigation" });

    // ── Desktop dropdown ─────────────────────────────────────────────────────
    this.accountDropdown = page.getByRole("menu", { name: "Account options" });
    this.desktopSignedInEmail = this.accountDropdown.getByLabel("Signed-in email");
    this.desktopProfileItem = this.accountDropdown.getByRole("menuitem", { name: "Profile" });
    this.desktopChangePasswordItem = this.accountDropdown.getByRole("menuitem", { name: "Change Password" });
    this.desktopSignOutItem = this.accountDropdown.getByRole("menuitem", { name: "Sign Out" });

    // ── Mobile panel ─────────────────────────────────────────────────────────
    this.mobileMenu = page.getByRole("menu", { name: "Mobile navigation" });
    this.mobileSignedInEmail = this.mobileMenu.getByLabel("Signed-in email");
    this.mobileProfileItem = this.mobileMenu.getByRole("menuitem", { name: "Profile" });
    this.mobileChangePasswordItem = this.mobileMenu.getByRole("menuitem", { name: "Change Password" });
    this.mobileSignOutItem = this.mobileMenu.getByRole("menuitem", { name: "Sign Out" });
  }

  // ─── Desktop account menu ─────────────────────────────────────────────────

  /** Open the desktop account dropdown. */
  async openAccountMenu(): Promise<void> {
    await this.accountMenuButton.waitFor({ state: "visible", timeout: 10_000 });
    await this.accountMenuButton.click();
    await this.accountDropdown.waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Returns true if the desktop account dropdown is currently visible. */
  async isAccountMenuOpen(): Promise<boolean> {
    return this.accountDropdown.isVisible();
  }

  /** Returns the email displayed in the desktop dropdown identity header. */
  async getDesktopIdentityEmail(): Promise<string> {
    await this.desktopSignedInEmail.waitFor({ state: "visible", timeout: 5_000 });
    return (await this.desktopSignedInEmail.textContent()) ?? "";
  }

  /** Returns true if the named account menu item is visible in the desktop dropdown. */
  async isDesktopMenuItemVisible(label: string): Promise<boolean> {
    const item = this.accountDropdown.getByRole("menuitem", { name: label });
    return item.isVisible();
  }

  /** Click a named item in the desktop account dropdown. */
  async selectDesktopMenuItem(label: string): Promise<void> {
    const item = this.accountDropdown.getByRole("menuitem", { name: label });
    await item.click();
  }

  /** Click outside the open desktop dropdown to dismiss it. */
  async clickOutsideAccountMenu(): Promise<void> {
    // Click the top-left corner of the page body — outside the nav area.
    await this.page.click("body", { position: { x: 10, y: 200 } });
  }

  /** Press Escape to dismiss the open menu. */
  async pressEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  // ─── Mobile hamburger menu ────────────────────────────────────────────────

  /** Tap/click the hamburger button to open the mobile panel. */
  async openHamburgerMenu(): Promise<void> {
    await this.hamburgerButton.waitFor({ state: "visible", timeout: 10_000 });
    await this.hamburgerButton.click();
    await this.mobileMenu.waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Returns true if the mobile panel is currently visible. */
  async isMobileMenuOpen(): Promise<boolean> {
    return this.mobileMenu.isVisible();
  }

  /** Returns the email displayed in the mobile panel identity strip. */
  async getMobileIdentityEmail(): Promise<string> {
    await this.mobileSignedInEmail.waitFor({ state: "visible", timeout: 5_000 });
    return (await this.mobileSignedInEmail.textContent()) ?? "";
  }

  /** Returns true if the named item is visible in the mobile panel. */
  async isMobileMenuItemVisible(label: string): Promise<boolean> {
    const item = this.mobileMenu.getByRole("menuitem", { name: label });
    return item.isVisible();
  }

  /** Returns true if the named link is visible in the mobile panel nav links section. */
  async isMobileNavLinkVisible(label: string): Promise<boolean> {
    const link = this.mobileMenu.getByRole("menuitem", { name: label });
    return link.isVisible();
  }

  /** Click a named item in the mobile panel. */
  async selectMobileMenuItem(label: string): Promise<void> {
    const item = this.mobileMenu.getByRole("menuitem", { name: label });
    await item.click();
  }

  // ─── Viewport helpers ─────────────────────────────────────────────────────

  /** Set viewport to a desktop size (1280 × 800). */
  async setDesktopViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 1280, height: 800 });
    await this.page.waitForTimeout(100);
  }

  /** Set viewport to a mobile size (375 × 812). */
  async setMobileViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 812 });
    await this.page.waitForTimeout(100);
  }
}
