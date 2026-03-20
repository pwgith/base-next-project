import { Given, Then, Before, After } from "@cucumber/cucumber";
import assert from "assert";
import {
  IfcWorld,
  teardownUsers,
  deleteAllProjects,
  seedModelData,
} from "./ifcTestHelpers";

// ───────────────────────────────────────────────
// Lifecycle
// ───────────────────────────────────────────────

Before({ tags: "@F-037" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-037" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ───────────────────────────────────────────────
// Given — Project entity setup
// ───────────────────────────────────────────────

Given(
  "the IFC file has a project entity with name {string}",
  async function (this: IfcWorld, name: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      project: { ifcType: "IfcProject", globalId: "proj-001", name },
    } as Record<string, unknown>);
  },
);

// S-263: project with length, area, and angle units
Given(
  /^the project uses length unit "(.*)", area unit "(.*)", and angle unit "(.*)"$/,
  async function (this: IfcWorld, lengthUnit: string, areaUnit: string, angleUnit: string) {
    const fileId = this.lastFileId!;
    const units = [];
    if (lengthUnit === "MILLIMETRE") {
      units.push({ unitType: "LENGTHUNIT", name: "METRE", prefix: "MILLI" });
    } else {
      units.push({ unitType: "LENGTHUNIT", name: lengthUnit });
    }
    if (areaUnit === "SQUARE_METRE") {
      units.push({ unitType: "AREAUNIT", name: "SQUARE_METRE" });
    } else {
      units.push({ unitType: "AREAUNIT", name: areaUnit });
    }
    if (angleUnit === "DEGREE") {
      units.push({ unitType: "PLANEANGLEUNIT", name: "DEGREE" });
    } else {
      units.push({ unitType: "PLANEANGLEUNIT", name: angleUnit });
    }
    await seedModelData(fileId, { units } as Record<string, unknown>);
  },
);

// S-264: project currently uses a single length unit
Given(
  "the project currently uses length unit {string}",
  async function (this: IfcWorld, lengthUnit: string) {
    const fileId = this.lastFileId!;
    const units = [];
    if (lengthUnit === "MILLIMETRE") {
      units.push({ unitType: "LENGTHUNIT", name: "METRE", prefix: "MILLI" });
    } else {
      units.push({ unitType: "LENGTHUNIT", name: lengthUnit });
    }
    await seedModelData(fileId, { units } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Then — Assertions
// ───────────────────────────────────────────────

// S-263: array entry with 3 key-value pairs
Then(
  /^the array contains an entry with "([^"]+)": "([^"]+)" and "([^"]+)": "([^"]+)" and "([^"]+)": "([^"]+)"$/,
  async function (
    this: IfcWorld,
    k1: string, v1: string, k2: string, v2: string, k3: string, v3: string,
  ) {
    const data = this.lastBody.data as Record<string, unknown>;
    const arr = Object.values(data ?? {}).find((v) => Array.isArray(v)) as Record<string, unknown>[] | undefined;
    assert.ok(Array.isArray(arr), "Expected an array in response data");
    const found = arr.some(
      (item) => String(item[k1]) === v1 && String(item[k2]) === v2 && String(item[k3]) === v3,
    );
    assert.ok(found, `Expected array to contain entry with ${k1}="${v1}", ${k2}="${v2}", ${k3}="${v3}". Got: ${JSON.stringify(arr)}`);
  },
);

// S-264: entry does not contain a field
Then(
  "the entry does not contain a {string} field",
  async function (this: IfcWorld, fieldName: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const arr = Object.values(data ?? {}).find((v) => Array.isArray(v)) as Record<string, unknown>[] | undefined;
    assert.ok(Array.isArray(arr) && arr.length > 0, "Expected a non-empty array in response data");
    // Check the most recently matched entry (last assertion context)
    // Find the entry that matched the previous assertion step
    const entry = arr.find((item) =>
      item.unitType === "LENGTHUNIT" && item.name === "METRE",
    ) ?? arr[0];
    assert.ok(
      !(fieldName in entry) || entry[fieldName] === undefined || entry[fieldName] === null,
      `Expected entry to not contain "${fieldName}" but found: ${JSON.stringify(entry[fieldName])}`,
    );
  },
);

// S-268: trueNorth with x and y as floats
Then(
  /^the response body contains "trueNorth" with "x": ([\d.]+) and "y": ([\d.]+)$/,
  async function (this: IfcWorld, xStr: string, yStr: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const trueNorth = data.trueNorth as Record<string, unknown> | undefined;
    assert.ok(trueNorth, `Expected trueNorth in response data. Got: ${JSON.stringify(data)}`);
    assert.strictEqual(Number(trueNorth.x), Number(xStr), `Expected trueNorth.x = ${xStr}, got ${trueNorth.x}`);
    assert.strictEqual(Number(trueNorth.y), Number(yStr), `Expected trueNorth.y = ${yStr}, got ${trueNorth.y}`);
  },
);
