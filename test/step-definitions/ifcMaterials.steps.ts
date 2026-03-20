import { Given, Then, Before, After } from "@cucumber/cucumber";
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

Before({ tags: "@F-020" }, async function (this: IfcWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map();
  this.fileIdMap = this.fileIdMap ?? new Map();
  (this as Record<string, unknown>).projectIdMap =
    (this as Record<string, unknown>).projectIdMap ?? new Map();
});

After({ tags: "@F-020" }, async function (this: IfcWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ───────────────────────────────────────────────
// Given — Materials setup
// ───────────────────────────────────────────────

// S-142: seed three named materials
Given(
  "the IFC file contains materials {string}, {string}, and {string}",
  async function (this: IfcWorld, mat1: string, mat2: string, mat3: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      materials: [
        { materialId: "mat-s142-001", name: mat1 },
        { materialId: "mat-s142-002", name: mat2 },
        { materialId: "mat-s142-003", name: mat3 },
      ],
    } as Record<string, unknown>);
  },
);

// S-144: seed a material with specific materialId
Given(
  "the material {string} exists with materialId {string}",
  async function (this: IfcWorld, name: string, materialId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      materials: [{ materialId, name }],
    } as Record<string, unknown>);
  },
);

// S-145: assign a material layer set to the wall
Given(
  "the wall {string} is assigned a material layer set",
  async function (this: IfcWorld, wallGlobalId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      materialAssignments: [
        {
          assignmentType: "IfcMaterialLayerSetUsage",
          layers: [
            { materialName: "Brick - Engineering", thickness: 0.1025 },
            { materialName: "Mineral Wool Insulation", thickness: 0.075 },
          ],
          elementGlobalId: wallGlobalId,
        },
      ],
    } as Record<string, unknown>);
  },
);

// S-147: material layer set with a specific named layer at a specific thickness
Given(
  /^the wall "(.*)" has a material layer set with a layer "(.*)" at thickness ([\d.]+)$/,
  async function (this: IfcWorld, wallGlobalId: string, layerName: string, thickness: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      materialAssignments: [
        {
          assignmentType: "IfcMaterialLayerSetUsage",
          layers: [
            { materialName: "Brick - Engineering", thickness: 0.1025 },
            { materialName: layerName, thickness: parseFloat(thickness) },
            { materialName: "Concrete Block - Dense", thickness: 0.1 },
          ],
          elementGlobalId: wallGlobalId,
        },
      ],
    } as Record<string, unknown>);
  },
);

// S-148: assign a simple material to the wall
Given(
  "the wall {string} has a material assignment",
  async function (this: IfcWorld, wallGlobalId: string) {
    const fileId = this.lastFileId!;
    await seedModelData(fileId, {
      materials: [{ materialId: "mat-temp", name: "Temp Material" }],
      materialAssignments: [
        {
          assignmentType: "IfcMaterial",
          materialId: "mat-temp",
          name: "Temp Material",
          elementGlobalId: wallGlobalId,
        },
      ],
    } as Record<string, unknown>);
  },
);

// ───────────────────────────────────────────────
// Then — Assertions
// ───────────────────────────────────────────────

// Check a named field exists — "an" variant (F-028 has the "a" variant)
Then(
  "the response body contains an {string} field",
  async function (this: IfcWorld, fieldName: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    assert.ok(fieldName in data, `Expected field "${fieldName}" in response data. Got: ${JSON.stringify(Object.keys(data))}`);
  },
);

// S-145: conditional field check based on assignment type
Then(
  /^the response body contains a "layers" or "material" field depending on the assignment type$/,
  async function (this: IfcWorld) {
    const data = this.lastBody.data as Record<string, unknown>;
    assert.ok(data, "Expected data in response body");
    const type = data.assignmentType as string;
    if (type === "IfcMaterialLayerSetUsage") {
      assert.ok(Array.isArray(data.layers), `Expected layers array for ${type}`);
    } else {
      assert.ok(
        "materialId" in data || "name" in data,
        `Expected materialId or name field for ${type}`,
      );
    }
  },
);

// S-146: check first layer entry by name and thickness
Then(
  /^the first layer has "(.*)":\s*"(.*)" and "(.*)":\s*([\d.]+)$/,
  async function (this: IfcWorld, field1: string, value1: string, field2: string, value2: string) {
    const data = this.lastBody.data as Record<string, unknown>;
    const layers = data?.layers as Record<string, unknown>[];
    assert.ok(Array.isArray(layers) && layers.length > 0, "Expected non-empty layers array");
    const first = layers[0];
    assert.strictEqual(String(first[field1]), value1, `Expected first layer ${field1} = "${value1}"`);
    assert.strictEqual(Number(first[field2]), parseFloat(value2), `Expected first layer ${field2} = ${value2}`);
  },
);
