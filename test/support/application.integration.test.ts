import { Application } from "./application";

describe("Application", () => {
  let app: Application;

  beforeAll(async () => {
    app = new Application();
    await app.launch();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  // ─── Navigation & UI ────────────────────────────────────────

  it("navigateToPlans — opens the Plans page", async () => {
    await app.navigateToPlans();
    const formVisible = await app.isUploadFormVisible();
    expect(formVisible).toBe(true);
  });

  it("getRoofHeight — returns default value of 2.4", async () => {
    await app.navigateToPlans();
    const value = await app.getRoofHeight();
    expect(parseFloat(value)).toBe(2.4);
  });

  it("setRoofHeight — updates the roof height field", async () => {
    await app.navigateToPlans();
    await app.setRoofHeight("3.0");
    const value = await app.getRoofHeight();
    expect(parseFloat(value)).toBe(3.0);
  });

  it("uploadFloorPlan — uploads a file and shows preview", async () => {
    await app.navigateToPlans();
    await app.uploadFloorPlan("3bed-house.png");
    const visible = await app.isPreviewVisible("3bed-house.png");
    expect(visible).toBe(true);
  }, 15_000);

  it("selectFileForUpload with unsupported format — shows format error", async () => {
    await app.navigateToPlans();
    await app.selectFileForUpload("floorplan.bmp");
    const error = await app.getFormatError();
    expect(error).toContain("Unsupported file format");
  }, 15_000);

  it("setRoofHeight with invalid value — shows validation error", async () => {
    await app.navigateToPlans();
    await app.setRoofHeight("0");
    const error = await app.getRoofHeightError();
    expect(error).toBeTruthy();
  });

  it("isUploadFormVisible — returns true on the plans page", async () => {
    await app.navigateToPlans();
    const visible = await app.isUploadFormVisible();
    expect(visible).toBe(true);
  });

  // ─── Authentication guard ──────────────────────────────────

  it("ensureSignedOut — browser has no session after clearing cookies", async () => {
    await app.ensureSignedOut();
    const active = await app.hasActiveSession();
    expect(active).toBe(false);
  });

  it("navigateTo /plans without session — redirects to sign-in page", async () => {
    await app.ensureSignedOut();
    await app.navigateTo("/plans");
    const onSignIn = await app.isOnSignInPage();
    expect(onSignIn).toBe(true);
  });

  it("getLoginRedirectTarget — returns the originally requested path after redirect", async () => {
    await app.ensureSignedOut();
    await app.navigateTo("/plans");
    const target = await app.getLoginRedirectTarget();
    expect(target).toBe("/plans");
  });

  // ─── Real API integration ──────────────────────────────────

  it("uploadAndAnalyse — analyses a floor plan using the real AI API", async () => {
    await app.navigateToPlans();
    await app.uploadAndAnalyse("3bed-house.png");
    const roomNames = await app.getRoomNames();
    expect(roomNames.length).toBeGreaterThan(0);
    const totalArea = await app.getTotalFloorArea();
    expect(totalArea).toBeGreaterThan(0);
  }, 120_000);

  it("uploadAndAnalyse with custom roof height — rooms use that height", async () => {
    await app.navigateToPlans();
    await app.uploadAndAnalyse("3bed-house.png", "3.0");
    const roomNames = await app.getRoomNames();
    expect(roomNames.length).toBeGreaterThan(0);
    for (const name of roomNames) {
      const dims = await app.getRoomDimensions(name);
      expect(dims.height).toBe(3.0);
    }
  }, 120_000);

  it("uploadAndAnalyse with blurry image — shows analysis error", async () => {
    await app.navigateToPlans();
    await app.uploadAndAnalyse("blurry-photo.jpg");
    const error = await app.getAnalysisError();
    expect(error).toBeTruthy();
  }, 120_000);
});
