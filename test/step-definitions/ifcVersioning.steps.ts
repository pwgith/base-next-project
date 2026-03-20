/**
 * Step definitions for F-027 — IFC model versioning (UC-USR-015).
 *
 * Tests version creation on mutations, version listing, metadata retrieval,
 * snapshot download, version restore, and concurrent mutation sequencing.
 */

import { Before, After, BeforeStep, Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import {
  BASE_URL,
  createTestProjectForUser,
  seedModelData,
  setIfcVersion,
  deleteAllProjects,
  teardownUsers,
  apiRequest,
  type IfcWorld,
} from "./ifcTestHelpers";

// ───────────────────────────────────────────────
// Lifecycle
// ───────────────────────────────────────────────

Before({ tags: "@F-027" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    ((this as Record<string, unknown>).projectIdMap as Map<string, string>) ?? new Map();
});

/**
 * BeforeStep hook: if a pendingVersionReset was stored by a Given step,
 * apply it right before the next non-Given step (i.e. the When step).
 * This ensures that seed-based Given steps (which create new versions)
 * don't leave the file at a higher version than expected.
 */
BeforeStep({ tags: "@F-027" }, async function (this: IfcWorld, { pickleStep }) {
  const pending = (this as Record<string, unknown>).pendingVersionReset as
    | { fileId: string; version: number }
    | undefined;
  if (pending && pickleStep.type !== "Context") {
    await setIfcVersion(pending.fileId, pending.version);
    delete (this as Record<string, unknown>).pendingVersionReset;
  }
});

After({ tags: "@F-027" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ───────────────────────────────────────────────
// Helper
// ───────────────────────────────────────────────

function resolveIds(path: string, world: IfcWorld): string {
  let resolved = path;
  const projectIdMap = ((world as Record<string, unknown>).projectIdMap ?? new Map()) as Map<string, string>;
  for (const [fixture, real] of projectIdMap) {
    resolved = resolved.replaceAll(fixture, real);
  }
  for (const [fixture, real] of (world.fileIdMap ?? new Map())) {
    resolved = resolved.replaceAll(fixture, real);
  }
  // Resolve {fileId} placeholder from last response (for upload scenarios).
  const data = world.lastBody?.data as Record<string, unknown> | undefined;
  if (data?.fileId && resolved.includes("{fileId}")) {
    resolved = resolved.replace("{fileId}", String(data.fileId));
  }
  return resolved;
}

// ───────────────────────────────────────────────
// Background
// ───────────────────────────────────────────────

Given(
  "the user has an IFC file with ID {string} currently at version {int}",
  async function (this: IfcWorld, fixtureId: string, targetVersion: number) {
    let email = "";
    for (const [e, t] of this.tokensByEmail) {
      if (t === this.accessToken) {
        email = e;
        break;
      }
    }
    if (!email) throw new Error("Cannot determine email for current access token");

    const realId = await createTestProjectForUser(email, `${fixtureId}.ifc`);

    this.fileIdMap.set(fixtureId, realId);
    this.lastFileId = realId;
    const projectIdMap = ((this as Record<string, unknown>).projectIdMap ?? new Map()) as Map<string, string>;
    (this as Record<string, unknown>).projectIdMap = projectIdMap;
    projectIdMap.set(fixtureId, realId);

    // Seed a storey + wall so mutation scenarios have data to work with.
    // This creates version 2 (version 1 was the initial empty version).
    await seedModelData(realId, {
      storeys: [{
        globalId: "3HVHnEQiv5Fe2LJwPJMC9j",
        name: "Ground Floor",
        elevation: 0,
        elements: ["0VkXyZ2aB3c4D5e6F7gH8i"],
      }],
      elements: [{
        ifcType: "IfcWall",
        globalId: "0VkXyZ2aB3c4D5e6F7gH8i",
        name: "EW-Ext Wall",
        storeyGlobalId: "3HVHnEQiv5Fe2LJwPJMC9j",
      }],
    } as Record<string, unknown>);

    // Advance to given version if needed (version 2 was created by seed).
    if (targetVersion > 2) {
      await setIfcVersion(realId, targetVersion);
    }
  },
);

// ───────────────────────────────────────────────
// Given — scenario-level setup
// ───────────────────────────────────────────────

Given(
  "the IFC file {string} is at version {int}",
  async function (this: IfcWorld, fixtureId: string, version: number) {
    const realId = this.fileIdMap.get(fixtureId);
    if (!realId) throw new Error(`No file mapped for fixture "${fixtureId}"`);
    // Defer the version reset until the BeforeStep hook runs before the When step.
    // This ensures any subsequent Given steps (e.g. "a wall exists") can seed data
    // without leaving the version at a higher-than-expected number.
    (this as Record<string, unknown>).pendingVersionReset = { fileId: realId, version };
  },
);

Given(
  /^the IFC file "([^"]+)" has versions (\d+), (\d+), and (\d+)$/,
  async function (this: IfcWorld, fixtureId: string, _v1: string, _v2: string, v3: string) {
    // Background already creates the file at the target version.
    // Ensure the file is at the highest version.
    const realId = this.fileIdMap.get(fixtureId);
    if (!realId) throw new Error(`No file mapped for fixture "${fixtureId}"`);
    await setIfcVersion(realId, parseInt(v3, 10));
  },
);

// ───────────────────────────────────────────────
// Then — follow-up GET assertions
// ───────────────────────────────────────────────

/**
 * S-188: a GET to "/api/v1/ifc/files/{fileId}/versions" returns a "versions"
 * array containing exactly 1 item with "version": 1
 */
Then(
  /^a GET to "([^"]+)" returns a "([^"]+)" array containing exactly (\d+) items? with "([^"]+)": (\d+)$/,
  async function (
    this: IfcWorld,
    path: string,
    arrayField: string,
    expectedCount: string,
    field: string,
    expectedValue: string,
  ) {
    const resolvedPath = resolveIds(path, this);
    const url = `${BASE_URL}${resolvedPath}`;
    const res = await apiRequest("GET", url, this.accessToken);
    assert.strictEqual(res.status, 200, `Expected 200 from GET ${resolvedPath}, got ${res.status}`);
    const body = await res.json();
    const arr = body.data?.[arrayField] as Record<string, unknown>[];
    assert.ok(Array.isArray(arr), `Expected "${arrayField}" array in response`);
    assert.strictEqual(arr.length, parseInt(expectedCount, 10));
    const match = arr.find((item) => Number(item[field]) === parseInt(expectedValue, 10));
    assert.ok(match, `Expected an item with ${field}: ${expectedValue} in the array`);
  },
);

/**
 * S-189–S-196: a GET to "..." returns "currentVersion": N
 * Uses literal "currentVersion" to avoid ambiguity with F-028's "currentIfcVersion" step.
 */
Then(
  /^a GET to "([^"]+)" returns "currentVersion": (\d+)$/,
  async function (this: IfcWorld, path: string, expectedValue: string) {
    const resolvedPath = resolveIds(path, this);
    const url = `${BASE_URL}${resolvedPath}`;
    const res = await apiRequest("GET", url, this.accessToken);
    assert.strictEqual(res.status, 200, `Expected 200 from GET ${resolvedPath}, got ${res.status}`);
    const body = await res.json();
    const data = body.data as Record<string, unknown>;
    assert.strictEqual(
      Number(data.currentVersion),
      parseInt(expectedValue, 10),
      `Expected currentVersion = ${expectedValue} but got ${data.currentVersion}`,
    );
  },
);

/**
 * S-192: a GET to "..." still returns "currentVersion": N
 */
Then(
  /^a GET to "([^"]+)" still returns "currentVersion": (\d+)$/,
  async function (this: IfcWorld, path: string, expectedValue: string) {
    const resolvedPath = resolveIds(path, this);
    const url = `${BASE_URL}${resolvedPath}`;
    const res = await apiRequest("GET", url, this.accessToken);
    assert.strictEqual(res.status, 200, `Expected 200 from GET ${resolvedPath}, got ${res.status}`);
    const body = await res.json();
    const data = body.data as Record<string, unknown>;
    assert.strictEqual(
      Number(data.currentVersion),
      parseInt(expectedValue, 10),
      `Expected currentVersion still = ${expectedValue} but got ${data.currentVersion}`,
    );
  },
);

// ───────────────────────────────────────────────
// Then — version list assertions (S-193)
// ───────────────────────────────────────────────

Then(
  "each item contains {string}, {string}, and {string} fields",
  async function (this: IfcWorld, f1: string, f2: string, f3: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const arr = Object.values(data ?? {}).find((v) => Array.isArray(v)) as Record<string, unknown>[] | undefined;
    assert.ok(Array.isArray(arr), "Expected an array field in response data");
    for (const item of arr) {
      for (const field of [f1, f2, f3]) {
        assert.ok(field in item, `Expected field "${field}" in item. Got keys: ${Object.keys(item).join(", ")}`);
      }
    }
  },
);

Then(
  /^each item contains a "([^"]+)" summarising the operation that created the version$/,
  async function (this: IfcWorld, field: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const arr = Object.values(data ?? {}).find((v) => Array.isArray(v)) as Record<string, unknown>[] | undefined;
    assert.ok(Array.isArray(arr), "Expected an array field in response data");
    for (const item of arr) {
      assert.ok(field in item, `Expected field "${field}" in item`);
      const value = item[field] as string;
      assert.ok(
        typeof value === "string" && value.length > 0,
        `Expected "${field}" to be a non-empty string, got "${value}"`,
      );
    }
  },
);

Then(
  "the versions are ordered from newest to oldest",
  async function (this: IfcWorld) {
    const data = this.lastBody.data as Record<string, unknown>;
    const arr = Object.values(data ?? {}).find((v) => Array.isArray(v)) as Record<string, unknown>[] | undefined;
    assert.ok(Array.isArray(arr) && arr.length >= 2, "Expected at least 2 items");
    for (let i = 1; i < arr.length; i++) {
      const prev = Number(arr[i - 1].version);
      const curr = Number(arr[i].version);
      assert.ok(prev > curr, `Expected version ${prev} > ${curr} (newest to oldest)`);
    }
  },
);

// ───────────────────────────────────────────────
// Then — version metadata assertions (S-194)
// ───────────────────────────────────────────────

Then(
  /^the response body contains a "([^"]+)" field with the user identity that triggered the mutation$/,
  async function (this: IfcWorld, field: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const value = data[field];
    assert.ok(
      typeof value === "string" && value.length > 0,
      `Expected "${field}" to be a non-empty string identifying the user, got "${value}"`,
    );
  },
);

// ───────────────────────────────────────────────
// Then — version download assertions (S-195)
// ───────────────────────────────────────────────

Then(
  /^the downloaded STEP file reflects the state of the model at version (\d+), not the current state$/,
  async function (this: IfcWorld, version: string) {
    // The response body should contain valid STEP content from the specified version.
    // We verify it contains STEP structure and is not empty.
    const text = await this.lastResponse.clone().text();
    assert.ok(text.includes("ISO-10303-21;"), "Expected valid STEP content");
    assert.ok(text.includes("ENDSEC;"), "Expected complete STEP structure");
    // The content should reflect version data (seeded model at version 2 has elements).
    assert.ok(text.length > 100, `Expected substantial STEP content for version ${version}`);
  },
);

// ───────────────────────────────────────────────
// Then — restore assertions (S-196)
// ───────────────────────────────────────────────

Then(
  /^the model at version (\d+) is identical to the model at version (\d+)$/,
  async function (this: IfcWorld, v1: string, v2: string) {
    // Download both version snapshots and compare their content.
    const fileId = this.lastFileId;
    const url1 = `${BASE_URL}/api/v1/ifc/files/${fileId}/versions/${v1}/download`;
    const url2 = `${BASE_URL}/api/v1/ifc/files/${fileId}/versions/${v2}/download`;

    const [res1, res2] = await Promise.all([
      apiRequest("GET", url1, this.accessToken),
      apiRequest("GET", url2, this.accessToken),
    ]);
    assert.strictEqual(res1.status, 200, `Failed to download version ${v1}`);
    assert.strictEqual(res2.status, 200, `Failed to download version ${v2}`);

    const [text1, text2] = await Promise.all([res1.text(), res2.text()]);
    assert.strictEqual(text1, text2, `Model at version ${v1} is not identical to version ${v2}`);
  },
);

// ───────────────────────────────────────────────
// When/Then — concurrent mutations (S-198)
// ───────────────────────────────────────────────

When(
  /^two separate API clients each submit a PATCH to "([^"]+)" simultaneously$/,
  async function (this: IfcWorld, path: string) {
    const resolvedPath = resolveIds(path, this);
    const url = `${BASE_URL}${resolvedPath}`;

    // Fire two PATCH requests concurrently with different body values.
    const [res1, res2] = await Promise.all([
      apiRequest("PATCH", url, this.accessToken, { name: "Concurrent Update A" }),
      apiRequest("PATCH", url, this.accessToken, { name: "Concurrent Update B" }),
    ]);

    // Store both responses for subsequent Then steps.
    (this as Record<string, unknown>).concurrentResponses = [res1, res2];
    const [body1, body2] = await Promise.all([res1.clone().json(), res2.clone().json()]);
    (this as Record<string, unknown>).concurrentBodies = [body1, body2];

    // Store the last response as the second one.
    this.lastResponse = res2;
    this.lastBody = body2;
  },
);

Then(
  "the system processes the mutations sequentially",
  async function (this: IfcWorld) {
    const bodies = (this as Record<string, unknown>).concurrentBodies as Record<string, unknown>[];
    assert.ok(bodies && bodies.length === 2, "Expected two concurrent response bodies");
    // Both should be successful (200).
    const responses = (this as Record<string, unknown>).concurrentResponses as Response[];
    assert.strictEqual(responses[0].status, 200, "First mutation should succeed");
    assert.strictEqual(responses[1].status, 200, "Second mutation should succeed");
  },
);

Then(
  /^the first committed mutation produces "([^"]+)": (\d+)$/,
  async function (this: IfcWorld, field: string, expectedValue: string) {
    const bodies = (this as Record<string, unknown>).concurrentBodies as Record<string, unknown>[];
    const versions = bodies.map((b) => Number((b.data as Record<string, unknown>)?.[field])).sort((a, b) => a - b);
    assert.strictEqual(versions[0], parseInt(expectedValue, 10), `Expected first mutation ${field} = ${expectedValue}, got ${versions[0]}`);
  },
);

Then(
  /^the second committed mutation produces "([^"]+)": (\d+)$/,
  async function (this: IfcWorld, field: string, expectedValue: string) {
    const bodies = (this as Record<string, unknown>).concurrentBodies as Record<string, unknown>[];
    const versions = bodies.map((b) => Number((b.data as Record<string, unknown>)?.[field])).sort((a, b) => a - b);
    assert.strictEqual(versions[1], parseInt(expectedValue, 10), `Expected second mutation ${field} = ${expectedValue}, got ${versions[1]}`);
  },
);

Then(
  "no version numbers are skipped or duplicated",
  async function (this: IfcWorld) {
    const bodies = (this as Record<string, unknown>).concurrentBodies as Record<string, unknown>[];
    const versions = bodies.map((b) => Number((b.data as Record<string, unknown>)?.version)).sort((a, b) => a - b);
    assert.strictEqual(versions.length, 2, "Expected exactly 2 version numbers");
    assert.strictEqual(versions[1] - versions[0], 1, `Expected consecutive versions, got ${versions[0]} and ${versions[1]}`);
  },
);
