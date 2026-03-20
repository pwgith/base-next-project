/**
 * Step definitions for F-038 — Build a complete house model from scratch.
 *
 * Single-scenario feature: all state lives in the Cucumber World instance.
 * Uses unique step patterns (e.g. "the user POSTs to …") to avoid
 * ambiguity with steps in ifcProjectManagement.steps.ts / ifcCommonSteps.ts.
 */

import { Given, When, Then, Before, After } from "@cucumber/cucumber";
import assert from "assert";
import {
  type IfcWorld,
  BASE_URL,
  teardownUsers,
  deleteAllProjects,
  apiRequest,
  setupUserAndGetToken,
  seedModelData,
} from "./ifcTestHelpers";

// ─── Per-scenario stored IDs (single scenario, so World-level is fine) ────────

function getStoredIds(world: IfcWorld): Map<string, string> {
  const w = world as Record<string, unknown>;
  if (!w._storedIds) w._storedIds = new Map<string, string>();
  return w._storedIds as Map<string, string>;
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

Before({ tags: "@F-038" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-038" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Replace {placeholder} tokens in a string with stored IDs and fileIdMap. */
function resolveIds(text: string, world: IfcWorld): string {
  let resolved = text;
  for (const [key, value] of getStoredIds(world)) {
    resolved = resolved.replaceAll(`{${key}}`, value);
  }
  for (const [fixture, real] of world.fileIdMap ?? new Map()) {
    resolved = resolved.replaceAll(fixture, real);
  }
  return resolved;
}

// ─── Given — Authentication ──────────────────────────────────────────────────

Given(
  "the house plan user is authenticated with scope {string}",
  async function (this: IfcWorld, scopeString: string) {
    const email = `f038-house-${Date.now()}@example.com`;
    const scopes = scopeString.split(/\s+/).filter(Boolean);
    this.accessToken = await setupUserAndGetToken(email, scopes);
    this.createdEmails.push(email);
    this.tokensByEmail.set(email, this.accessToken);
    await deleteAllProjects(this.accessToken);
  },
);

// ─── Given — Site & building seed ────────────────────────────────────────────

Given(
  "the IFC file {string} has a default site and building",
  async function (this: IfcWorld, _fixtureId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      project: { ifcType: "IfcProject", globalId: "proj-house-001", name: "House Plan" },
      sites: [
        { globalId: "0SiteHouse0000000000001", ifcType: "IfcSite", name: "Default Site", buildings: ["0BldgHouse0000000000001"] },
      ],
      buildings: [
        { globalId: "0BldgHouse0000000000001", ifcType: "IfcBuilding", name: "Default Building", storeys: [] },
      ],
    } as Record<string, unknown>);
  },
);

// ─── When — HTTP verbs ───────────────────────────────────────────────────────

When(
  "the user POSTs to {string} with:",
  async function (this: IfcWorld, path: string, bodyString: string) {
    const url = `${BASE_URL}${resolveIds(path, this)}`;
    const body = JSON.parse(resolveIds(bodyString, this));
    this.lastResponse = await apiRequest("POST", url, this.accessToken, body);
    try { this.lastBody = await this.lastResponse.clone().json(); } catch { this.lastBody = {}; }
  },
);

When(
  "the user GETs {string}",
  async function (this: IfcWorld, path: string) {
    const url = `${BASE_URL}${resolveIds(path, this)}`;
    this.lastResponse = await apiRequest("GET", url, this.accessToken);
    try { this.lastBody = await this.lastResponse.clone().json(); } catch { this.lastBody = {}; }
  },
);

When(
  "the user PATCHes {string} with:",
  async function (this: IfcWorld, path: string, bodyString: string) {
    const url = `${BASE_URL}${resolveIds(path, this)}`;
    const body = JSON.parse(resolveIds(bodyString, this));
    this.lastResponse = await apiRequest("PATCH", url, this.accessToken, body);
    try { this.lastBody = await this.lastResponse.clone().json(); } catch { this.lastBody = {}; }
  },
);

When(
  "the user PUTs to {string} with:",
  async function (this: IfcWorld, path: string, bodyString: string) {
    const url = `${BASE_URL}${resolveIds(path, this)}`;
    const body = JSON.parse(resolveIds(bodyString, this));
    this.lastResponse = await apiRequest("PUT", url, this.accessToken, body);
    try { this.lastBody = await this.lastResponse.clone().json(); } catch { this.lastBody = {}; }
  },
);

// ─── Then — Response assertions ──────────────────────────────────────────────

Then(
  "the response code is {int}",
  async function (this: IfcWorld, expected: number) {
    assert.strictEqual(
      this.lastResponse.status,
      expected,
      `Expected ${expected} but got ${this.lastResponse.status}. Body: ${JSON.stringify(this.lastBody)}`,
    );
  },
);

Then(
  "the response data contains {string}: {string}",
  async function (this: IfcWorld, key: string, expectedValue: string) {
    const data = (this.lastBody as Record<string, unknown>).data as Record<string, unknown> | undefined;
    const container = data ?? this.lastBody;
    assert.strictEqual(
      String(container[key] ?? ""),
      expectedValue,
      `Expected "${key}" = "${expectedValue}" but got "${container[key]}"`,
    );
  },
);

Then(
  "the response data contains a {string} field",
  async function (this: IfcWorld, fieldName: string) {
    const data = (this.lastBody as Record<string, unknown>).data as Record<string, unknown> | undefined;
    const container = data ?? this.lastBody;
    assert.ok(
      container[fieldName] !== undefined && container[fieldName] !== null,
      `Expected field "${fieldName}" in response. Body: ${JSON.stringify(this.lastBody)}`,
    );
  },
);

Then(
  "the user saves response field {string} as {string}",
  async function (this: IfcWorld, fieldName: string, alias: string) {
    const data = (this.lastBody as Record<string, unknown>).data as Record<string, unknown> | undefined;
    const container = data ?? this.lastBody;
    const value = container[fieldName];
    assert.ok(value !== undefined && value !== null, `Field "${fieldName}" missing. Body: ${JSON.stringify(this.lastBody)}`);
    getStoredIds(this).set(alias, String(value));
  },
);

Then(
  "the response data has property {string} with value {string}",
  async function (this: IfcWorld, propName: string, expectedValue: string) {
    const data = (this.lastBody as Record<string, unknown>).data as Record<string, unknown> | undefined;
    const container = data ?? this.lastBody;
    // Check a "properties" array (property sets)
    const properties = (container as Record<string, unknown>).properties as Array<Record<string, unknown>> | undefined;
    if (properties) {
      const prop = properties.find((p) => p.name === propName);
      assert.ok(prop, `Property "${propName}" not found in properties array`);
      assert.strictEqual(String(prop!.value), expectedValue);
      return;
    }
    // Fallback: top-level field
    assert.strictEqual(String(container[propName] ?? ""), expectedValue);
  },
);

Then(
  "the spatial structure includes a storey named {string}",
  async function (this: IfcWorld, storeyName: string) {
    const data = (this.lastBody as Record<string, unknown>).data as Record<string, unknown> | undefined;
    const container = data ?? this.lastBody;
    function findStorey(node: unknown): boolean {
      if (!node || typeof node !== "object") return false;
      if (Array.isArray(node)) {
        return node.some((child) => findStorey(child));
      }
      const obj = node as Record<string, unknown>;
      if (obj.name === storeyName && (obj.ifcType === "IfcBuildingStorey" || obj.type === "IfcBuildingStorey")) return true;
      for (const val of Object.values(obj)) {
        if (val && typeof val === "object" && findStorey(val)) return true;
      }
      return false;
    }
    assert.ok(findStorey(container), `Storey "${storeyName}" not found in spatial structure. Body: ${JSON.stringify(this.lastBody)}`);
  },
);

Then(
  "the elements list includes {string}",
  async function (this: IfcWorld, elementName: string) {
    const data = (this.lastBody as Record<string, unknown>).data as Record<string, unknown> | undefined;
    const container = data ?? this.lastBody;
    const elements = (Array.isArray(container)
      ? container
      : (container as Record<string, unknown>).elements ?? []) as Array<Record<string, unknown>>;
    const found = elements.some((e) => e.name === elementName);
    assert.ok(found, `Element "${elementName}" not found. Elements: ${elements.map((e) => e.name).join(", ")}`);
  },
);

Then(
  "the versions list has more than {int} entry",
  async function (this: IfcWorld, minCount: number) {
    const data = (this.lastBody as Record<string, unknown>).data as Record<string, unknown> | undefined;
    const container = data ?? this.lastBody;
    const versions = (Array.isArray(container)
      ? container
      : (container as Record<string, unknown>).versions ?? []) as unknown[];
    assert.ok(versions.length > minCount, `Expected > ${minCount} versions but got ${versions.length}`);
  },
);

// ─── Export — download file and save to disk ─────────────────────────────────

import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

When(
  "the user exports {string}",
  async function (this: IfcWorld, path: string) {
    const url = `${BASE_URL}${resolveIds(path, this)}`;
    this.lastResponse = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    // Store raw response buffer for file saving
    const w = this as Record<string, unknown>;
    w._exportBuffer = Buffer.from(await this.lastResponse.clone().arrayBuffer());
    try { this.lastBody = await this.lastResponse.clone().json(); } catch { this.lastBody = {}; }
  },
);

Then(
  "the exported file is saved to {string}",
  async function (this: IfcWorld, relativePath: string) {
    const w = this as Record<string, unknown>;
    const buffer = w._exportBuffer as Buffer;
    assert.ok(buffer && buffer.length > 0, "No export data to save");
    const outPath = resolve(process.cwd(), relativePath);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, buffer);
  },
);
