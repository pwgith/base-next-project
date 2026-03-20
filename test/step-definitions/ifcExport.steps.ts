import { Given, Then, Before, After, AfterStep } from "@cucumber/cucumber";
import assert from "assert";
import {
  IfcWorld,
  teardownUsers,
  deleteAllProjects,
  seedModelData,
} from "./ifcTestHelpers";

// ───────────────────────────────────────────────
// Lifecycle
// ───────────────────────────────────────────────

Before({ tags: "@F-025" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-025" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// S-180 needs elements with specific globalIds but has no Given step.
// Seed them after the Background step creates the file.
AfterStep({ tags: "@S-180" }, async function (this: IfcWorld, { pickleStep }) {
  if (pickleStep.text.includes("the user has an IFC file with ID")) {
    const projectId = this.fileIdMap?.get("file-001");
    if (projectId) {
      await seedModelData(projectId, {
        sites: [{ ifcType: "IfcSite", globalId: "0SiteFx0000000000000001", name: "Site", buildings: ["0BldFx00000000000000001"] }],
        buildings: [{ ifcType: "IfcBuilding", globalId: "0BldFx00000000000000001", name: "Building", storeys: ["0StorFx0000000000000001"] }],
        storeys: [{ ifcType: "IfcBuildingStorey", globalId: "0StorFx0000000000000001", name: "Ground Floor", elevation: 0, spaces: [], elements: ["0VkXyZ2aB3c4D5e6F7gH8i", "1aB2cD3eF4gH5iJ6kL7mN8", "2YByTx5Kv4wO3rJpL8uN1z"] }],
        elements: [
          { ifcType: "IfcWall", globalId: "0VkXyZ2aB3c4D5e6F7gH8i", name: "Wall A", storeyGlobalId: "0StorFx0000000000000001", description: "" },
          { ifcType: "IfcDoor", globalId: "1aB2cD3eF4gH5iJ6kL7mN8", name: "Door B", storeyGlobalId: "0StorFx0000000000000001", description: "" },
          { ifcType: "IfcSlab", globalId: "2YByTx5Kv4wO3rJpL8uN1z", name: "Slab C", storeyGlobalId: "0StorFx0000000000000001", description: "" },
        ],
      });
    }
  }
});

// ───────────────────────────────────────────────
// Then — S-177: IFC-JSON export assertions
// ───────────────────────────────────────────────

Then(
  "the response body contains a {string} field with value {string}",
  async function (this: IfcWorld, fieldName: string, expectedValue: string) {
    // Export responses are raw JSON (not wrapped in { data })
    const body = this.lastBody as Record<string, unknown>;
    // Check both top-level and inside data envelope
    const topLevel = body[fieldName];
    const nested = (body.data as Record<string, unknown> | undefined)?.[fieldName];
    const actual = topLevel ?? nested;
    assert.strictEqual(
      String(actual),
      expectedValue,
      `Expected ${fieldName} = "${expectedValue}" but got "${actual}"`,
    );
  },
);

Then(
  "the response body contains a {string} array of IFC entities",
  async function (this: IfcWorld, fieldName: string) {
    const body = this.lastBody as Record<string, unknown>;
    const arr = body[fieldName];
    assert.ok(Array.isArray(arr), `Expected "${fieldName}" to be an array in response body`);
  },
);

// ───────────────────────────────────────────────
// Then — S-178: ifcXML export assertions
// ───────────────────────────────────────────────

Then(
  /^the response body begins with an XML declaration and a root element "([^"]+)"$/,
  async function (this: IfcWorld, rootElement: string) {
    const body = await this.lastResponse.clone().text();
    assert.ok(
      body.startsWith("<?xml"),
      `Expected body to start with XML declaration but got: ${body.substring(0, 50)}`,
    );
    assert.ok(
      body.includes(`<${rootElement}`),
      `Expected root element <${rootElement}> in XML body`,
    );
  },
);

// ───────────────────────────────────────────────
// Then — S-179: COBie ZIP assertions
// ───────────────────────────────────────────────

Then(
  /^the ZIP archive contains CSV files including "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)"$/,
  async function (this: IfcWorld, f1: string, f2: string, f3: string, f4: string, f5: string) {
    const buffer = Buffer.from(await this.lastResponse.clone().arrayBuffer());
    const bodyStr = buffer.toString("binary");
    for (const filename of [f1, f2, f3, f4, f5]) {
      assert.ok(
        bodyStr.includes(filename),
        `Expected ZIP to contain "${filename}" but it was not found`,
      );
    }
  },
);

// ───────────────────────────────────────────────
// Then — S-180: Partial export assertions
// ───────────────────────────────────────────────

Then(
  /^the exported IFC file contains exactly the (\d+) specified elements plus any required referencing entities$/,
  async function (this: IfcWorld, count: string) {
    const body = await this.lastResponse.clone().text();
    // Count data lines in STEP format (lines starting with #N= )
    const dataLines = body.split("\n").filter((line) => /^#\d+= /.test(line));
    assert.ok(
      dataLines.length >= Number(count),
      `Expected at least ${count} element lines in IFC STEP output, got ${dataLines.length}`,
    );
  },
);
