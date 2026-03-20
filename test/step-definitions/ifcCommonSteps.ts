/**
 * Common IFC step definitions shared across multiple IFC feature files.
 *
 * These steps are used by F-015 through F-027 (the REST API features).
 * Steps that are already defined in ifcProjectManagement.steps.ts (F-028)
 * are NOT duplicated here — they continue to live in that file.
 *
 * This file defines only steps that are:
 *   1. Used by two or more IFC features, AND
 *   2. Not already defined in ifcProjectManagement.steps.ts
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert";
import {
  IFC_FILES_URL,
  createTestProjectForUser,
  setupUserAndGetToken,
  teardownUsers,
  apiRequest,
  type IfcWorld,
} from "./ifcTestHelpers";

// ─── Background / Given ─────────────────────────────────────────────────────

/**
 * Create an IFC file (project) for the current user, mapped by a fixture ID.
 * Uses the test endpoint to bypass OAuth scope checks so this works even when
 * the user's token has restricted scopes (e.g. ifc:read only).
 *
 * Used by: F-015, F-016, F-017, F-018, F-019, F-020, F-021, F-022, F-023,
 *          F-024, F-025, F-026, F-027
 */
Given(
  "the user has an IFC file with ID {string}",
  async function (this: IfcWorld, fixtureId: string) {
    // Find the email for the current access token.
    let email = "";
    for (const [e, t] of this.tokensByEmail) {
      if (t === this.accessToken) {
        email = e;
        break;
      }
    }
    if (!email) {
      throw new Error("Cannot determine email for current access token");
    }

    // Create the project via the test endpoint (bypasses auth/scopes).
    const realId = await createTestProjectForUser(email, `${fixtureId}.ifc`);

    // Store in fileIdMap (used by feature-specific steps).
    this.fileIdMap = this.fileIdMap ?? new Map();
    this.fileIdMap.set(fixtureId, realId);
    this.lastFileId = realId;

    // Also store in projectIdMap so the shared When steps in F-028 can resolve
    // fixture IDs in URL paths (e.g. "/api/v1/ifc/files/file-001" → real ID).
    const projectIdMap = ((this as Record<string, unknown>).projectIdMap ?? new Map()) as Map<string, string>;
    (this as Record<string, unknown>).projectIdMap = projectIdMap;
    projectIdMap.set(fixtureId, realId);
  },
);

// ─── Then — Response header assertions ──────────────────────────────────────

/**
 * Assert a response header has a specific value.
 * Used by F-026 (WWW-Authenticate) and potentially other features.
 */
Then(
  "the response contains a {string} header with value {string}",
  async function (this: IfcWorld, headerName: string, expectedValue: string) {
    const actual = this.lastResponse.headers.get(headerName);
    assert.ok(
      actual !== null,
      `Expected response to contain header "${headerName}" but it was not present`,
    );
    assert.strictEqual(
      actual,
      expectedValue,
      `Expected header "${headerName}" to be "${expectedValue}" but got "${actual}"`,
    );
  },
);

/**
 * Assert the response Content-Type header.
 * Used by F-015 (file download), F-025 (export), F-027 (version download).
 */
Then(
  "the response Content-Type is {string}",
  async function (this: IfcWorld, expected: string) {
    const contentType = this.lastResponse.headers.get("content-type") ?? "";
    assert.ok(
      contentType.includes(expected),
      `Expected Content-Type to include "${expected}" but got "${contentType}"`,
    );
  },
);

/**
 * Assert the Content-Disposition header includes a filename.
 * Used by F-015, F-025, F-027.
 */
Then(
  "the response Content-Disposition header includes filename {string}",
  async function (this: IfcWorld, expectedFilename: string) {
    const header = this.lastResponse.headers.get("content-disposition") ?? "";
    assert.ok(
      header.includes(expectedFilename),
      `Expected Content-Disposition to include filename "${expectedFilename}" but got "${header}"`,
    );
  },
);

/**
 * Assert a generic response header value.
 * Used by F-027 (X-IFC-Version).
 */
Then(
  "the response header {string} is {string}",
  async function (this: IfcWorld, headerName: string, expectedValue: string) {
    const actual = this.lastResponse.headers.get(headerName);
    assert.ok(
      actual !== null,
      `Expected header "${headerName}" to be present`,
    );
    assert.strictEqual(actual, expectedValue);
  },
);

// ─── Then — Response body text assertions ────────────────────────────────────

/**
 * Assert response body starts with a particular string.
 * Used by F-015 (download IFC), F-025 (export STEP).
 */
Then(
  "the response body starts with {string}",
  async function (this: IfcWorld, prefix: string) {
    const text = await this.lastResponse.clone().text();
    assert.ok(
      text.startsWith(prefix),
      `Expected response body to start with "${prefix}" but got "${text.substring(0, 50)}..."`,
    );
  },
);

// ─── When — POST request without body ────────────────────────────────────────

/**
 * POST request without a body. Used by F-027 (version restore).
 */
When(
  /^a POST request is sent to "([^"]+)"$/,
  async function (this: IfcWorld, path: string) {
    const projectIdMap = ((this as Record<string, unknown>).projectIdMap ?? new Map()) as Map<string, string>;
    let resolvedPath = path;
    for (const [fixture, real] of projectIdMap) {
      resolvedPath = resolvedPath.replaceAll(fixture, real);
    }
    for (const [fixture, real] of (this.fileIdMap ?? new Map())) {
      resolvedPath = resolvedPath.replaceAll(fixture, real);
    }

    const url = `http://localhost:3000${resolvedPath}`;
    this.lastResponse = await apiRequest("POST", url, this.accessToken);
    try {
      this.lastBody = await this.lastResponse.clone().json();
    } catch {
      this.lastBody = {};
    }
  },
);

// ─── When — file upload via multipart/form-data ──────────────────────────────

/**
 * Upload a file via multipart/form-data.
 * Used by F-015 (file upload) and F-026 (POST with valid IFC file).
 */
When(
  "a POST request is sent to {string} with the file {string} as multipart\\/form-data",
  async function (this: IfcWorld, path: string, fileName: string) {
    const projectIdMap = ((this as Record<string, unknown>).projectIdMap ?? new Map()) as Map<string, string>;
    let resolvedPath = path;
    for (const [fixture, real] of projectIdMap) {
      resolvedPath = resolvedPath.replaceAll(fixture, real);
    }
    for (const [fixture, real] of (this.fileIdMap ?? new Map())) {
      resolvedPath = resolvedPath.replaceAll(fixture, real);
    }

    const formData = new FormData();
    const blob = new Blob(
      ["ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;"],
      { type: "application/x-step" },
    );
    formData.append("file", blob, fileName);

    const url = `http://localhost:3000${resolvedPath}`;
    this.lastResponse = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: formData,
    });
    try {
      this.lastBody = await this.lastResponse.clone().json();
    } catch {
      this.lastBody = {};
    }
  },
);

// ─── When — PUT request ─────────────────────────────────────────────────────

/**
 * PUT request with JSON body. Used by F-020 (materials), F-022 (relationships).
 */
When(
  "a PUT request is sent to {string} with body:",
  async function (this: IfcWorld, path: string, bodyString: string) {
    const body = JSON.parse(bodyString);
    const projectIdMap = ((this as Record<string, unknown>).projectIdMap ?? new Map()) as Map<string, string>;
    let resolvedPath = path;
    for (const [fixture, real] of projectIdMap) {
      resolvedPath = resolvedPath.replaceAll(fixture, real);
    }
    for (const [fixture, real] of (this.fileIdMap ?? new Map())) {
      resolvedPath = resolvedPath.replaceAll(fixture, real);
    }

    const url = `http://localhost:3000${resolvedPath}`;
    this.lastResponse = await apiRequest("PUT", url, this.accessToken, body);
    try {
      this.lastBody = await this.lastResponse.clone().json();
    } catch {
      this.lastBody = {};
    }
  },
);

// ─── Given — multi-user scenarios ───────────────────────────────────────────

/**
 * Create an IFC file owned by a different user. Used by F-015 (S-107), F-026.
 */
Given(
  "another user owns an IFC file with ID {string}",
  async function (this: IfcWorld, fixtureId: string) {
    const otherEmail = "other.ifc.user@example.com";

    // Ensure the other user exists with full scopes.
    if (!this.tokensByEmail.has(otherEmail)) {
      const token = await setupUserAndGetToken(otherEmail);
      this.createdEmails.push(otherEmail);
      this.tokensByEmail.set(otherEmail, token);
    }

    // Create the project via the test endpoint (bypasses auth).
    const realId = await createTestProjectForUser(otherEmail, `${fixtureId}.ifc`);

    // Store mapping so URL resolution works.
    this.fileIdMap = this.fileIdMap ?? new Map();
    this.fileIdMap.set(fixtureId, realId);
    const projectIdMap = ((this as Record<string, unknown>).projectIdMap ?? new Map()) as Map<string, string>;
    (this as Record<string, unknown>).projectIdMap = projectIdMap;
    projectIdMap.set(fixtureId, realId);
  },
);

// ─── Then — numeric field assertions ─────────────────────────────────────────

/**
 * Assert a field in the response data is an integer.
 * Used by F-015 (elementCount), F-024 (count fields).
 */
Then(
  "the response body contains an {string} integer",
  async function (this: IfcWorld, fieldName: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const value = data[fieldName];
    assert.ok(
      typeof value === "number" && Number.isInteger(value),
      `Expected ${fieldName} to be an integer, got ${typeof value}: ${value}`,
    );
  },
);

/**
 * Assert a numeric (float) field value in the response data.
 * Uses regex requiring a decimal point to avoid ambiguity with the {int} step.
 * Used by F-016 (elevation), F-021 (coordinates), F-020 (thickness).
 */
Then(
  /^the response body contains "([^"]+)": (\d+\.\d+)$/,
  async function (this: IfcWorld, fieldName: string, rawValue: string) {
    const expected = Number(rawValue);
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, `Expected data in response body. Got: ${JSON.stringify(this.lastBody)}`);
    const actual = Number(data[fieldName]);
    assert.ok(
      Math.abs(actual - expected) < 0.001,
      `Expected ${fieldName} = ${expected} but got ${data[fieldName]}`,
    );
  },
);
