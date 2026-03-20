/**
 * Step definitions for F-017 — IFC Building Element Management.
 *
 * Common steps come from ifcProjectManagement.steps.ts and ifcCommonSteps.ts.
 * This file defines only steps unique to the building elements feature.
 */

import { Before, After, Given, Then } from "@cucumber/cucumber";
import assert from "assert";
import {
  teardownUsers,
  deleteAllProjects,
  seedModelData,
  type IfcWorld,
} from "./ifcTestHelpers";

// ─── Lifecycle ───────────────────────────────────────────────────────────────

Before({ tags: "@F-017" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-017" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ─── Given — data setup ─────────────────────────────────────────────────────

Given(
  "the file contains a building storey with globalId {string} named {string}",
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

Given(
  "the ground floor contains {int} walls identified by the IFC type {string}",
  async function (this: IfcWorld, count: number, ifcType: string) {
    const fileId = this.lastFileId;
    const storeyId = "3HVHnEQiv5Fe2LJwPJMC9j";
    const elements = Array.from({ length: count }, (_, i) => ({
      globalId: `wall${String(i).padStart(4, "0")}`,
      ifcType,
      name: `Wall ${i + 1}`,
      storeyGlobalId: storeyId,
    }));
    await seedModelData(fileId, { elements } as Record<string, unknown>);
  },
);

Given(
  "the IFC file contains a wall with globalId {string} and name {string}",
  async function (this: IfcWorld, globalId: string, name: string) {
    const fileId = this.lastFileId;
    await seedModelData(fileId, {
      elements: [
        {
          globalId,
          ifcType: "IfcWall",
          name,
          storeyGlobalId: "3HVHnEQiv5Fe2LJwPJMC9j",
        },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  "a wall exists with globalId {string} and name {string}",
  async function (this: IfcWorld, globalId: string, name: string) {
    const fileId = this.lastFileId;
    await seedModelData(fileId, {
      elements: [
        {
          globalId,
          ifcType: "IfcWall",
          name,
          storeyGlobalId: "3HVHnEQiv5Fe2LJwPJMC9j",
        },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  "a wall exists with globalId {string}",
  async function (this: IfcWorld, globalId: string) {
    const fileId = this.lastFileId;
    await seedModelData(fileId, {
      elements: [
        {
          globalId,
          ifcType: "IfcWall",
          name: "Test Wall",
          storeyGlobalId: "3HVHnEQiv5Fe2LJwPJMC9j",
        },
      ],
    } as Record<string, unknown>);
  },
);

// ─── Then — element-specific assertions ─────────────────────────────────────

Then(
  "each item has an {string} of {string}",
  async function (this: IfcWorld, fieldName: string, expectedValue: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const arr = Object.values(data ?? {}).find((v) => Array.isArray(v)) as Record<string, unknown>[] | undefined;
    assert.ok(Array.isArray(arr), "Expected an array in response data");
    for (const item of arr) {
      assert.strictEqual(
        String(item[fieldName]),
        expectedValue,
        `Expected each item to have ${fieldName} = "${expectedValue}" but got "${item[fieldName]}"`,
      );
    }
  },
);

Then(
  "the response body contains an {string} array with {int} items",
  async function (this: IfcWorld, fieldName: string, count: number) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const arr = data[fieldName] as unknown[];
    assert.ok(Array.isArray(arr), `Expected ${fieldName} to be an array. Got: ${JSON.stringify(data)}`);
    assert.strictEqual(arr.length, count, `Expected ${fieldName} array to have ${count} items, got ${arr.length}`);
  },
);
