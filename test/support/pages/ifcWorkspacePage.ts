import { Page, Locator } from "playwright";

/**
 * Page Object for the IFC Workspace page (/projects/[projectId]/workspace).
 * Encapsulates all Playwright locators and low-level interactions for the
 * 3D IFC viewer.
 */
export class IfcWorkspacePage {
  private readonly page: Page;

  // --- Locators (defined once) ---
  readonly viewport: Locator;
  readonly loadingOverlay: Locator;
  readonly loadingText: Locator;
  readonly emptyOverlay: Locator;
  readonly errorFetchOverlay: Locator;
  readonly errorConvertOverlay: Locator;
  readonly retryButton: Locator;
  readonly backToProjectsLink: Locator;
  readonly resetCameraButton: Locator;
  readonly reloadButton: Locator;
  readonly projectNameLabel: Locator;
  readonly versionBadge: Locator;
  readonly cameraResetToast: Locator;
  readonly canvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.viewport = page.locator('[data-testid="ifc-viewport"]');
    this.loadingOverlay = page.getByText("Loading model…");
    this.loadingText = page.getByText("Converting IFC to Fragments");
    this.emptyOverlay = page.getByText("No visible geometry");
    this.errorFetchOverlay = page.getByText("Model could not be loaded");
    this.errorConvertOverlay = page.getByText("Model could not be processed");
    this.retryButton = page.getByRole("button", { name: "Retry" });
    this.backToProjectsLink = page.getByRole("link", {
      name: "← Back to projects",
    });
    this.resetCameraButton = page.getByRole("button", {
      name: "Reset camera",
    });
    this.reloadButton = page.getByRole("button", { name: "Reload model" });
    this.projectNameLabel = page.locator(
      "nav .font-semibold.text-slate-100.text-sm",
    );
    this.versionBadge = page.locator("nav .bg-slate-700\\/70.rounded-full");
    this.cameraResetToast = page.getByText("Camera reset to fit model");
    this.canvas = page.locator('[data-testid="ifc-viewport"] canvas');
  }

  async goto(projectId: string): Promise<void> {
    await this.page.goto(
      `http://localhost:3000/projects/${projectId}/workspace`,
      { timeout: 90_000 },
    );
  }

  async waitForModelLoaded(): Promise<void> {
    // Wait for loading indicator to disappear (model finished loading)
    await this.loadingOverlay.waitFor({ state: "hidden", timeout: 60_000 });
  }

  async waitForCanvas(): Promise<void> {
    // Wait for the Three.js canvas to appear inside the viewport
    await this.canvas.waitFor({ state: "visible", timeout: 60_000 });
  }

  async isLoadingVisible(): Promise<boolean> {
    return this.loadingOverlay.isVisible();
  }

  async isCanvasVisible(): Promise<boolean> {
    return this.canvas.isVisible();
  }

  async isEmptyOverlayVisible(): Promise<boolean> {
    return this.emptyOverlay.isVisible();
  }

  async waitForTerminalState(): Promise<void> {
    // Wait for the viewer to reach a non-loading state (loaded, empty, or error)
    await this.page
      .locator(
        '[data-viewer-state="loaded"], [data-viewer-state="empty"], [data-viewer-state="error-fetch"], [data-viewer-state="error-convert"]',
      )
      .first()
      .waitFor({ state: "attached", timeout: 60_000 });
  }

  async getViewerState(): Promise<string | null> {
    return this.viewport.getAttribute("data-viewer-state");
  }

  async isErrorFetchVisible(): Promise<boolean> {
    return this.errorFetchOverlay.isVisible();
  }

  async isErrorConvertVisible(): Promise<boolean> {
    return this.errorConvertOverlay.isVisible();
  }

  async isRetryVisible(): Promise<boolean> {
    return this.retryButton.isVisible();
  }

  async isBackToProjectsLinkVisible(): Promise<boolean> {
    return this.backToProjectsLink.isVisible();
  }

  async clickRetry(): Promise<void> {
    await this.retryButton.click();
  }

  async clickResetCamera(): Promise<void> {
    await this.resetCameraButton.click();
  }

  async clickReload(): Promise<void> {
    await this.reloadButton.click();
  }

  async getProjectName(): Promise<string> {
    return (await this.projectNameLabel.textContent()) ?? "";
  }

  async getVersionText(): Promise<string> {
    return (await this.versionBadge.textContent()) ?? "";
  }

  async isCameraResetToastVisible(): Promise<boolean> {
    return this.cameraResetToast.isVisible();
  }

  /**
   * Perform a click-and-drag orbit gesture in the viewport centre.
   * Simulates left-click drag to orbit the camera.
   */
  async orbitCamera(dx: number, dy: number): Promise<void> {
    const box = await this.viewport.boundingBox();
    if (!box) throw new Error("Viewport not visible");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await this.page.mouse.move(cx, cy);
    await this.page.mouse.down({ button: "left" });
    await this.page.mouse.move(cx + dx, cy + dy, { steps: 10 });
    await this.page.mouse.up({ button: "left" });
  }

  /**
   * Perform a right-click-and-drag pan gesture.
   */
  async panCamera(dx: number, dy: number): Promise<void> {
    const box = await this.viewport.boundingBox();
    if (!box) throw new Error("Viewport not visible");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await this.page.mouse.move(cx, cy);
    await this.page.mouse.down({ button: "right" });
    await this.page.mouse.move(cx + dx, cy + dy, { steps: 10 });
    await this.page.mouse.up({ button: "right" });
  }

  /**
   * Scroll the mouse wheel within the viewport.
   * Negative deltaY = scroll forward (zoom in), positive = zoom out.
   */
  async scrollWheel(deltaY: number): Promise<void> {
    const box = await this.viewport.boundingBox();
    if (!box) throw new Error("Viewport not visible");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await this.page.mouse.move(cx, cy);
    await this.page.mouse.wheel(0, deltaY);
  }

  /**
   * Intercept the IFC file endpoint to return a 404 error.
   * Must be called BEFORE navigating to the workspace page.
   */
  async mockIfcFetch404(): Promise<void> {
    await this.page.route("**/api/projects/*/ifc", (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Not found" } }),
      }),
    );
  }

  /**
   * Intercept the IFC file endpoint to return malformed IFC data
   * that cannot be parsed by the renderer.
   * Must be called BEFORE navigating to the workspace page.
   */
  async mockIfcFetchMalformed(): Promise<void> {
    await this.page.route("**/api/projects/*/ifc", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/x-step",
        body: "THIS IS NOT A VALID IFC FILE AND CANNOT BE PARSED",
      }),
    );
  }

  /** Remove any IFC route overrides. */
  async clearIfcFetchMock(): Promise<void> {
    await this.page.unroute("**/api/projects/*/ifc");
  }
}
