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

Before({ tags: "@F-034" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-034" }, async function (this: IfcWorld) {
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
// Given — Seed elements (pipe segment, duct, air terminal)
// ───────────────────────────────────────────────

Given(
  "the file contains a pipe segment with globalId {string} named {string}",
  async function (this: IfcWorld, globalId: string, name: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      sites: [{ globalId: "0Site00000000000000001", ifcType: "IfcSite", name: "Default Site", buildings: ["0Bldg00000000000000001"] }],
      buildings: [{ globalId: "0Bldg00000000000000001", ifcType: "IfcBuilding", name: "Default Building", storeys: ["0Stor00000000000000001"] }],
      storeys: [{ globalId: "0Stor00000000000000001", ifcType: "IfcBuildingStorey", name: "Ground Floor", elements: [globalId], spaces: [] }],
      elements: [{ globalId, ifcType: "IfcPipeSegment", name, storeyGlobalId: "0Stor00000000000000001" }],
    } as Record<string, unknown>);
  },
);

Given(
  "the file contains a duct segment with globalId {string} named {string}",
  async function (this: IfcWorld, globalId: string, name: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      elements: [{ globalId, ifcType: "IfcDuctSegment", name, storeyGlobalId: "0Stor00000000000000001" }],
    } as Record<string, unknown>);
  },
);

Given(
  "the file contains an air terminal with globalId {string} named {string}",
  async function (this: IfcWorld, globalId: string, name: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      elements: [{ globalId, ifcType: "IfcAirTerminal", name, storeyGlobalId: "0Stor00000000000000001" }],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Given — Seed ports
// ───────────────────────────────────────────────

Given(
  /^the pipe "(.*)" has ports "(.*)" \(portId "(.*?)", flowDirection "(.*?)"\) and "(.*)" \(portId "(.*?)", flowDirection "(.*?)"\)$/,
  async function (this: IfcWorld, elementGlobalId: string, name1: string, pid1: string, dir1: string, name2: string, pid2: string, dir2: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      ports: [
        { portId: pid1, name: name1, ifcType: "IfcDistributionPort", elementGlobalId, flowDirection: dir1 },
        { portId: pid2, name: name2, ifcType: "IfcDistributionPort", elementGlobalId, flowDirection: dir2 },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  /^the pipe "(.*)" has a port with portId "(.*)" \(flowDirection "(.*?)"\)$/,
  async function (this: IfcWorld, elementGlobalId: string, portId: string, flowDirection: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      ports: [
        { portId, name: `Port-${portId}`, ifcType: "IfcDistributionPort", elementGlobalId, flowDirection },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  /^the duct has a port with portId "(.*)" \(flowDirection "(.*?)"\)$/,
  async function (this: IfcWorld, portId: string, flowDirection: string) {
    const fileId = this.lastFileId!;
    // Find the duct segment in the last seeded data (9rStUvWxYzAb3C4D5E6F7G from S-245)
    await seedModelData(fileId, {
      ports: [
        { portId, name: `Port-${portId}`, ifcType: "IfcDistributionPort", elementGlobalId: "9rStUvWxYzAb3C4D5E6F7G", flowDirection },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  /^the terminal has a port with portId "(.*)" \(flowDirection "(.*?)"\)$/,
  async function (this: IfcWorld, portId: string, flowDirection: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      ports: [
        { portId, name: `Port-${portId}`, ifcType: "IfcDistributionPort", elementGlobalId: "0sTuVwXyZaBc4D5E6F7G8H", flowDirection },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Given — Seed connections
// ───────────────────────────────────────────────

Given(
  /^the pipe "(.*)" is connected to "(.*)" \(connectionId "(.*?)"\) and "(.*)" \(connectionId "(.*?)"\)$/,
  async function (this: IfcWorld, pipeGlobalId: string, _name1: string, connId1: string, _name2: string, connId2: string) {
    const fileId = this.lastFileId!;
    // Seed a valve element for the second connection
    await seedModelData(fileId, {
      elements: [
        { globalId: "valve_001_globalid_extra", ifcType: "IfcPipeSegment", name: "CW-Valve-001", storeyGlobalId: "0Stor00000000000000001" },
      ],
      connections: [
        { connectionId: connId1, relatingElementGlobalId: pipeGlobalId, relatedElementGlobalId: "8qRsTuVwXyZa2B3C4D5E6F" },
        { connectionId: connId2, relatingElementGlobalId: pipeGlobalId, relatedElementGlobalId: "valve_001_globalid_extra" },
      ],
    } as Record<string, unknown>);
  },
);

Given(
  "the pipe {string} has a connection with connectionId {string} to {string}",
  async function (this: IfcWorld, pipeGlobalId: string, connectionId: string, targetGlobalId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      connections: [
        { connectionId, relatingElementGlobalId: pipeGlobalId, relatedElementGlobalId: targetGlobalId },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Then — Subsequent GET assertions (F-034 specific)
// ───────────────────────────────────────────────

Then(
  /^a subsequent GET to "(.*)" does not include connection "(.*)"$/,
  async function (this: IfcWorld, path: string, connectionId: string) {
    const url = `${BASE_URL}${resolvePath(path, this)}`;
    const response = await apiRequest("GET", url, this.accessToken);
    const body = await response.json();
    const data = body.data as Record<string, unknown>;
    for (const val of Object.values(data ?? {})) {
      if (Array.isArray(val)) {
        const found = val.some((item: Record<string, unknown>) =>
          item.connectionId === connectionId,
        );
        assert.ok(!found, `Expected connection "${connectionId}" to not appear in response`);
      }
    }
  },
);
