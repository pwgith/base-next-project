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

Before({ tags: "@F-032" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-032" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ───────────────────────────────────────────────
// Given — Seed property sets
// ───────────────────────────────────────────────

Given(
  "the wall {string} has property set {string} with properties:",
  async function (this: IfcWorld, globalId: string, psetName: string, table: { hashes: () => { name: string; type: string; value: string }[] }) {
    const fileId = this.lastFileId!;
    const rows = table.hashes();
    const properties = rows.map((r) => {
      let value: unknown = r.value;
      if (r.type === "IfcBoolean") value = r.value === "true";
      else if (r.type === "IfcThermalTransmittanceMeasure" || r.type === "IfcReal") value = parseFloat(r.value);
      return { name: r.name, type: r.type, value };
    });
    await seedModelData(fileId, {
      propertySets: [
        {
          name: psetName,
          globalId: `pset_${psetName}_${globalId}`.substring(0, 22),
          properties,
          elementGlobalId: globalId,
        },
      ],
    } as Record<string, unknown>);
  },
);



// ───────────────────────────────────────────────
// Then — Validation result assertions
// ───────────────────────────────────────────────

Then(
  "the response body contains {string}: true",
  async function (this: IfcWorld, fieldName: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, `Expected data in response body. Got: ${JSON.stringify(this.lastBody)}`);
    assert.strictEqual(data[fieldName], true, `Expected ${fieldName} to be true, got ${data[fieldName]}`);
  },
);

Then(
  "the response body contains {string}: false",
  async function (this: IfcWorld, fieldName: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, `Expected data in response body. Got: ${JSON.stringify(this.lastBody)}`);
    assert.strictEqual(data[fieldName], false, `Expected ${fieldName} to be false, got ${data[fieldName]}`);
  },
);

Then(
  "the response body {string} array contains an entry with {string}: {string} and {string}: {string}",
  async function (this: IfcWorld, arrayName: string, field1: string, value1: string, field2: string, value2: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const arr = data[arrayName] as Record<string, unknown>[];
    assert.ok(Array.isArray(arr), `Expected "${arrayName}" to be an array`);
    const found = arr.some((e) => String(e[field1]) === value1 && String(e[field2]) === value2);
    assert.ok(found, `Expected ${arrayName} to contain entry with ${field1}="${value1}" and ${field2}="${value2}". Got: ${JSON.stringify(arr)}`);
  },
);

Then(
  "the response body {string} array contains an entry with {string}: {string}",
  async function (this: IfcWorld, arrayName: string, field: string, value: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const arr = data[arrayName] as Record<string, unknown>[];
    assert.ok(Array.isArray(arr), `Expected "${arrayName}" to be an array`);
    const found = arr.some((e) => String(e[field]) === value);
    assert.ok(found, `Expected ${arrayName} to contain entry with ${field}="${value}". Got: ${JSON.stringify(arr)}`);
  },
);

Then(
  "each result contains {string}, {string}, {string}, and {string} fields",
  async function (this: IfcWorld, f1: string, f2: string, f3: string, f4: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const arr = data?.results as Record<string, unknown>[] ?? Object.values(data ?? {}).find((v) => Array.isArray(v)) as Record<string, unknown>[];
    assert.ok(Array.isArray(arr), "Expected results array");
    for (const item of arr) {
      for (const field of [f1, f2, f3, f4]) {
        assert.ok(field in item, `Expected field "${field}" in result. Got: ${Object.keys(item).join(", ")}`);
      }
    }
  },
);

Then(
  "each schema entry contains a {string} array with expected property names and types",
  async function (this: IfcWorld, fieldName: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const schemas = Object.values(data ?? {}).find((v) => Array.isArray(v)) as Record<string, unknown>[];
    assert.ok(Array.isArray(schemas) && schemas.length > 0, "Expected non-empty schemas array");
    for (const schema of schemas) {
      const props = schema[fieldName] as Record<string, unknown>[];
      assert.ok(Array.isArray(props) && props.length > 0, `Expected "${fieldName}" to be a non-empty array in schema "${schema.name}"`);
      for (const prop of props) {
        assert.ok("name" in prop, "Expected property to have 'name'");
        assert.ok("type" in prop, "Expected property to have 'type'");
      }
    }
  },
);
