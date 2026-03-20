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

Before({ tags: "@F-019" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-019" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function parsePropertyValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const num = Number(trimmed);
  if (!isNaN(num)) return num;
  return trimmed;
}

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
// Given — Background
// ───────────────────────────────────────────────

Given(
  "the file contains a wall with globalId {string} named {string}",
  async function (this: IfcWorld, globalId: string, name: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      sites: [
        { globalId: "0Site00000000000000001", ifcType: "IfcSite", name: "Default Site", buildings: ["0Bldg00000000000000001"] },
      ],
      buildings: [
        { globalId: "0Bldg00000000000000001", ifcType: "IfcBuilding", name: "Default Building", storeys: ["0Stor00000000000000001"] },
      ],
      storeys: [
        { globalId: "0Stor00000000000000001", ifcType: "IfcBuildingStorey", name: "Ground Floor", elements: [globalId], spaces: [] },
      ],
      elements: [
        { globalId, ifcType: "IfcWall", name, storeyGlobalId: "0Stor00000000000000001" },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Given — Property sets setup
// ───────────────────────────────────────────────

// S-134: two property sets
Given(
  "the wall {string} has property sets {string} and {string}",
  async function (this: IfcWorld, wallGlobalId: string, pset1: string, pset2: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      propertySets: [
        { name: pset1, globalId: "0Pset00000000000000001", properties: [], elementGlobalId: wallGlobalId },
        { name: pset2, globalId: "0Pset00000000000000002", properties: [], elementGlobalId: wallGlobalId },
      ],
    } as Record<string, unknown>);
  },
);

// S-135: property set with two typed properties (bool + float)
Given(
  /^the wall "(.*)" has property set "(.*)" containing "(.*)":\s*(.*)\s+and\s+"(.*)":\s*(.*)$/,
  async function (this: IfcWorld, wallGlobalId: string, psetName: string, prop1Name: string, prop1Value: string, prop2Name: string, prop2Value: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      propertySets: [
        {
          name: psetName,
          globalId: "0Pset00000000000000003",
          properties: [
            { name: prop1Name, type: "IfcBoolean", value: parsePropertyValue(prop1Value) },
            { name: prop2Name, type: "IfcThermalTransmittanceMeasure", value: parsePropertyValue(prop2Value) },
          ],
          elementGlobalId: wallGlobalId,
        },
      ],
    } as Record<string, unknown>);
  },
);

// S-137: property set with N existing dummy properties
Given(
  "the wall {string} has property set {string} with {int} existing properties",
  async function (this: IfcWorld, wallGlobalId: string, psetName: string, count: number) {
    const fileId = this.lastFileId!;
    const properties = [];
    for (let i = 0; i < count; i++) {
      properties.push({ name: `Prop${i + 1}`, type: "IfcLabel", value: `value${i + 1}` });
    }
    await seedModelData(fileId, {
      propertySets: [
        { name: psetName, globalId: "0Pset00000000000000004", properties, elementGlobalId: wallGlobalId },
      ],
    } as Record<string, unknown>);
  },
);

// S-138: property with a specific value in a specific pset
Given(
  /^the wall "(.*)" has property "(.*)" with value (.*) in "(.*)"$/,
  async function (this: IfcWorld, wallGlobalId: string, propName: string, propValue: string, psetName: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      propertySets: [
        {
          name: psetName,
          globalId: "0Pset00000000000000005",
          properties: [
            { name: propName, type: "IfcThermalTransmittanceMeasure", value: parsePropertyValue(propValue) },
          ],
          elementGlobalId: wallGlobalId,
        },
      ],
    } as Record<string, unknown>);
  },
);

// S-139: property set containing a named property (plus another to ensure selective delete)
Given(
  "the wall {string} has property set {string} containing property {string}",
  async function (this: IfcWorld, wallGlobalId: string, psetName: string, propName: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      propertySets: [
        {
          name: psetName,
          globalId: "0Pset00000000000000006",
          properties: [
            { name: propName, type: "IfcLabel", value: "SomeValue" },
            { name: "OtherProp", type: "IfcLabel", value: "OtherValue" },
          ],
          elementGlobalId: wallGlobalId,
        },
      ],
    } as Record<string, unknown>);
  },
);

// S-140: property set (just need it to exist)
Given(
  "the wall {string} has property set {string}",
  async function (this: IfcWorld, wallGlobalId: string, psetName: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      propertySets: [
        { name: psetName, globalId: "0Pset00000000000000007", properties: [], elementGlobalId: wallGlobalId },
      ],
    } as Record<string, unknown>);
  },
);

// S-141: quantity set with two quantities
Given(
  /^the wall "(.*)" has quantity set "(.*)" with "(.*)":\s*([\d.]+)\s+and\s+"(.*)":\s*([\d.]+)$/,
  async function (this: IfcWorld, wallGlobalId: string, qsetName: string, qty1Name: string, qty1Value: string, qty2Name: string, qty2Value: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      quantitySets: [
        {
          name: qsetName,
          globalId: "0Qset00000000000000001",
          quantities: [
            { name: qty1Name, value: parseFloat(qty1Value) },
            { name: qty2Name, value: parseFloat(qty2Value) },
          ],
          elementGlobalId: wallGlobalId,
        },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Then — Assertions
// ───────────────────────────────────────────────

// 2-param version: check array entry by single field
Then(
  "the array contains an entry with {string}: {string}",
  async function (this: IfcWorld, field: string, value: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const arr = Object.values(data ?? {}).find((v) => Array.isArray(v)) as Record<string, unknown>[] | undefined;
    assert.ok(Array.isArray(arr), "Expected an array field in response data");
    const found = arr.some((item) => String(item[field]) === value);
    assert.ok(found, `Expected array entry with ${field} = "${value}"`);
  },
);

// Check array field exists (no item count)
Then(
  "the response body contains a {string} array",
  async function (this: IfcWorld, fieldName: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    assert.ok(Array.isArray(data[fieldName]), `Expected ${fieldName} to be an array`);
  },
);

// Check property by name and value; handles booleans, floats, strings
Then(
  /^the properties include "(.*)" with value (.+)$/,
  async function (this: IfcWorld, propName: string, rawValue: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const properties = data?.properties as { name: string; value: unknown }[];
    assert.ok(Array.isArray(properties), "Expected properties array in response data");
    const prop = properties.find((p) => p.name === propName);
    assert.ok(prop, `Expected property "${propName}" to exist`);
    const expected = parsePropertyValue(rawValue);
    if (typeof expected === "number") {
      assert.strictEqual(Number(prop.value), expected);
    } else if (typeof expected === "boolean") {
      assert.strictEqual(prop.value, expected);
    } else {
      assert.strictEqual(String(prop.value), String(expected));
    }
  },
);

// Verify that a subsequent GET no longer lists a named item
Then(
  "a subsequent GET to {string} no longer lists {string}",
  async function (this: IfcWorld, path: string, name: string) {
    const url = resolvePathForWorld(path, this);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const body = await response.json();
    const data = body.data as Record<string, unknown>;

    // Search all arrays in the response for an entry with name matching
    for (const val of Object.values(data ?? {})) {
      if (Array.isArray(val)) {
        const found = val.some((item: Record<string, unknown>) => String(item.name) === name);
        assert.ok(!found, `Expected "${name}" to no longer be listed`);
      }
    }
  },
);

// Quantity set entry check: match by name (string) and value (float)
Then(
  "the response body {string} array contains an entry with {string}: {string} and {string}: {float}",
  async function (this: IfcWorld, arrayField: string, field1: string, value1: string, field2: string, value2: number) {
    const data = this.lastBody.data as Record<string, unknown>;
    const arr = data[arrayField] as Record<string, unknown>[];
    assert.ok(Array.isArray(arr), `Expected ${arrayField} to be an array`);
    const found = arr.some(
      (item) => String(item[field1]) === value1 && Number(item[field2]) === value2,
    );
    assert.ok(found, `Expected entry with ${field1}="${value1}" and ${field2}=${value2} in ${arrayField}`);
  },
);
