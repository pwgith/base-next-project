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

Before({ tags: "@F-036" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-036" }, async function (this: IfcWorld) {
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
// Given — Classification system with edition
// ───────────────────────────────────────────────

// S-259: classification system with a specific edition
Given(
  "the IFC file references the classification system {string} with systemId {string} and edition {string}",
  async function (this: IfcWorld, name: string, systemId: string, edition: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      classifications: [
        { systemId, name, source: "https://www.thenbs.com/our-tools/uniclass-2015", edition },
      ],
    } as Record<string, unknown>);
  },
);

// S-260: no element references for a classification system (no-op, just ensures no refs seeded)
Given(
  "no elements in the file reference classification system {string}",
  async function (this: IfcWorld, _systemId: string) {
    // Intentionally empty — the Given that seeds the system does not seed references
  },
);

// S-261: wall has a classification reference under a system
Given(
  "the wall {string} has a classification reference under system {string}",
  async function (this: IfcWorld, wallGlobalId: string, systemId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      elements: [{ globalId: wallGlobalId, ifcType: "IfcWall", name: "Test Wall" }],
      classificationReferences: [
        { referenceId: "ref-auto-036", systemId, notation: "Ss_15_10_30_14", name: "External walls", elementGlobalId: wallGlobalId },
      ],
    } as Record<string, unknown>);
  },
);

// S-262: two classification systems
Given(
  /^the IFC file references classification systems "(.*)" \(systemId "(.*?)"\) and "(.*)" \(systemId "(.*?)"\)$/,
  async function (this: IfcWorld, name1: string, id1: string, name2: string, id2: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      classifications: [
        { systemId: id1, name: name1, source: "https://example.com" },
        { systemId: id2, name: name2, source: "https://example.com" },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Then — Subsequent GET does not include system
// ───────────────────────────────────────────────

Then(
  /^a subsequent GET to "(.*)" does not include system "(.*)"$/,
  async function (this: IfcWorld, path: string, systemName: string) {
    const url = resolvePathForWorld(path, this);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const body = await response.json();
    const data = body.data as Record<string, unknown>;
    for (const val of Object.values(data ?? {})) {
      if (Array.isArray(val)) {
        const found = val.some((item: Record<string, unknown>) =>
          item.name === systemName,
        );
        assert.ok(!found, `Expected system "${systemName}" to not appear in response`);
      }
    }
  },
);
