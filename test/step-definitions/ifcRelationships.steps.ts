import { Given, Then, Before, After } from "@cucumber/cucumber";
import assert from "assert";
import {
  IfcWorld,
  teardownUsers,
  deleteAllProjects,
  seedModelData,
  BASE_URL,
} from "./ifcTestHelpers";

// ───────────────────────────────────────────────
// Lifecycle
// ───────────────────────────────────────────────

Before({ tags: "@F-022" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-022" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function resolvePathForWorld(path: string, world: IfcWorld): string {
  let resolved = path;
  const projectIdMap = ((world as Record<string, unknown>).projectIdMap ?? new Map()) as Map<string, string>;
  for (const [fixture, real] of projectIdMap) {
    resolved = resolved.replaceAll(fixture, real);
  }
  for (const [fixture, real] of (world.fileIdMap ?? new Map())) {
    resolved = resolved.replaceAll(fixture, real);
  }
  return `${BASE_URL}${resolved}`;
}

// ───────────────────────────────────────────────
// Given — Background: seed two storeys
// ───────────────────────────────────────────────

Given(
  /^the file contains building storeys: "(.*)" \(globalId "(.*?)"\) and "(.*)" \(globalId "(.*?)"\)$/,
  async function (this: IfcWorld, name1: string, gid1: string, name2: string, gid2: string) {
    const fileId = this.lastFileId!;
    // Seed two storeys and update the wall's storeyGlobalId to the first storey
    await seedModelData(fileId, {
      storeys: [
        { globalId: gid1, ifcType: "IfcBuildingStorey", name: name1, elements: ["0VkXyZ2aB3c4D5e6F7gH8i"], spaces: [] },
        { globalId: gid2, ifcType: "IfcBuildingStorey", name: name2, elements: [], spaces: [] },
      ],
      elements: [
        { globalId: "0VkXyZ2aB3c4D5e6F7gH8i", ifcType: "IfcWall", name: "Test Wall", storeyGlobalId: gid1 },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Given — Spatial containment (S-156)
// ───────────────────────────────────────────────

Given(
  "the wall {string} is currently contained in {string}",
  async function (this: IfcWorld, _wallGlobalId: string, _storeyName: string) {
    // The wall is already seeded in the Background and its storeyGlobalId
    // points to the first storey. This step is declarative — no extra setup.
  },
);

// ───────────────────────────────────────────────
// Given — Type assignment (S-157, S-158)
// ───────────────────────────────────────────────

Given(
  /^the wall "(.*)" is assigned to type "(.*)" with globalId "(.*)"$/,
  async function (this: IfcWorld, wallGlobalId: string, typeName: string, typeGlobalId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      typeDefinitions: [
        { ifcType: typeName, globalId: typeGlobalId, name: "EXT-WALL-200-MASONRY" },
      ],
      typeAssignments: [
        { elementGlobalId: wallGlobalId, typeGlobalId },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  /^the IFC file contains an "(.*)" with globalId "(.*)" and name "(.*)"$/,
  async function (this: IfcWorld, ifcType: string, globalId: string, name: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      typeDefinitions: [
        { ifcType, globalId, name },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Given — Groups (S-160, S-162)
// ───────────────────────────────────────────────

Given(
  "a group exists with globalId {string} named {string} with {int} members",
  async function (this: IfcWorld, globalId: string, name: string, memberCount: number) {
    const fileId = this.lastFileId!;
    const members = [];
    for (let i = 0; i < memberCount; i++) {
      members.push(`member-placeholder-${i}`);
    }
    await seedModelData(fileId, {
      groups: [
        { ifcType: "IfcGroup", globalId, name, members },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  "a group exists with globalId {string} containing member {string}",
  async function (this: IfcWorld, globalId: string, memberGlobalId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      groups: [
        { ifcType: "IfcGroup", globalId, name: "Test Group", members: [memberGlobalId, "other-member-001"] },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Then — Nested object assertions (S-155, S-156)
// ───────────────────────────────────────────────

Then(
  "the response body contains {string} with {string}: {string}",
  async function (this: IfcWorld, objectName: string, field: string, value: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const obj = data[objectName] as Record<string, unknown>;
    assert.ok(obj && typeof obj === "object", `Expected "${objectName}" object in response data`);
    assert.strictEqual(String(obj[field]), value, `Expected ${objectName}.${field} = "${value}", got "${obj[field]}"`);
  },
);

// ───────────────────────────────────────────────
// Then — Singular "item" variant for member count (S-161)
// ───────────────────────────────────────────────

Then(
  "the response body {string} array contains {int} item",
  async function (this: IfcWorld, fieldName: string, count: number) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const arr = data[fieldName] as unknown[];
    assert.ok(Array.isArray(arr), `Expected ${fieldName} to be an array`);
    assert.strictEqual(arr.length, count, `Expected ${fieldName} to have ${count} item(s), got ${arr.length}`);
  },
);

// ───────────────────────────────────────────────
// Then — Verify member removal via subsequent GET (S-162)
// ───────────────────────────────────────────────

Then(
  /^a subsequent GET to "(.*)" no longer lists "(.*)" as a member$/,
  async function (this: IfcWorld, path: string, memberGlobalId: string) {
    const url = resolvePathForWorld(path, this);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const body = await response.json();
    const data = body.data as Record<string, unknown>;
    const members = data?.members as string[];
    assert.ok(Array.isArray(members), "Expected members array");
    assert.ok(!members.includes(memberGlobalId), `Expected "${memberGlobalId}" to no longer be in members`);
  },
);
