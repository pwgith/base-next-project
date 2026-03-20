/**
 * Step definitions for F-026 — IFC API OAuth Token Authentication and Authorisation.
 *
 * Common steps (response status, response body assertions, GET/DELETE requests)
 * are defined in ifcProjectManagement.steps.ts and reused here.
 * This file only defines steps unique to the authentication feature.
 */

import { Before, After, Given, When } from "@cucumber/cucumber";
import {
  BASE_URL,
  setupUserAndGetToken,
  teardownUsers,
  createTestProject,
  deleteAllProjects,
  resolveUrl,
  type IfcWorld,
} from "./ifcTestHelpers";

const AUTH_EMAIL = "auth-test@example.com";

// ─── Lifecycle ───────────────────────────────────────────────────────────────

Before({ tags: "@F-026" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  // Also initialise F-028-compatible world state so shared steps work
  (this as Record<string, unknown>).projectIdMap = (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-026" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ─── Given (F-026 specific) ──────────────────────────────────────────────────

Given(
  "the user holds a valid OAuth token with scope {string} only",
  async function (this: IfcWorld, scopeString: string) {
    const scopes = scopeString.split(/\s+/).filter(Boolean);
    const email = AUTH_EMAIL;
    this.accessToken = await setupUserAndGetToken(email, scopes);
    this.createdEmails.push(email);
    this.tokensByEmail.set(email, this.accessToken);
  },
);

// ─── When (F-026 specific) ───────────────────────────────────────────────────

When(
  "a GET request is sent to {string} without an Authorization header",
  async function (this: IfcWorld, path: string) {
    const fileIdMap = this.fileIdMap ?? new Map();
    const projectIdMap = (this as Record<string, unknown>).projectIdMap as Map<string, string> ?? new Map();
    // Merge both maps for URL resolution
    const merged = new Map([...fileIdMap, ...projectIdMap]);
    const url = resolveUrl(path, merged);
    this.lastResponse = await fetch(url, { method: "GET" });
    try {
      this.lastBody = await this.lastResponse.clone().json();
    } catch {
      this.lastBody = {};
    }
  },
);

When(
  "a GET request is sent to {string} with an expired Bearer token",
  async function (this: IfcWorld, path: string) {
    const fileIdMap = this.fileIdMap ?? new Map();
    const projectIdMap = (this as Record<string, unknown>).projectIdMap as Map<string, string> ?? new Map();
    const merged = new Map([...fileIdMap, ...projectIdMap]);
    const url = resolveUrl(path, merged);
    const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid";
    this.lastResponse = await fetch(url, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    try {
      this.lastBody = await this.lastResponse.clone().json();
    } catch {
      this.lastBody = {};
    }
  },
);

When(
  "a GET request is sent to {string} with Authorization header {string}",
  async function (this: IfcWorld, path: string, authHeader: string) {
    const fileIdMap = this.fileIdMap ?? new Map();
    const projectIdMap = (this as Record<string, unknown>).projectIdMap as Map<string, string> ?? new Map();
    const merged = new Map([...fileIdMap, ...projectIdMap]);
    const url = resolveUrl(path, merged);
    this.lastResponse = await fetch(url, {
      headers: { Authorization: authHeader },
    });
    try {
      this.lastBody = await this.lastResponse.clone().json();
    } catch {
      this.lastBody = {};
    }
  },
);

When(
  "a POST request is sent to {string} with a valid IFC STEP file",
  async function (this: IfcWorld, path: string) {
    const fileIdMap = this.fileIdMap ?? new Map();
    const projectIdMap = (this as Record<string, unknown>).projectIdMap as Map<string, string> ?? new Map();
    const merged = new Map([...fileIdMap, ...projectIdMap]);
    const url = resolveUrl(path, merged);
    const formData = new FormData();
    const blob = new Blob(
      ["ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;"],
      { type: "application/x-step" },
    );
    formData.append("file", blob, "test.ifc");
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
