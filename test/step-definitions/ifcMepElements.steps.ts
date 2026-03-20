/**
 * Step definitions for F-018 — IFC MEP Element Management.
 *
 * Common steps come from ifcProjectManagement.steps.ts, ifcCommonSteps.ts,
 * and ifcBuildingElements.steps.ts (storey setup, element arrays, item assertions).
 * This file defines only steps unique to the MEP feature.
 */

import { Before, After, Given } from "@cucumber/cucumber";
import {
  teardownUsers,
  deleteAllProjects,
  seedModelData,
  type IfcWorld,
} from "./ifcTestHelpers";

// ─── Lifecycle ───────────────────────────────────────────────────────────────

Before({ tags: "@F-018" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-018" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ─── Given — data setup ─────────────────────────────────────────────────────

Given(
  "the ground floor contains an {string}, an {string}, and an {string}",
  async function (this: IfcWorld, type1: string, type2: string, type3: string) {
    const fileId = this.lastFileId;
    const storeyId = "3HVHnEQiv5Fe2LJwPJMC9j";
    const elements = [
      { globalId: "mep0001", ifcType: type1, name: `${type1}-001`, storeyGlobalId: storeyId },
      { globalId: "mep0002", ifcType: type2, name: `${type2}-001`, storeyGlobalId: storeyId },
      { globalId: "mep0003", ifcType: type3, name: `${type3}-001`, storeyGlobalId: storeyId },
    ];
    await seedModelData(fileId, { elements } as Record<string, unknown>);
  },
);

Given(
  "an MEP element exists with globalId {string}",
  async function (this: IfcWorld, globalId: string) {
    const fileId = this.lastFileId;
    await seedModelData(fileId, {
      elements: [
        {
          globalId,
          ifcType: "IfcDuctSegment",
          name: "Test MEP Element",
          storeyGlobalId: "3HVHnEQiv5Fe2LJwPJMC9j",
        },
      ],
    } as Record<string, unknown>);
  },
);
