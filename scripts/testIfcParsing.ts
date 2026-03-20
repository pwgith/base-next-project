/**
 * Quick script to try loading a generated IFC file with web-ifc
 * and capture the exact parsing / model error.
 */
import * as WebIFC from "web-ifc";
import { readFileSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";
import { setupUserAndGetToken, seedModelData, createTestProject, deleteAllProjects, teardownUsers } from "../test/step-definitions/ifcTestHelpers";

dotenv.config({ path: ".env.local" });

const wasmPath = "";

async function tryLoad(label: string, ifcData: Uint8Array) {
  const api = new WebIFC.IfcAPI();
  await api.Init();
  try {
    const modelId = api.OpenModel(ifcData);
    const lines = api.GetAllLines(modelId);
    console.log(`✓ ${label}: loaded OK — ${lines.size()} lines`);
    api.CloseModel(modelId);
  } catch (err) {
    console.error(`✗ ${label}: FAILED —`, (err as Error).message?.slice(0, 200) ?? err);
  }
}

async function main() {
  // --- Test 1: Load the existing house file if it exists ---
  try {
    const houseData = readFileSync("output/debug-house.ifc");
    await tryLoad("House (debug-house.ifc)", new Uint8Array(houseData));
  } catch {
    console.log("No output/debug-house.ifc found, skipping");
  }

  // --- Test 2: Seed a minimal model with just a door, fetch its IFC, and try parsing ---
  const email = "ifc-parse-test@example.com";
  let token: string;
  try {
    token = await setupUserAndGetToken(email);
  } catch (err) {
    console.error("Could not set up test user:", err);
    process.exit(1);
  }

  const tests: { name: string; elements: Record<string, unknown>[] }[] = [
    {
      name: "just-wall",
      elements: [
        { ifcType: "IfcWall", globalId: "0TestParseWall00000001", name: "Wall", storeyGlobalId: "0StorParse0000000000001" },
      ],
    },
    {
      name: "just-door",
      elements: [
        { ifcType: "IfcDoor", globalId: "0TestParseDoor00000001", name: "Door", storeyGlobalId: "0StorParse0000000000001" },
      ],
    },
    {
      name: "just-window",
      elements: [
        { ifcType: "IfcWindow", globalId: "0TestParseWnd000000001", name: "Window", storeyGlobalId: "0StorParse0000000000001" },
      ],
    },
    {
      name: "just-roof",
      elements: [
        { ifcType: "IfcRoof", globalId: "0TestParseRoof00000001", name: "Roof", storeyGlobalId: "0StorParse0000000000001" },
      ],
    },
    {
      name: "wall+door",
      elements: [
        { ifcType: "IfcWall", globalId: "0TestParseWall00000002", name: "Wall", storeyGlobalId: "0StorParse0000000000001" },
        { ifcType: "IfcDoor", globalId: "0TestParseDoor00000002", name: "Door", storeyGlobalId: "0StorParse0000000000001" },
      ],
    },
  ];

  for (const test of tests) {
    const projectId = await createTestProject(token, `parse-test-${test.name}`);
    await seedModelData(projectId, {
      project: { ifcType: "IfcProject", globalId: "projParseTest00000001", name: test.name },
      sites: [{ ifcType: "IfcSite", globalId: "0SiteParse0000000000001", name: "Site", buildings: ["0BldgParse0000000000001"] }],
      buildings: [{ ifcType: "IfcBuilding", globalId: "0BldgParse0000000000001", name: "Building", storeys: ["0StorParse0000000000001"] }],
      storeys: [{ ifcType: "IfcBuildingStorey", globalId: "0StorParse0000000000001", name: "GF", elevation: 0, spaces: [], elements: test.elements.map((e: Record<string, unknown>) => e.globalId as string) }],
      elements: test.elements,
      geometries: Object.fromEntries(test.elements.map((e: Record<string, unknown>) => [
        e.globalId,
        { representations: [{ representationType: "SweptSolid", items: [{ type: "IfcExtrudedAreaSolid", depth: 2000, direction: { x: 0, y: 0, z: 1 }, profile: { type: "IfcRectangleProfileDef", xDim: 3000, yDim: 200 } }] }] },
      ])),
      placements: Object.fromEntries(test.elements.map((e: Record<string, unknown>) => [
        e.globalId,
        { location: { x: 0, y: 0, z: 0 }, axis: { x: 0, y: 0, z: 1 }, refDirection: { x: 1, y: 0, z: 0 } },
      ])),
    });

    // Fetch the generated IFC via the UI endpoint
    const res = await fetch(`http://localhost:3000/api/projects/${projectId}/ifc`, {
      headers: { Cookie: `sb_session=${token}` },
    });
    if (!res.ok) {
      console.error(`✗ ${test.name}: fetch returned ${res.status}`);
      continue;
    }
    const text = await res.text();
    // Save for inspection
    const filename = `output/parse-test-${test.name}.ifc`;
    require("fs").writeFileSync(filename, text);
    await tryLoad(test.name, new TextEncoder().encode(text));
  }

  // Cleanup
  await deleteAllProjects(token);
  await teardownUsers([email]);
  process.exit(0);
}

main();
