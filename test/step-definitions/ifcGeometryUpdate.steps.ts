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

Before({ tags: "@F-031" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-031" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ───────────────────────────────────────────────
// Given — Seed geometry states
// ───────────────────────────────────────────────

Given(
  "the wall {string} has a SweptSolid geometry with extrusion depth {float}",
  async function (this: IfcWorld, globalId: string, depth: number) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      geometries: {
        [globalId]: {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth,
                  profile: {
                    type: "IfcRectangleProfileDef",
                    xDim: 0.2,
                    yDim: 5.0,
                  },
                },
              ],
            },
          ],
        },
      },
    } as Record<string, unknown>);
  },
);

Given(
  "the wall {string} has a SweptSolid geometry with an IfcRectangleProfileDef of xDim {float} and yDim {float}",
  async function (this: IfcWorld, globalId: string, xDim: number, yDim: number) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      geometries: {
        [globalId]: {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 2.8,
                  profile: {
                    type: "IfcRectangleProfileDef",
                    xDim,
                    yDim,
                  },
                },
              ],
            },
          ],
        },
      },
    } as Record<string, unknown>);
  },
);

Given(
  "the wall {string} has a SweptSolid geometry",
  async function (this: IfcWorld, globalId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      geometries: {
        [globalId]: {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 2.8,
                },
              ],
            },
          ],
        },
      },
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Then — Geometry response assertions
// ───────────────────────────────────────────────

Then(
  "the first representation has {string}: {string}",
  async function (this: IfcWorld, fieldName: string, expectedValue: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const representations = data?.representations as Record<string, unknown>[];
    assert.ok(Array.isArray(representations) && representations.length > 0, "Expected representations array");
    assert.strictEqual(
      String(representations[0][fieldName]),
      expectedValue,
      `Expected first representation ${fieldName} = "${expectedValue}"`,
    );
  },
);

Then(
  "the first item has {string}: {float}",
  async function (this: IfcWorld, fieldName: string, expectedValue: number) {
    const data = this.lastBody.data as Record<string, unknown>;
    const representations = data?.representations as Record<string, unknown>[];
    assert.ok(Array.isArray(representations) && representations.length > 0, "Expected representations array");
    const items = representations[0].items as Record<string, unknown>[];
    assert.ok(Array.isArray(items) && items.length > 0, "Expected items array");
    assert.ok(
      Math.abs(Number(items[0][fieldName]) - expectedValue) < 0.001,
      `Expected first item ${fieldName} = ${expectedValue}, got ${items[0][fieldName]}`,
    );
  },
);

Then(
  "the first item {string} has {string}: {float} and {string}: {float}",
  async function (
    this: IfcWorld,
    objectName: string,
    field1: string, value1: number,
    field2: string, value2: number,
  ) {
    const data = this.lastBody.data as Record<string, unknown>;
    const representations = data?.representations as Record<string, unknown>[];
    assert.ok(Array.isArray(representations) && representations.length > 0, "Expected representations array");
    const items = representations[0].items as Record<string, unknown>[];
    assert.ok(Array.isArray(items) && items.length > 0, "Expected items array");
    const obj = items[0][objectName] as Record<string, unknown>;
    assert.ok(obj, `Expected "${objectName}" in first item`);
    assert.ok(
      Math.abs(Number(obj[field1]) - value1) < 0.001,
      `Expected ${objectName}.${field1} = ${value1}, got ${obj[field1]}`,
    );
    assert.ok(
      Math.abs(Number(obj[field2]) - value2) < 0.001,
      `Expected ${objectName}.${field2} = ${value2}, got ${obj[field2]}`,
    );
  },
);

Then(
  "the response body contains an error with message containing {string}",
  async function (this: IfcWorld, substring: string) {
    const error = this.lastBody.error as Record<string, unknown> | undefined;
    assert.ok(error, `Expected error in response body. Got: ${JSON.stringify(this.lastBody)}`);
    const message = String(error.message);
    assert.ok(
      message.toLowerCase().includes(substring.toLowerCase()),
      `Expected error message to contain "${substring}". Got: "${message}"`,
    );
  },
);
