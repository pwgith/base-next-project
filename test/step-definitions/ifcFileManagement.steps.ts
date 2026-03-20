/**
 * Step definitions for F-015 — IFC File Management (UC-USR-015).
 *
 * Common steps (response assertions, requests, file creation) come from:
 *   - ifcProjectManagement.steps.ts (response status, body assertions, GET/POST/DELETE)
 *   - ifcCommonSteps.ts (file creation, header assertions, multipart upload)
 *
 * This file defines only steps unique to the file management feature.
 */

import { Before, After, Given } from "@cucumber/cucumber";
import {
  setupUserAndGetToken,
  teardownUsers,
  deleteAllProjects,
  createTestProjectForUser,
  type IfcWorld,
} from "./ifcTestHelpers";

const FILE_MGMT_EMAIL = "file-mgmt@example.com";

// ─── Lifecycle ───────────────────────────────────────────────────────────────

Before({ tags: "@F-015" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-015" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ─── Given — data setup ─────────────────────────────────────────────────────

/**
 * S-102: Create two pre-existing IFC files with specific names and fixture IDs.
 */
Given(
  "the user has previously uploaded IFC files named {string} with ID {string} and {string} with ID {string}",
  async function (
    this: IfcWorld,
    name1: string, id1: string,
    name2: string, id2: string,
  ) {
    let email = "";
    for (const [e, t] of this.tokensByEmail) {
      if (t === this.accessToken) { email = e; break; }
    }
    if (!email) throw new Error("Cannot determine email for current token");

    const realId1 = await createTestProjectForUser(email, name1);
    const realId2 = await createTestProjectForUser(email, name2);

    this.fileIdMap.set(id1, realId1);
    this.fileIdMap.set(id2, realId2);
    const pMap = (this as Record<string, unknown>).projectIdMap as Map<string, string>;
    pMap.set(id1, realId1);
    pMap.set(id2, realId2);
  },
);

/**
 * S-103: Create an IFC file with a specific name and schema.
 */
Given(
  "the user has an IFC file with ID {string} named {string} using schema {string}",
  async function (
    this: IfcWorld,
    fixtureId: string, name: string, _schema: string,
  ) {
    let email = "";
    for (const [e, t] of this.tokensByEmail) {
      if (t === this.accessToken) { email = e; break; }
    }
    if (!email) throw new Error("Cannot determine email for current token");

    const realId = await createTestProjectForUser(email, name);
    this.fileIdMap.set(fixtureId, realId);
    this.lastFileId = realId;
    const pMap = (this as Record<string, unknown>).projectIdMap as Map<string, string>;
    pMap.set(fixtureId, realId);
  },
);
