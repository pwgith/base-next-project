/**
 * Quick script to load an IFC-seeded project in a headless browser
 * and capture console errors from IfcLoader.
 */
import { chromium } from "playwright";
import {
  setupUserAndGetToken,
  seedModelData,
  createTestProject,
  deleteAllProjects,
  teardownUsers,
  TEST_PASSWORD,
} from "../test/step-definitions/ifcTestHelpers";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const BASE = "http://localhost:3000";
const EMAIL = "ifc-debug-viewer@example.com";

async function main() {
  // Setup user & project with door + window
  const token = await setupUserAndGetToken(EMAIL);
  await deleteAllProjects(token);
  const projectId = await createTestProject(token, "debug-render");

  await seedModelData(projectId, {
    project: { ifcType: "IfcProject", globalId: "projDebugRender00001", name: "debug-render" },
    sites: [{ ifcType: "IfcSite", globalId: "0SiteDebugRndr00000001", name: "Site", buildings: ["0BldgDebugRndr00000001"] }],
    buildings: [{ ifcType: "IfcBuilding", globalId: "0BldgDebugRndr00000001", name: "Building", storeys: ["0StorDebugRndr00000001"] }],
    storeys: [{
      ifcType: "IfcBuildingStorey", globalId: "0StorDebugRndr00000001", name: "GF",
      elevation: 0, spaces: [],
      elements: ["0WallDebugRndr00000001", "0DoorDebugRndr00000001"],
    }],
    elements: [
      { ifcType: "IfcWall", globalId: "0WallDebugRndr00000001", name: "Wall", storeyGlobalId: "0StorDebugRndr00000001" },
      { ifcType: "IfcDoor", globalId: "0DoorDebugRndr00000001", name: "Door", storeyGlobalId: "0StorDebugRndr00000001" },
    ],
    geometries: {
      "0WallDebugRndr00000001": { representations: [{ representationType: "SweptSolid", items: [{ type: "IfcExtrudedAreaSolid", depth: 2800, direction: { x: 0, y: 0, z: 1 }, profile: { type: "IfcRectangleProfileDef", xDim: 5000, yDim: 200 } }] }] },
      "0DoorDebugRndr00000001": { representations: [{ representationType: "SweptSolid", items: [{ type: "IfcExtrudedAreaSolid", depth: 2100, direction: { x: 0, y: 0, z: 1 }, profile: { type: "IfcRectangleProfileDef", xDim: 900, yDim: 50 } }] }] },
    },
    placements: {
      "0WallDebugRndr00000001": { location: { x: 0, y: 0, z: 0 }, axis: { x: 0, y: 0, z: 1 }, refDirection: { x: 1, y: 0, z: 0 } },
      "0DoorDebugRndr00000001": { location: { x: 2000, y: 0, z: 0 }, axis: { x: 0, y: 0, z: 1 }, refDirection: { x: 1, y: 0, z: 0 } },
    },
  });

  console.log("Project seeded:", projectId);

  // Launch browser and capture console errors
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.text().includes("Fragment conversion failed")) {
      consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(`[pageerror] ${err.message}`);
  });

  // Sign in
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/plans**", { timeout: 15000 });

  // Navigate to workspace
  await page.goto(`${BASE}/projects/${projectId}/workspace`);
  console.log("Navigated to workspace, waiting for viewer state...");

  // Wait for terminal state
  await page.waitForFunction(
    () => {
      const el = document.querySelector("[data-viewer-state]");
      if (!el) return false;
      const state = el.getAttribute("data-viewer-state");
      return state === "loaded" || state === "error-convert" || state === "error-fetch" || state === "empty";
    },
    { timeout: 30000 },
  );

  const state = await page.getAttribute("[data-viewer-state]", "data-viewer-state");
  console.log("Viewer state:", state);

  if (consoleErrors.length > 0) {
    console.log("\n=== Console errors ===");
    for (const e of consoleErrors) {
      console.log(e);
    }
  } else {
    console.log("No console errors captured");
  }

  await browser.close();

  // Cleanup
  await deleteAllProjects(token);
  await teardownUsers([EMAIL]);
  process.exit(0);
}

main().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
