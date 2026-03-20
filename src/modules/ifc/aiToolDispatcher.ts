/**
 * Maps OpenAI function-call tool names to authenticated IFC REST API calls.
 * Server-side only — the dispatcher runs inside Next.js API route handlers.
 */

import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { ToolCallResult } from "@/types/aiChat";

export interface DispatchContext {
  projectId: string;
  userToken: string;
  baseUrl: string;
}

type ToolHandler = (
  args: Record<string, unknown>,
  ctx: DispatchContext,
) => Promise<{ result: unknown; error?: string; method: string; path: string; statusCode: number; requestPayload: unknown }>;

function buildResult(
  res: { ok: boolean; status: number; data: unknown; method: string; path: string },
  requestPayload: unknown,
  toolName: string,
): { result: unknown; error?: string; method: string; path: string; statusCode: number; requestPayload: unknown } {
  if (!res.ok) {
    return { result: null, error: `${toolName} failed (${res.status}): ${JSON.stringify(res.data)}`, method: res.method, path: res.path, statusCode: res.status, requestPayload };
  }
  return { result: res.data, method: res.method, path: res.path, statusCode: res.status, requestPayload };
}

async function apiFetch(
  ctx: DispatchContext,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: unknown; method: string; path: string }> {
  const url = `${ctx.baseUrl}/api/v1/ifc/files/${ctx.projectId}${path}`;
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ctx.userToken}`,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, data, method, path };
}

// ─── Tool Handlers ──────────────────────────────────────────────────────────

const listElements: ToolHandler = async (args, ctx) => {
  const params = new URLSearchParams();
  if (args.storeyId) params.set("storeyId", String(args.storeyId));
  if (args.type) params.set("type", String(args.type));
  if (args.name) params.set("name", String(args.name));
  if (args.limit) params.set("limit", String(args.limit));
  const qs = params.toString();
  const res = await apiFetch(ctx, "GET", `/elements${qs ? `?${qs}` : ""}`);
  return buildResult(res, null, "listElements");
};

const createElement: ToolHandler = async (args, ctx) => {
  const body = {
    ifcType: args.ifcType,
    name: args.name,
    description: args.description,
    predefinedType: args.predefinedType,
    storeyGlobalId: args.storeyGlobalId,
    hostGlobalId: args.hostGlobalId,
  };
  const res = await apiFetch(ctx, "POST", "/elements", body);
  return buildResult(res, body, "createElement");
};

const getElement: ToolHandler = async (args, ctx) => {
  const res = await apiFetch(ctx, "GET", `/elements/${args.globalId}`);
  return buildResult(res, null, "getElement");
};

const updateElement: ToolHandler = async (args, ctx) => {
  const { globalId, ...body } = args;
  const res = await apiFetch(ctx, "PATCH", `/elements/${globalId}`, body);
  return buildResult(res, body, "updateElement");
};

const deleteElement: ToolHandler = async (args, ctx) => {
  const res = await apiFetch(ctx, "DELETE", `/elements/${args.globalId}`);
  return buildResult(res, null, "deleteElement");
};

const getSpatialStructure: ToolHandler = async (_args, ctx) => {
  const res = await apiFetch(ctx, "GET", "/spatial-structure");
  return buildResult(res, null, "getSpatialStructure");
};

const createStorey: ToolHandler = async (args, ctx) => {
  const body = { name: args.name, elevation: args.elevation };
  const res = await apiFetch(ctx, "POST", "/storeys", body);
  return buildResult(res, body, "createStorey");
};

const createSpace: ToolHandler = async (args, ctx) => {
  const body = { name: args.name, longName: args.longName };
  const res = await apiFetch(ctx, "POST", `/storeys/${args.storeyId}/spaces`, body);
  return buildResult(res, body, "createSpace");
};

const listMaterials: ToolHandler = async (_args, ctx) => {
  const res = await apiFetch(ctx, "GET", "/materials");
  return buildResult(res, null, "listMaterials");
};

const createMaterial: ToolHandler = async (args, ctx) => {
  const body = { name: args.name, category: args.category };
  const res = await apiFetch(ctx, "POST", "/materials", body);
  return buildResult(res, body, "createMaterial");
};

const createPropertySet: ToolHandler = async (args, ctx) => {
  const body = { name: args.psetName, properties: args.properties };
  const res = await apiFetch(ctx, "POST", `/elements/${args.globalId}/property-sets`, body);
  return buildResult(res, body, "createPropertySet");
};

const setElementPlacement: ToolHandler = async (args, ctx) => {
  const { globalId, x, y, z, rotationZ } = args;
  const rotRad = rotationZ ? (Number(rotationZ) * Math.PI) / 180 : 0;
  const body = {
    location: { x: Number(x ?? 0), y: Number(y ?? 0), z: Number(z ?? 0) },
    axis: { x: 0, y: 0, z: 1 },
    refDirection: { x: Math.cos(rotRad), y: Math.sin(rotRad), z: 0 },
  };
  const res = await apiFetch(ctx, "PATCH", `/elements/${globalId}/placement`, body);
  return buildResult(res, args, "setElementPlacement");
};

const setElementGeometry: ToolHandler = async (args, ctx) => {
  const { globalId, profileType, width, depth, radius, extrusionDepth } = args;
  const profile: Record<string, unknown> =
    profileType === "circle"
      ? { type: "IfcCircleProfileDef", radius: Number(radius ?? 0.1) }
      : {
          type: "IfcRectangleProfileDef",
          xDim: Number(width ?? 1),
          yDim: Number(depth ?? 0.2),
        };
  const body = {
    representations: [
      {
        representationType: "SweptSolid",
        items: [
          {
            type: "IfcExtrudedAreaSolid",
            profile,
            position: { location: { x: 0, y: 0, z: 0 } },
            direction: { x: 0, y: 0, z: 1 },
            depth: Number(extrusionDepth ?? 1),
          },
        ],
      },
    ],
  };
  const res = await apiFetch(ctx, "PATCH", `/elements/${globalId}/geometry`, body);
  return buildResult(res, body, "setElementGeometry");
};

const assignMaterialToElement: ToolHandler = async (args, ctx) => {
  const body = { materialId: args.materialId };
  const res = await apiFetch(ctx, "PUT", `/elements/${args.globalId}/material`, body);
  return buildResult(res, body, "assignMaterialToElement");
};

// ─── Handler Registry ───────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  listElements,
  createElement,
  getElement,
  updateElement,
  deleteElement,
  getSpatialStructure,
  createStorey,
  createSpace,
  listMaterials,
  createMaterial,
  createPropertySet,
  setElementPlacement,
  setElementGeometry,
  assignMaterialToElement,
};

// ─── OpenAI Tool Definitions ────────────────────────────────────────────────

export const toolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "listElements",
      description: "List/filter IFC elements in the current project. Returns an array of elements with their globalId, ifcType, name, and storey.",
      parameters: {
        type: "object",
        properties: {
          storeyId: { type: "string", description: "Filter by storey globalId" },
          type: { type: "string", description: "Filter by IFC type, e.g. IfcWall, IfcDoor, IfcWindow" },
          name: { type: "string", description: "Filter by element name (substring match)" },
          limit: { type: "number", description: "Max results to return (default: all)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createElement",
      description: "Create a new IFC building element (wall, slab, door, window, beam, column, etc.). Returns the created element with its globalId and the new model version. NOTE: after calling this you MUST call setElementPlacement and setElementGeometry with the returned globalId — without both the element will be invisible in the 3D viewer.",
      parameters: {
        type: "object",
        properties: {
          ifcType: { type: "string", description: "IFC type class, e.g. IfcWall, IfcSlab, IfcDoor, IfcWindow, IfcBeam, IfcColumn, IfcRoof, IfcStair" },
          name: { type: "string", description: "Human-readable name for the element" },
          description: { type: "string", description: "Optional description" },
          predefinedType: { type: "string", description: "IFC predefined type, e.g. STANDARD, NOTDEFINED" },
          storeyGlobalId: { type: "string", description: "GlobalId of the storey to place the element in" },
          hostGlobalId: { type: "string", description: "GlobalId of a host element (e.g. wall for a door opening)" },
        },
        required: ["ifcType", "name", "storeyGlobalId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getElement",
      description: "Get full details of a single IFC element by its globalId.",
      parameters: {
        type: "object",
        properties: {
          globalId: { type: "string", description: "The IFC globalId of the element" },
        },
        required: ["globalId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateElement",
      description: "Update properties of an existing IFC element (name, description).",
      parameters: {
        type: "object",
        properties: {
          globalId: { type: "string", description: "The IFC globalId of the element to update" },
          name: { type: "string", description: "New name" },
          description: { type: "string", description: "New description" },
        },
        required: ["globalId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteElement",
      description: "Delete an IFC element by its globalId. Returns the new model version.",
      parameters: {
        type: "object",
        properties: {
          globalId: { type: "string", description: "The IFC globalId of the element to delete" },
        },
        required: ["globalId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getSpatialStructure",
      description: "Get the full spatial structure of the IFC model: sites, buildings, storeys, and spaces. Use this to discover storey IDs before creating elements.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "createStorey",
      description: "Create a new building storey. Returns the storey with its globalId and the new model version.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the storey, e.g. 'Ground Floor'" },
          elevation: { type: "number", description: "Elevation in metres above datum" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createSpace",
      description: "Create a new space (room) within a storey.",
      parameters: {
        type: "object",
        properties: {
          storeyId: { type: "string", description: "GlobalId of the parent storey" },
          name: { type: "string", description: "Short name for the space" },
          longName: { type: "string", description: "Full descriptive name" },
        },
        required: ["storeyId", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listMaterials",
      description: "List all materials defined in the current IFC model.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "createMaterial",
      description: "Create a new material in the IFC model.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Material name, e.g. 'Concrete C30/37'" },
          category: { type: "string", description: "Material category, e.g. 'concrete', 'steel', 'timber'" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createPropertySet",
      description: "Create a new property set on an element with one or more properties.",
      parameters: {
        type: "object",
        properties: {
          globalId: { type: "string", description: "GlobalId of the element to attach the property set to" },
          psetName: { type: "string", description: "Name of the property set, e.g. 'Pset_WallCommon'" },
          properties: {
            type: "array",
            description: "Array of properties to add",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Property name" },
                type: { type: "string", description: "Property type: IfcText, IfcBoolean, IfcReal, IfcInteger, IfcLabel" },
                value: { description: "Property value" },
              },
              required: ["name", "type", "value"],
            },
          },
        },
        required: ["globalId", "psetName", "properties"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "setElementPlacement",
      description: "Set or update the local placement (position and rotation) of an element.",
      parameters: {
        type: "object",
        properties: {
          globalId: { type: "string", description: "GlobalId of the element" },
          x: { type: "number", description: "X coordinate in metres" },
          y: { type: "number", description: "Y coordinate in metres" },
          z: { type: "number", description: "Z coordinate in metres" },
          rotationZ: { type: "number", description: "Rotation around Z axis in degrees" },
        },
        required: ["globalId", "x", "y", "z"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "setElementGeometry",
      description: "Set the extruded geometry of an element (profile and extrusion depth).",
      parameters: {
        type: "object",
        properties: {
          globalId: { type: "string", description: "GlobalId of the element" },
          profileType: { type: "string", description: "Profile type: rectangle, circle, or arbitrary" },
          width: { type: "number", description: "Width of rectangular profile in metres" },
          depth: { type: "number", description: "Depth of rectangular profile in metres" },
          radius: { type: "number", description: "Radius for circular profile in metres" },
          extrusionDepth: { type: "number", description: "Height/depth of extrusion in metres" },
        },
        required: ["globalId", "extrusionDepth"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assignMaterialToElement",
      description: "Assign an existing material to an element.",
      parameters: {
        type: "object",
        properties: {
          globalId: { type: "string", description: "GlobalId of the element" },
          materialId: { type: "string", description: "ID of the material to assign" },
        },
        required: ["globalId", "materialId"],
      },
    },
  },
];

// ─── Dispatch ───────────────────────────────────────────────────────────────

export async function dispatch(
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>,
  ctx: DispatchContext,
): Promise<ToolCallResult> {
  const handler = handlers[toolName];
  if (!handler) {
    return { toolCallId, result: null, error: `Unknown tool: ${toolName}` };
  }
  const start = Date.now();
  const { result, error, method, path, statusCode, requestPayload } = await handler(args, ctx);
  const durationMs = Date.now() - start;
  return { toolCallId, result, error, method, path, statusCode, requestPayload, durationMs };
}
