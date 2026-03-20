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

Before({ tags: "@F-023" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-023" }, async function (this: IfcWorld) {
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
// Given — Background: classification system
// ───────────────────────────────────────────────

Given(
  "the IFC file references the classification system {string} with systemId {string}",
  async function (this: IfcWorld, name: string, systemId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      classifications: [
        { systemId, name, source: "https://www.thenbs.com/our-tools/uniclass-2015", edition: "2015 v1.31", editionDate: "2024-07-01" },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Given — Classification reference data
// ───────────────────────────────────────────────

// S-164: wall assigned a classification reference (notation - name) under a system
Given(
  /^the wall "(.*)" is assigned classification reference "(.*) - (.*)" under "(.*)"$/,
  async function (this: IfcWorld, wallGlobalId: string, notation: string, name: string, _systemName: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      classificationReferences: [
        { referenceId: "ref-auto-001", systemId: "cls-001", notation, name, elementGlobalId: wallGlobalId },
      ],
    } as Record<string, unknown>);
  },
);

// S-166: wall with a specific referenceId and notation
Given(
  "the wall {string} has classification reference with referenceId {string} and notation {string}",
  async function (this: IfcWorld, wallGlobalId: string, referenceId: string, notation: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      classificationReferences: [
        { referenceId, systemId: "cls-001", notation, name: "External walls", elementGlobalId: wallGlobalId },
      ],
    } as Record<string, unknown>);
  },
);

// S-167: wall with a specific referenceId
Given(
  "the wall {string} has classification reference with referenceId {string}",
  async function (this: IfcWorld, wallGlobalId: string, referenceId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      classificationReferences: [
        { referenceId, systemId: "cls-001", notation: "Ss_15_10_30_14", name: "External walls", elementGlobalId: wallGlobalId },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Then — Assertions
// ───────────────────────────────────────────────

// S-164: singular "item" variant of array count check
Then(
  "the response body contains a {string} array with {int} item",
  async function (this: IfcWorld, fieldName: string, count: number) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const arr = data[fieldName] as unknown[];
    assert.ok(Array.isArray(arr), `Expected ${fieldName} to be an array`);
    assert.strictEqual(arr.length, count, `Expected ${fieldName} to have ${count} item(s), got ${arr.length}`);
  },
);

// S-164: check a field on the first/only item in the first array
Then(
  "the item contains {string}: {string}",
  async function (this: IfcWorld, field: string, value: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const arr = Object.values(data ?? {}).find((v) => Array.isArray(v)) as Record<string, unknown>[] | undefined;
    assert.ok(Array.isArray(arr) && arr.length > 0, "Expected non-empty array in response");
    const item = arr[0];
    assert.strictEqual(String(item[field]), value, `Expected item.${field} = "${value}", got "${item[field]}"`);
  },
);

// S-167: verify subsequent GET does not include a referenceId
Then(
  /^a subsequent GET to "(.*)" does not include "(.*)"$/,
  async function (this: IfcWorld, path: string, referenceId: string) {
    const url = resolvePathForWorld(path, this);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const body = await response.json();
    const data = body.data as Record<string, unknown>;
    // Search all arrays for referenceId match
    for (const val of Object.values(data ?? {})) {
      if (Array.isArray(val)) {
        const found = val.some((item: Record<string, unknown>) =>
          item.referenceId === referenceId || String(item.referenceId) === referenceId,
        );
        assert.ok(!found, `Expected "${referenceId}" to not appear in response`);
      }
    }
  },
);
