import { Given, Then, Before, After } from "@cucumber/cucumber";
import assert from "assert";
import {
  type IfcWorld,
  teardownUsers,
  deleteAllProjects,
  seedModelData,
} from "./ifcTestHelpers";

// ───────────────────────────────────────────────
// Lifecycle
// ───────────────────────────────────────────────

Before({ tags: "@F-035" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-035" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ───────────────────────────────────────────────
// Given — Background: materials
// ───────────────────────────────────────────────

Given(
  /^the IFC file contains materials "(.*)" \(materialId "(.*?)"\), "(.*)" \(materialId "(.*?)"\), "(.*)" \(materialId "(.*?)"\), and "(.*)" \(materialId "(.*?)"\)$/,
  async function (this: IfcWorld, n1: string, id1: string, n2: string, id2: string, n3: string, id3: string, n4: string, id4: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      materials: [
        { materialId: id1, name: n1 },
        { materialId: id2, name: n2 },
        { materialId: id3, name: n3 },
        { materialId: id4, name: n4 },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Given — Seed elements
// ───────────────────────────────────────────────

Given(
  /^the file contains walls with globalIds "(.*)", "(.*)", and "(.*)"$/,
  async function (this: IfcWorld, gid1: string, gid2: string, gid3: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      sites: [{ globalId: "0Site00000000000000001", ifcType: "IfcSite", name: "Default Site", buildings: ["0Bldg00000000000000001"] }],
      buildings: [{ globalId: "0Bldg00000000000000001", ifcType: "IfcBuilding", name: "Default Building", storeys: ["0Stor00000000000000001"] }],
      storeys: [{ globalId: "0Stor00000000000000001", ifcType: "IfcBuildingStorey", name: "Ground Floor", elements: [gid1, gid2, gid3], spaces: [] }],
      elements: [
        { globalId: gid1, ifcType: "IfcWall", name: "Wall-1", storeyGlobalId: "0Stor00000000000000001" },
        { globalId: gid2, ifcType: "IfcWall", name: "Wall-2", storeyGlobalId: "0Stor00000000000000001" },
        { globalId: gid3, ifcType: "IfcWall", name: "Wall-3", storeyGlobalId: "0Stor00000000000000001" },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  "the file contains a curtain wall with globalId {string}",
  async function (this: IfcWorld, globalId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      sites: [{ globalId: "0Site00000000000000001", ifcType: "IfcSite", name: "Default Site", buildings: ["0Bldg00000000000000001"] }],
      buildings: [{ globalId: "0Bldg00000000000000001", ifcType: "IfcBuilding", name: "Default Building", storeys: ["0Stor00000000000000001"] }],
      storeys: [{ globalId: "0Stor00000000000000001", ifcType: "IfcBuildingStorey", name: "Ground Floor", elements: [globalId], spaces: [] }],
      elements: [
        { globalId, ifcType: "IfcCurtainWall", name: "Curtain Wall", storeyGlobalId: "0Stor00000000000000001" },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  "the file contains a beam with globalId {string}",
  async function (this: IfcWorld, globalId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      elements: [
        { globalId, ifcType: "IfcBeam", name: "Beam", storeyGlobalId: "0Stor00000000000000001" },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Given — Seed constituent & profile sets
// ───────────────────────────────────────────────

Given(
  /^the curtain wall "(.*)" has a material constituent set with constituents "(.*)" and "(.*)"$/,
  async function (this: IfcWorld, globalId: string, name1: string, name2: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      materialAssignments: [
        {
          assignmentType: "IfcMaterialConstituentSet",
          name: "Curtain Wall Assembly",
          constituents: [
            { materialName: "Glass - Float 6mm", name: name1, fraction: 0.75, category: "Glazing" },
            { materialName: "Aluminium - 6063-T5", name: name2, fraction: 0.25, category: "Framing" },
          ],
          elementGlobalId: globalId,
        },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  /^the beam "(.*)" has a material profile set with profile "(.*)"$/,
  async function (this: IfcWorld, globalId: string, profileName: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      materialAssignments: [
        {
          assignmentType: "IfcMaterialProfileSet",
          name: "UB 305x165x40",
          profiles: [
            {
              materialName: "Steel - S355",
              name: profileName,
              profile: {
                type: "IfcIShapeProfileDef",
                overallWidth: 0.165,
                overallDepth: 0.303,
                webThickness: 0.006,
                flangeThickness: 0.0102,
              },
            },
          ],
          elementGlobalId: globalId,
        },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  /^the curtain wall "(.*)" has a material constituent set with constituent "(.*)" at fraction (.*)$/,
  async function (this: IfcWorld, globalId: string, name: string, fraction: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      materialAssignments: [
        {
          assignmentType: "IfcMaterialConstituentSet",
          name: "Curtain Wall Assembly",
          constituents: [
            { materialName: "Glass - Float 6mm", name, fraction: parseFloat(fraction), category: "Glazing" },
          ],
          elementGlobalId: globalId,
        },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  /^the curtain wall "(.*)" has a material constituent set with (\d+) constituents$/,
  async function (this: IfcWorld, globalId: string, count: number) {
    const fileId = this.lastFileId!;
    const constituents = [];
    for (let i = 0; i < count; i++) {
      constituents.push({
        materialName: `Material-${i}`,
        name: `Constituent-${i}`,
        fraction: 1 / count,
        category: `Category-${i}`,
      });
    }
    await seedModelData(fileId, {
      materialAssignments: [
        {
          assignmentType: "IfcMaterialConstituentSet",
          name: "Curtain Wall Assembly",
          constituents,
          elementGlobalId: globalId,
        },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Then — Material-specific assertions
// ───────────────────────────────────────────────

Then(
  "the response body {string} array contains {string}",
  async function (this: IfcWorld, arrayName: string, expectedValue: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const arr = data[arrayName] as unknown[];
    assert.ok(Array.isArray(arr), `Expected "${arrayName}" to be an array`);
    assert.ok(arr.includes(expectedValue), `Expected "${arrayName}" to contain "${expectedValue}". Got: ${JSON.stringify(arr)}`);
  },
);

Then(
  /^the first constituent has "(.*?)": "(.*?)" and "(.*?)": (.*)$/,
  async function (this: IfcWorld, field1: string, value1: string, field2: string, value2: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const constituents = data.constituents as Record<string, unknown>[];
    assert.ok(Array.isArray(constituents) && constituents.length > 0, "Expected non-empty constituents array");
    const first = constituents[0];
    assert.strictEqual(String(first[field1]), value1, `Expected first constituent ${field1} = "${value1}"`);
    assert.strictEqual(Number(first[field2]), parseFloat(value2), `Expected first constituent ${field2} = ${value2}`);
  },
);

Then(
  "the first profile has {string}: {string}",
  async function (this: IfcWorld, field: string, value: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const profiles = data.profiles as Record<string, unknown>[];
    assert.ok(Array.isArray(profiles) && profiles.length > 0, "Expected non-empty profiles array");
    assert.strictEqual(String(profiles[0][field]), value, `Expected first profile ${field} = "${value}"`);
  },
);

Then(
  "the profile contains a {string} object with {string}: {string}",
  async function (this: IfcWorld, objectField: string, field: string, value: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const profiles = data.profiles as Record<string, unknown>[];
    assert.ok(Array.isArray(profiles) && profiles.length > 0, "Expected non-empty profiles array");
    const obj = profiles[0][objectField] as Record<string, unknown>;
    assert.ok(obj && typeof obj === "object", `Expected "${objectField}" to be an object`);
    assert.strictEqual(String(obj[field]), value, `Expected ${objectField}.${field} = "${value}"`);
  },
);
