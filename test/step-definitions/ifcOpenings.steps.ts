import { Given, Then, Before, After } from "@cucumber/cucumber";
import assert from "assert";
import {
  type IfcWorld,
  BASE_URL,
  teardownUsers,
  deleteAllProjects,
  seedModelData,
  apiRequest,
} from "./ifcTestHelpers";

// ───────────────────────────────────────────────
// Lifecycle
// ───────────────────────────────────────────────

Before({ tags: "@F-033" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-033" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function resolvePath(path: string, world: IfcWorld): string {
  let resolved = path;
  for (const [fixture, real] of (world.fileIdMap ?? new Map())) {
    resolved = resolved.replaceAll(fixture, real);
  }
  const projectIdMap = ((world as Record<string, unknown>).projectIdMap ?? new Map()) as Map<string, string>;
  for (const [fixture, real] of projectIdMap) {
    resolved = resolved.replaceAll(fixture, real);
  }
  return resolved;
}

// ───────────────────────────────────────────────
// Given — Seed openings and filling elements
// ───────────────────────────────────────────────

Given(
  /^the wall "(.*)" has openings "(.*)" \(globalId "(.*?)"\) and "(.*)" \(globalId "(.*?)"\)$/,
  async function (this: IfcWorld, hostGlobalId: string, name1: string, gid1: string, name2: string, gid2: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      openings: [
        {
          globalId: gid1,
          name: name1,
          ifcType: "IfcOpeningElement",
          hostElementGlobalId: hostGlobalId,
          placement: { x: 1.0, y: 0.0, z: 0.0 },
          dimensions: { width: 0.9, height: 2.1 },
        },
        {
          globalId: gid2,
          name: name2,
          ifcType: "IfcOpeningElement",
          hostElementGlobalId: hostGlobalId,
          placement: { x: 4.0, y: 0.0, z: 0.5 },
          dimensions: { width: 1.2, height: 1.5 },
        },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  "the wall {string} has an opening with globalId {string}",
  async function (this: IfcWorld, hostGlobalId: string, openingGlobalId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      openings: [
        {
          globalId: openingGlobalId,
          name: "Test Opening",
          ifcType: "IfcOpeningElement",
          hostElementGlobalId: hostGlobalId,
          placement: { x: 0, y: 0, z: 0 },
          dimensions: { width: 0.9, height: 2.1 },
        },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  "the file contains a door with globalId {string} named {string}",
  async function (this: IfcWorld, globalId: string, name: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      elements: [
        { globalId, ifcType: "IfcDoor", name, storeyGlobalId: "0Stor00000000000000001" },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  "the file contains a window with globalId {string} named {string}",
  async function (this: IfcWorld, globalId: string, name: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      elements: [
        { globalId, ifcType: "IfcWindow", name, storeyGlobalId: "0Stor00000000000000001" },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  "the file contains a window with globalId {string}",
  async function (this: IfcWorld, globalId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      elements: [
        { globalId, ifcType: "IfcWindow", name: "Unnamed Window", storeyGlobalId: "0Stor00000000000000001" },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  "the wall {string} has an opening with globalId {string} filled by door {string}",
  async function (this: IfcWorld, hostGlobalId: string, openingGlobalId: string, doorGlobalId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      openings: [
        {
          globalId: openingGlobalId,
          name: "Test Opening",
          ifcType: "IfcOpeningElement",
          hostElementGlobalId: hostGlobalId,
          placement: { x: 0, y: 0, z: 0 },
          dimensions: { width: 0.9, height: 2.1 },
          fillingGlobalId: doorGlobalId,
        },
      ],
      elements: [
        { globalId: doorGlobalId, ifcType: "IfcDoor", name: "D01 - Fire Door", storeyGlobalId: "0Stor00000000000000001" },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Then — Subsequent GET assertions (F-033 specific)
// ───────────────────────────────────────────────

Then(
  /^a subsequent GET to "(.*)" does not include opening "(.*)"$/,
  async function (this: IfcWorld, path: string, openingGlobalId: string) {
    const url = `${BASE_URL}${resolvePath(path, this)}`;
    const response = await apiRequest("GET", url, this.accessToken);
    const body = await response.json();
    const data = body.data as Record<string, unknown>;
    for (const val of Object.values(data ?? {})) {
      if (Array.isArray(val)) {
        const found = val.some((item: Record<string, unknown>) =>
          item.globalId === openingGlobalId || String(item.globalId) === openingGlobalId,
        );
        assert.ok(!found, `Expected "${openingGlobalId}" to not appear in response`);
      }
    }
  },
);
