/**
 * Step definitions for F-016 — IFC Spatial Structure Management.
 *
 * Common steps come from ifcProjectManagement.steps.ts and ifcCommonSteps.ts.
 * This file defines only steps unique to the spatial structure feature.
 */

import { Before, After, Given, Then } from "@cucumber/cucumber";
import assert from "assert";
import {
  setupUserAndGetToken,
  teardownUsers,
  deleteAllProjects,
  createTestProjectForUser,
  seedModelData,
  type IfcWorld,
} from "./ifcTestHelpers";

// ─── Lifecycle ───────────────────────────────────────────────────────────────

Before({ tags: "@F-016" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-016" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ─── Given — data setup ─────────────────────────────────────────────────────

/**
 * Background: Create an IFC file with a pre-seeded IfcProject entity.
 */
Given(
  "the user has an IFC file with ID {string} containing an {string} named {string}",
  async function (this: IfcWorld, fixtureId: string, _ifcType: string, projectName: string) {
    let email = "";
    for (const [e, t] of this.tokensByEmail) {
      if (t === this.accessToken) { email = e; break; }
    }
    if (!email) throw new Error("Cannot determine email for current token");

    const realId = await createTestProjectForUser(email, `${fixtureId}.ifc`);
    this.fileIdMap.set(fixtureId, realId);
    this.lastFileId = realId;
    const pMap = (this as Record<string, unknown>).projectIdMap as Map<string, string>;
    pMap.set(fixtureId, realId);

    // Seed the model with a basic spatial structure (flat format).
    const buildingGlobalId = "2TxNjKF8b0qQz7PwYLeMdR";
    await seedModelData(realId, {
      project: {
        ifcType: "IfcProject",
        globalId: "0EbRSwLjP3mhD1v7e4SXNQ",
        name: projectName,
        description: "Mixed-use office development, Phase 1",
      },
      sites: [
        {
          ifcType: "IfcSite",
          globalId: "1RQ5hV3Mz2qAjUp6XK9wFY",
          name: "Main Campus",
          buildings: [buildingGlobalId],
        },
      ],
      buildings: [
        {
          ifcType: "IfcBuilding",
          globalId: buildingGlobalId,
          name: "Block A",
          storeys: [],
        },
      ],
    } as Record<string, unknown>);
  },
);

/**
 * S-111: Create a storey with a specific globalId and name.
 */
Given(
  "a building storey exists with globalId {string} and name {string}",
  async function (this: IfcWorld, globalId: string, name: string) {
    const fileId = this.lastFileId;
    await seedModelData(fileId, {
      storeys: [
        {
          ifcType: "IfcBuildingStorey",
          globalId,
          name,
          elevation: 0.0,
          spaces: [],
          elements: [],
        },
      ],
    } as Record<string, unknown>);
  },
);

/**
 * S-112: Storey with no contents.
 */
Given(
  "a building storey exists with globalId {string} and it contains no elements or spaces",
  async function (this: IfcWorld, globalId: string) {
    const fileId = this.lastFileId;
    await seedModelData(fileId, {
      storeys: [
        {
          ifcType: "IfcBuildingStorey",
          globalId,
          name: "Empty Storey",
          elevation: 0.0,
          spaces: [],
          elements: [],
        },
      ],
    } as Record<string, unknown>);
  },
);

/**
 * S-113: Storey containing building elements.
 */
Given(
  "a building storey exists with globalId {string} that contains {int} building elements",
  async function (this: IfcWorld, globalId: string, count: number) {
    const fileId = this.lastFileId;
    const elements = Array.from({ length: count }, (_, i) => ({
      globalId: `elem${String(i).padStart(4, "0")}`,
      ifcType: "IfcWall",
      name: `Wall ${i + 1}`,
      storeyGlobalId: globalId,
    }));
    await seedModelData(fileId, {
      storeys: [
        {
          ifcType: "IfcBuildingStorey",
          globalId,
          name: "Ground Floor",
          elevation: 0.0,
          spaces: [],
          elements: elements.map((e) => e.globalId),
        },
      ],
      elements,
    } as Record<string, unknown>);
  },
);

/**
 * S-114: Storey with a specific name (for creating spaces inside it).
 */
Given(
  "a building storey exists with globalId {string} named {string}",
  async function (this: IfcWorld, globalId: string, name: string) {
    const fileId = this.lastFileId;
    await seedModelData(fileId, {
      storeys: [
        {
          ifcType: "IfcBuildingStorey",
          globalId,
          name,
          elevation: 0.0,
          spaces: [],
          elements: [],
        },
      ],
    } as Record<string, unknown>);
  },
);

/**
 * S-115: Space with globalId and name.
 */
Given(
  "a space exists with globalId {string} and name {string}",
  async function (this: IfcWorld, globalId: string, name: string) {
    const fileId = this.lastFileId;
    await seedModelData(fileId, {
      spaces: [
        {
          ifcType: "IfcSpace",
          globalId,
          name,
          longName: "",
          storeyGlobalId: "",
        },
      ],
    } as Record<string, unknown>);
  },
);

// ─── Then — spatial structure assertions ────────────────────────────────────

Then(
  "the response body contains a {string} node with {string}: {string}",
  async function (this: IfcWorld, nodeName: string, fieldName: string, expectedValue: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const node = data[nodeName] as Record<string, unknown>;
    assert.ok(node, `Expected "${nodeName}" node in response data`);
    assert.strictEqual(
      String(node[fieldName]),
      expectedValue,
      `Expected ${nodeName}.${fieldName} = "${expectedValue}" but got "${node[fieldName]}"`,
    );
  },
);

Then(
  "the project node contains a {string} array",
  async function (this: IfcWorld, fieldName: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const project = data?.project as Record<string, unknown>;
    assert.ok(project, "Expected project node");
    assert.ok(Array.isArray(project[fieldName]), `Expected project.${fieldName} to be an array`);
  },
);

Then(
  "each site contains a {string} array",
  async function (this: IfcWorld, fieldName: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const project = data?.project as Record<string, unknown>;
    const sites = project?.sites as Record<string, unknown>[];
    assert.ok(Array.isArray(sites) && sites.length > 0, "Expected non-empty sites array");
    for (const site of sites) {
      assert.ok(Array.isArray(site[fieldName]), `Expected site.${fieldName} to be an array`);
    }
  },
);

Then(
  "each building contains a {string} array",
  async function (this: IfcWorld, fieldName: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const project = data?.project as Record<string, unknown>;
    const sites = project?.sites as Record<string, unknown>[];
    assert.ok(Array.isArray(sites), "Expected sites array");
    for (const site of sites) {
      const buildings = site.buildings as Record<string, unknown>[];
      assert.ok(Array.isArray(buildings) && buildings.length > 0, "Expected non-empty buildings array");
      for (const building of buildings) {
        assert.ok(Array.isArray(building[fieldName]), `Expected building.${fieldName} to be an array`);
      }
    }
  },
);

Then(
  "each storey contains a {string} array",
  async function (this: IfcWorld, fieldName: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const project = data?.project as Record<string, unknown>;
    const sites = project?.sites as Record<string, unknown>[];
    assert.ok(Array.isArray(sites), "Expected sites array");
    for (const site of sites) {
      const buildings = site.buildings as Record<string, unknown>[];
      for (const building of buildings ?? []) {
        const storeys = building.storeys as Record<string, unknown>[];
        for (const storey of storeys ?? []) {
          assert.ok(Array.isArray(storey[fieldName]), `Expected storey.${fieldName} to be an array`);
        }
      }
    }
  },
);

Then(
  "the response body contains a {string} matching the pattern of a 22-character IFC GlobalId",
  async function (this: IfcWorld, fieldName: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const value = data[fieldName] as string;
    assert.ok(value && value.length === 22, `Expected ${fieldName} to be a 22-char IFC GlobalId, got "${value}"`);
  },
);
