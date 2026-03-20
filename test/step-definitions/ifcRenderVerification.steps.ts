/**
 * Step definitions for F-039 — IFC Render Verification.
 *
 * Seeds complex models (with geometry) and verifies they render without
 * errors in the 3D viewer. Reuses navigation and assertion steps from
 * ifcViewer.steps.ts (F-029).
 */

import { Given, Then, Before, After } from "@cucumber/cucumber";
import { Application } from "../support/application";
import assert from "assert";
import {
  setupUserAndGetToken,
  teardownUsers,
  deleteAllProjects,
  createTestProject,
  seedModelData,
} from "./ifcTestHelpers";

// ─── Per-feature state ───────────────────────────────────────────────────────

interface RenderWorld {
  app: Application;
  createdEmails: string[];
  tokensByEmail: Map<string, string>;
  projectIdMap: Map<string, string>;
  accessToken: string;
}

const TEST_EMAIL = "alice@example.com";

// ─── Lifecycle ───────────────────────────────────────────────────────────────

Before({ tags: "@F-039" }, async function (this: RenderWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map<string, string>();
  this.projectIdMap = this.projectIdMap ?? new Map<string, string>();
});

After({ tags: "@F-039" }, async function (this: RenderWorld) {
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function ensureToken(world: RenderWorld): Promise<string> {
  if (!world.tokensByEmail.has(TEST_EMAIL)) {
    const token = await setupUserAndGetToken(TEST_EMAIL);
    world.createdEmails.push(TEST_EMAIL);
    world.tokensByEmail.set(TEST_EMAIL, token);
  }
  world.accessToken = world.tokensByEmail.get(TEST_EMAIL)!;
  return world.accessToken;
}

// ─── S-270: Complete house model ─────────────────────────────────────────────

Given(
  "the user has a project named {string} with a complete house model",
  async function (this: RenderWorld, projectName: string) {
    const token = await ensureToken(this);
    const projectId = await createTestProject(token, projectName);
    this.projectIdMap.set(projectName, projectId);

    await seedModelData(projectId, {
      project: {
        ifcType: "IfcProject",
        globalId: "proj-render-001",
        name: projectName,
      },
      sites: [
        {
          ifcType: "IfcSite",
          globalId: "0SiteRender000000000001",
          name: "Default Site",
          buildings: ["0BldgRender000000000001"],
        },
      ],
      buildings: [
        {
          ifcType: "IfcBuilding",
          globalId: "0BldgRender000000000001",
          name: "Test House",
          storeys: ["0StorRender000000000001"],
        },
      ],
      storeys: [
        {
          ifcType: "IfcBuildingStorey",
          globalId: "0StorRender000000000001",
          name: "Ground Floor",
          elevation: 0,
          spaces: [],
          elements: [
            "0WallRenderN00000000001",
            "0WallRenderS00000000001",
            "0WallRenderE00000000001",
            "0WallRenderW00000000001",
            "0DoorRender000000000001",
            "0WindRender000000000001",
            "0SlabRender000000000001",
            "0RoofRender000000000001",
          ],
        },
      ],
      elements: [
        // Four walls
        {
          ifcType: "IfcWall",
          globalId: "0WallRenderN00000000001",
          name: "North Wall",
          storeyGlobalId: "0StorRender000000000001",
        },
        {
          ifcType: "IfcWall",
          globalId: "0WallRenderS00000000001",
          name: "South Wall",
          storeyGlobalId: "0StorRender000000000001",
        },
        {
          ifcType: "IfcWall",
          globalId: "0WallRenderE00000000001",
          name: "East Wall",
          storeyGlobalId: "0StorRender000000000001",
        },
        {
          ifcType: "IfcWall",
          globalId: "0WallRenderW00000000001",
          name: "West Wall",
          storeyGlobalId: "0StorRender000000000001",
        },
        // Door
        {
          ifcType: "IfcDoor",
          globalId: "0DoorRender000000000001",
          name: "Front Door",
          storeyGlobalId: "0StorRender000000000001",
        },
        // Window
        {
          ifcType: "IfcWindow",
          globalId: "0WindRender000000000001",
          name: "Living Room Window",
          storeyGlobalId: "0StorRender000000000001",
        },
        // Floor slab
        {
          ifcType: "IfcSlab",
          globalId: "0SlabRender000000000001",
          name: "Ground Floor Slab",
          storeyGlobalId: "0StorRender000000000001",
          predefinedType: "FLOOR",
        },
        // Roof
        {
          ifcType: "IfcRoof",
          globalId: "0RoofRender000000000001",
          name: "Main Roof",
          storeyGlobalId: "0StorRender000000000001",
        },
      ],
      // Geometry: SweptSolid representations for each element
      geometries: {
        "0WallRenderN00000000001": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 2800,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: {
                    type: "IfcRectangleProfileDef",
                    xDim: 8000,
                    yDim: 200,
                  },
                },
              ],
            },
          ],
        },
        "0WallRenderS00000000001": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 2800,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: {
                    type: "IfcRectangleProfileDef",
                    xDim: 8000,
                    yDim: 200,
                  },
                },
              ],
            },
          ],
        },
        "0WallRenderE00000000001": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 2800,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: {
                    type: "IfcRectangleProfileDef",
                    xDim: 6000,
                    yDim: 200,
                  },
                },
              ],
            },
          ],
        },
        "0WallRenderW00000000001": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 2800,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: {
                    type: "IfcRectangleProfileDef",
                    xDim: 6000,
                    yDim: 200,
                  },
                },
              ],
            },
          ],
        },
        "0DoorRender000000000001": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 2100,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: {
                    type: "IfcRectangleProfileDef",
                    xDim: 900,
                    yDim: 50,
                  },
                },
              ],
            },
          ],
        },
        "0WindRender000000000001": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 1200,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: {
                    type: "IfcRectangleProfileDef",
                    xDim: 1500,
                    yDim: 50,
                  },
                },
              ],
            },
          ],
        },
        "0SlabRender000000000001": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 200,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: {
                    type: "IfcRectangleProfileDef",
                    xDim: 8000,
                    yDim: 6000,
                  },
                },
              ],
            },
          ],
        },
        "0RoofRender000000000001": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 150,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: {
                    type: "IfcRectangleProfileDef",
                    xDim: 8400,
                    yDim: 6400,
                  },
                },
              ],
            },
          ],
        },
      },
      // Placements: position each element in world coordinates
      placements: {
        "0WallRenderN00000000001": {
          location: { x: 0, y: 6000, z: 0 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
        "0WallRenderS00000000001": {
          location: { x: 0, y: 0, z: 0 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
        "0WallRenderE00000000001": {
          location: { x: 8000, y: 0, z: 0 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 0, y: 1, z: 0 },
        },
        "0WallRenderW00000000001": {
          location: { x: 0, y: 0, z: 0 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 0, y: 1, z: 0 },
        },
        "0DoorRender000000000001": {
          location: { x: 3550, y: 0, z: 0 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
        "0WindRender000000000001": {
          location: { x: 3250, y: 6000, z: 900 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
        "0SlabRender000000000001": {
          location: { x: 0, y: 0, z: -200 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
        "0RoofRender000000000001": {
          location: { x: -200, y: -200, z: 2800 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
      },
    });
  },
);

// ─── S-271: Multi-storey building ────────────────────────────────────────────

Given(
  "the user has a project named {string} with multiple storeys and varied elements",
  async function (this: RenderWorld, projectName: string) {
    const token = await ensureToken(this);
    const projectId = await createTestProject(token, projectName);
    this.projectIdMap.set(projectName, projectId);

    await seedModelData(projectId, {
      project: {
        ifcType: "IfcProject",
        globalId: "proj-render-002",
        name: projectName,
      },
      sites: [
        {
          ifcType: "IfcSite",
          globalId: "0SiteRender200000000001",
          name: "Default Site",
          buildings: ["0BldgRender200000000001"],
        },
      ],
      buildings: [
        {
          ifcType: "IfcBuilding",
          globalId: "0BldgRender200000000001",
          name: "Office Block",
          storeys: [
            "0StorRender200000000001",
            "0StorRender200000000002",
          ],
        },
      ],
      storeys: [
        {
          ifcType: "IfcBuildingStorey",
          globalId: "0StorRender200000000001",
          name: "Ground Floor",
          elevation: 0,
          spaces: [],
          elements: [
            "0WallRender200000000001",
            "0WallRender200000000002",
            "0SlabRender200000000001",
            "0ColnRender200000000001",
            "0StrsRender200000000001",
          ],
        },
        {
          ifcType: "IfcBuildingStorey",
          globalId: "0StorRender200000000002",
          name: "First Floor",
          elevation: 3200,
          spaces: [],
          elements: [
            "0WallRender200000000003",
            "0WallRender200000000004",
            "0SlabRender200000000002",
            "0BeamRender200000000001",
          ],
        },
      ],
      elements: [
        // Ground floor
        {
          ifcType: "IfcWall",
          globalId: "0WallRender200000000001",
          name: "GF Wall North",
          storeyGlobalId: "0StorRender200000000001",
        },
        {
          ifcType: "IfcWall",
          globalId: "0WallRender200000000002",
          name: "GF Wall South",
          storeyGlobalId: "0StorRender200000000001",
        },
        {
          ifcType: "IfcSlab",
          globalId: "0SlabRender200000000001",
          name: "GF Floor Slab",
          storeyGlobalId: "0StorRender200000000001",
          predefinedType: "FLOOR",
        },
        {
          ifcType: "IfcColumn",
          globalId: "0ColnRender200000000001",
          name: "GF Column A",
          storeyGlobalId: "0StorRender200000000001",
        },
        {
          ifcType: "IfcStairFlight",
          globalId: "0StrsRender200000000001",
          name: "Main Staircase",
          storeyGlobalId: "0StorRender200000000001",
        },
        // First floor
        {
          ifcType: "IfcWall",
          globalId: "0WallRender200000000003",
          name: "FF Wall North",
          storeyGlobalId: "0StorRender200000000002",
        },
        {
          ifcType: "IfcWall",
          globalId: "0WallRender200000000004",
          name: "FF Wall South",
          storeyGlobalId: "0StorRender200000000002",
        },
        {
          ifcType: "IfcSlab",
          globalId: "0SlabRender200000000002",
          name: "FF Floor Slab",
          storeyGlobalId: "0StorRender200000000002",
          predefinedType: "FLOOR",
        },
        {
          ifcType: "IfcBeam",
          globalId: "0BeamRender200000000001",
          name: "FF Main Beam",
          storeyGlobalId: "0StorRender200000000002",
        },
      ],
      geometries: {
        "0WallRender200000000001": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 3000,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: { type: "IfcRectangleProfileDef", xDim: 12000, yDim: 200 },
                },
              ],
            },
          ],
        },
        "0WallRender200000000002": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 3000,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: { type: "IfcRectangleProfileDef", xDim: 12000, yDim: 200 },
                },
              ],
            },
          ],
        },
        "0SlabRender200000000001": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 250,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: { type: "IfcRectangleProfileDef", xDim: 12000, yDim: 8000 },
                },
              ],
            },
          ],
        },
        "0ColnRender200000000001": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 3000,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: { type: "IfcRectangleProfileDef", xDim: 400, yDim: 400 },
                },
              ],
            },
          ],
        },
        "0StrsRender200000000001": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 3200,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: { type: "IfcRectangleProfileDef", xDim: 1200, yDim: 3000 },
                },
              ],
            },
          ],
        },
        "0WallRender200000000003": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 3000,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: { type: "IfcRectangleProfileDef", xDim: 12000, yDim: 200 },
                },
              ],
            },
          ],
        },
        "0WallRender200000000004": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 3000,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: { type: "IfcRectangleProfileDef", xDim: 12000, yDim: 200 },
                },
              ],
            },
          ],
        },
        "0SlabRender200000000002": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 250,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: { type: "IfcRectangleProfileDef", xDim: 12000, yDim: 8000 },
                },
              ],
            },
          ],
        },
        "0BeamRender200000000001": {
          representations: [
            {
              representationType: "SweptSolid",
              items: [
                {
                  type: "IfcExtrudedAreaSolid",
                  depth: 12000,
                  direction: { x: 0, y: 0, z: 1 },
                  profile: { type: "IfcRectangleProfileDef", xDim: 300, yDim: 500 },
                },
              ],
            },
          ],
        },
      },
      placements: {
        "0WallRender200000000001": {
          location: { x: 0, y: 8000, z: 0 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
        "0WallRender200000000002": {
          location: { x: 0, y: 0, z: 0 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
        "0SlabRender200000000001": {
          location: { x: 0, y: 0, z: -250 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
        "0ColnRender200000000001": {
          location: { x: 6000, y: 4000, z: 0 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
        "0StrsRender200000000001": {
          location: { x: 10000, y: 2000, z: 0 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
        "0WallRender200000000003": {
          location: { x: 0, y: 8000, z: 3200 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
        "0WallRender200000000004": {
          location: { x: 0, y: 0, z: 3200 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
        "0SlabRender200000000002": {
          location: { x: 0, y: 0, z: 3000 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
        "0BeamRender200000000001": {
          location: { x: 0, y: 4000, z: 2700 },
          axis: { x: 0, y: 0, z: 1 },
          refDirection: { x: 1, y: 0, z: 0 },
        },
      },
    });
  },
);

// ─── Shared assertions ───────────────────────────────────────────────────────

Then(
  "no error overlay is visible in the viewer",
  async function (this: RenderWorld) {
    const app: Application = this.app;
    const fetchError = await app.isFetchErrorVisible();
    const convertError = await app.isConversionErrorVisible();
    assert.ok(!fetchError, "Unexpected fetch-error overlay visible");
    assert.ok(!convertError, "Unexpected conversion-error overlay visible");
  },
);
