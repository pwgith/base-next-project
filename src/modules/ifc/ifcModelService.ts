/**
 * IFC model service.
 * Provides business-level operations on the IFC-JSON model stored in ifc_version.data.
 * Each mutating operation creates a new immutable version snapshot.
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError, DomainError } from "@/lib/errors";
import {
  generateGlobalId,
  MEP_TYPES,
  type IfcModelEntities,
  type IfcElementEntity,
  type IfcBuildingStoreyEntity,
  type IfcSpaceEntity,
  type IfcPropertySet,
  type IfcProperty,
  type IfcQuantitySet,
  type IfcMaterial,
  type IfcMaterialAssignment,
  type IfcMaterialLayer,
  type IfcPlacement,
  type IfcPoint3D,
  type IfcGeometryRepresentation,
  type IfcCoordinateReferenceSystem,
  type IfcClassificationSystem,
  type IfcClassificationReference,
  type IfcTypeDefinition,
  type IfcGroup,
  type IfcSystem,
  type IfcProjectEntity,
  type IfcOpeningElement,
  type IfcDistributionPort,
  type IfcPortConnection,
  type IfcUnitAssignment,
} from "./ifcModelTypes";
import type { Prisma } from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyModel(): IfcModelEntities {
  return {
    sites: [],
    buildings: [],
    storeys: [],
    spaces: [],
    elements: [],
    propertySets: [],
    quantitySets: [],
    materials: [],
    materialAssignments: [],
    placements: {},
    geometries: {},
    classifications: [],
    classificationReferences: [],
    typeDefinitions: [],
    typeAssignments: [],
    groups: [],
    systems: [],
    openings: [],
    ports: [],
    connections: [],
  };
}

/** Return the number of IFC elements in the latest version of a project. */
export async function getElementCount(projectId: string): Promise<number> {
  const { model } = await loadModel(projectId);
  return model.elements.length;
}

/** Load the latest version's model data for a project. */
async function loadModel(projectId: string): Promise<{ model: IfcModelEntities; versionNumber: number }> {
  const latest = await prisma.ifcVersion.findFirst({
    where: { projectId },
    orderBy: { versionNumber: "desc" },
  });
  if (!latest) {
    return { model: emptyModel(), versionNumber: 0 };
  }
  const raw = latest.data as Record<string, unknown>;
  const model: IfcModelEntities = {
    ...emptyModel(),
    ...(raw.model as IfcModelEntities ?? {}),
  };
  return { model, versionNumber: latest.versionNumber };
}

/** Load model data at a specific version. */
async function loadModelAtVersion(projectId: string, version: number): Promise<{ model: IfcModelEntities; versionNumber: number }> {
  const record = await prisma.ifcVersion.findUnique({
    where: { projectId_versionNumber: { projectId, versionNumber: version } },
  });
  if (!record) {
    throw new NotFoundError(`Version ${version} not found for file ${projectId}`);
  }
  const raw = record.data as Record<string, unknown>;
  const model: IfcModelEntities = {
    ...emptyModel(),
    ...(raw.model as IfcModelEntities ?? {}),
  };
  return { model, versionNumber: record.versionNumber };
}

/** Save a new version with the updated model. */
async function saveModel(
  projectId: string,
  currentVersion: number,
  model: IfcModelEntities,
  changeDescription: string,
  createdBy?: string,
): Promise<number> {
  // Optimistic concurrency: retry on unique constraint violation
  // when parallel mutations race for the next version number.
  for (let attempt = 0; attempt < 5; attempt++) {
    const versionBase = attempt === 0
      ? currentVersion
      : (await prisma.ifcVersion.aggregate({
          where: { projectId },
          _max: { versionNumber: true },
        }))._max.versionNumber ?? 0;

    const newVersion = versionBase + 1;
    try {
      await prisma.ifcVersion.create({
        data: {
          projectId,
          versionNumber: newVersion,
          data: {
            type: "ifcJSON",
            version: "0.0.1",
            model,
            changeDescription,
            createdBy: createdBy ?? "system",
          } as unknown as Prisma.InputJsonValue,
        },
      });
      return newVersion;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "P2002") continue; // Unique constraint violation — retry
      throw err;
    }
  }
  throw new Error("Failed to save model version after retries");
}

// ─── Project Entity ───────────────────────────────────────────────────────────

export async function getProjectEntity(projectId: string): Promise<IfcProjectEntity | null> {
  const { model } = await loadModel(projectId);
  return model.project ?? null;
}

// ─── Project Settings ─────────────────────────────────────────────────────────

const VALID_UNIT_NAMES = new Set([
  "METRE", "SQUARE_METRE", "CUBIC_METRE", "DEGREE", "RADIAN",
  "SECOND", "KILOGRAM", "KELVIN", "AMPERE", "CANDELA", "MOLE",
  "PASCAL", "NEWTON", "WATT", "JOULE", "HERTZ", "LUX", "LUMEN",
]);

export async function getProjectUnits(projectId: string): Promise<IfcUnitAssignment[]> {
  const { model } = await loadModel(projectId);
  return model.units ?? model.project?.units ?? [];
}

export async function updateProjectUnits(
  projectId: string,
  units: IfcUnitAssignment[],
  userId?: string,
): Promise<{ units: IfcUnitAssignment[]; version: number }> {
  for (const u of units) {
    if (!VALID_UNIT_NAMES.has(u.name)) {
      throw new ValidationError(`invalid unit name: ${u.name}`);
    }
  }
  const { model, versionNumber } = await loadModel(projectId);
  const existing = model.units ?? model.project?.units ?? [];
  for (const incoming of units) {
    const idx = existing.findIndex((e) => e.unitType === incoming.unitType);
    if (idx >= 0) {
      existing[idx] = incoming;
    } else {
      existing.push(incoming);
    }
  }
  if (model.project) {
    model.project.units = existing;
  }
  model.units = existing;
  const newVersion = await saveModel(projectId, versionNumber, model, "Updated project units", userId);
  return { units: existing, version: newVersion };
}

export async function updateProjectMetadata(
  projectId: string,
  input: { description?: string; phase?: string; trueNorth?: { x: number; y: number } },
  userId?: string,
): Promise<{ project: IfcProjectEntity; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  if (!model.project) {
    model.project = { ifcType: "IfcProject", globalId: generateGlobalId(), name: "Untitled" };
  }
  if (input.description !== undefined) model.project.description = input.description;
  if (input.phase !== undefined) model.project.phase = input.phase;
  if (input.trueNorth !== undefined) model.project.trueNorth = input.trueNorth;
  const newVersion = await saveModel(projectId, versionNumber, model, "Updated project metadata", userId);
  return { project: model.project, version: newVersion };
}

// ─── Spatial Structure ────────────────────────────────────────────────────────

export async function getSpatialStructure(projectId: string): Promise<unknown> {
  const { model } = await loadModel(projectId);
  const project = model.project ?? { ifcType: "IfcProject", globalId: generateGlobalId(), name: "Untitled" };

  const buildStoreyTree = (storey: IfcBuildingStoreyEntity) => ({
    ...storey,
    spaces: model.spaces.filter((s) => s.storeyGlobalId === storey.globalId),
  });

  const buildBuildingTree = (building: { globalId: string; storeys: string[] }) => ({
    ...building,
    storeys: model.storeys
      .filter((s) => building.storeys.includes(s.globalId))
      .map(buildStoreyTree),
  });

  const buildSiteTree = (site: { globalId: string; buildings: string[] }) => ({
    ...site,
    buildings: model.buildings
      .filter((b) => site.buildings.includes(b.globalId))
      .map(buildBuildingTree),
  });

  return {
    project: {
      ...project,
      sites: model.sites.map(buildSiteTree),
    },
  };
}

// ─── Storey Operations ────────────────────────────────────────────────────────

export async function createStorey(
  projectId: string,
  input: { name: string; elevation: number },
  userId?: string,
): Promise<{ storey: IfcBuildingStoreyEntity; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const storey: IfcBuildingStoreyEntity = {
    ifcType: "IfcBuildingStorey",
    globalId: generateGlobalId(),
    name: input.name,
    elevation: input.elevation,
    spaces: [],
    elements: [],
  };
  model.storeys.push(storey);
  // Auto-add to first building if exists
  if (model.buildings.length > 0) {
    model.buildings[0].storeys.push(storey.globalId);
  }
  const newVersion = await saveModel(projectId, versionNumber, model, `Created storey "${input.name}"`, userId);
  return { storey, version: newVersion };
}

export async function updateStorey(
  projectId: string,
  storeyGlobalId: string,
  input: { name?: string; elevation?: number },
  userId?: string,
): Promise<{ storey: IfcBuildingStoreyEntity; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const storey = model.storeys.find((s) => s.globalId === storeyGlobalId);
  if (!storey) throw new NotFoundError("Storey not found");
  if (input.name !== undefined) storey.name = input.name;
  if (input.elevation !== undefined) storey.elevation = input.elevation;
  const newVersion = await saveModel(projectId, versionNumber, model, `Updated storey "${storey.name}"`, userId);
  return { storey, version: newVersion };
}

export async function deleteStorey(
  projectId: string,
  storeyGlobalId: string,
  userId?: string,
): Promise<number> {
  const { model, versionNumber } = await loadModel(projectId);
  const storey = model.storeys.find((s) => s.globalId === storeyGlobalId);
  if (!storey) throw new NotFoundError("Storey not found");
  const containedElements = model.elements.filter((e) => e.storeyGlobalId === storeyGlobalId);
  const containedSpaces = model.spaces.filter((s) => s.storeyGlobalId === storeyGlobalId);
  if (containedElements.length > 0 || containedSpaces.length > 0) {
    throw new DomainError("Storey still contains elements; relocate or delete them before removing the storey");
  }
  model.storeys = model.storeys.filter((s) => s.globalId !== storeyGlobalId);
  for (const building of model.buildings) {
    building.storeys = building.storeys.filter((id) => id !== storeyGlobalId);
  }
  return saveModel(projectId, versionNumber, model, `Deleted storey "${storey.name}"`, userId);
}

// ─── Space Operations ─────────────────────────────────────────────────────────

export async function createSpace(
  projectId: string,
  storeyGlobalId: string,
  input: { name: string; longName?: string },
  userId?: string,
): Promise<{ space: IfcSpaceEntity; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const storey = model.storeys.find((s) => s.globalId === storeyGlobalId);
  if (!storey) throw new NotFoundError("Storey not found");
  const space: IfcSpaceEntity = {
    ifcType: "IfcSpace",
    globalId: generateGlobalId(),
    name: input.name,
    longName: input.longName,
    storeyGlobalId,
  };
  model.spaces.push(space);
  storey.spaces.push(space.globalId);
  const newVersion = await saveModel(projectId, versionNumber, model, `Created space "${input.name}"`, userId);
  return { space, version: newVersion };
}

export async function updateSpace(
  projectId: string,
  spaceGlobalId: string,
  input: { name?: string; longName?: string },
  userId?: string,
): Promise<{ space: IfcSpaceEntity; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const space = model.spaces.find((s) => s.globalId === spaceGlobalId);
  if (!space) throw new NotFoundError("Space not found");
  if (input.name !== undefined) space.name = input.name;
  if (input.longName !== undefined) space.longName = input.longName;
  const newVersion = await saveModel(projectId, versionNumber, model, `Updated space "${space.name}"`, userId);
  return { space, version: newVersion };
}

// ─── Element Operations ───────────────────────────────────────────────────────

export async function listElements(
  projectId: string,
  filters?: {
    storeyId?: string;
    type?: string;
    category?: string;
    name?: string;
    pset?: string;
    property?: string;
    value?: string;
    bbox?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ elements: IfcElementEntity[]; total: number }> {
  const { model } = await loadModel(projectId);
  let elements = [...model.elements];

  if (filters?.storeyId) {
    elements = elements.filter((e) => e.storeyGlobalId === filters.storeyId);
  }
  if (filters?.type) {
    elements = elements.filter((e) => e.ifcType === filters.type);
  }
  if (filters?.category === "MEP") {
    elements = elements.filter((e) => MEP_TYPES.has(e.ifcType));
  }
  if (filters?.name) {
    const searchName = filters.name.toLowerCase();
    elements = elements.filter((e) => e.name.toLowerCase().includes(searchName));
  }
  if (filters?.pset && filters?.property) {
    const targetPset = filters.pset;
    const targetProp = filters.property;
    const targetValue = filters.value;
    const matchingElementIds = new Set(
      model.propertySets
        .filter((ps) => ps.name === targetPset)
        .filter((ps) => {
          const prop = ps.properties.find((p) => p.name === targetProp);
          if (!prop) return false;
          if (targetValue === undefined) return true;
          return String(prop.value) === targetValue;
        })
        .map((ps) => ps.elementGlobalId),
    );
    elements = elements.filter((e) => matchingElementIds.has(e.globalId));
  }
  if (filters?.bbox) {
    const [minX, minY, minZ, maxX, maxY, maxZ] = filters.bbox.split(",").map(Number);
    elements = elements.filter((e) => {
      const placement = model.placements[e.globalId];
      if (!placement) return false;
      const { x, y, z } = placement.location;
      return x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ;
    });
  }

  const total = elements.length;
  if (filters?.limit !== undefined) {
    const offset = filters?.offset ?? 0;
    elements = elements.slice(offset, offset + filters.limit);
  }

  return { elements, total };
}

export async function getElement(
  projectId: string,
  globalId: string,
): Promise<IfcElementEntity> {
  const { model } = await loadModel(projectId);
  const element = model.elements.find((e) => e.globalId === globalId);
  if (!element) throw new NotFoundError("Element not found");
  return element;
}

export async function createElement(
  projectId: string,
  input: {
    ifcType: string;
    name: string;
    description?: string;
    predefinedType?: string;
    storeyGlobalId: string;
    hostGlobalId?: string;
  },
  userId?: string,
): Promise<{ element: IfcElementEntity; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const element: IfcElementEntity = {
    ifcType: input.ifcType,
    globalId: generateGlobalId(),
    name: input.name,
    description: input.description,
    predefinedType: input.predefinedType,
    storeyGlobalId: input.storeyGlobalId,
    hostGlobalId: input.hostGlobalId,
  };
  model.elements.push(element);
  // Add to storey's element list
  const storey = model.storeys.find((s) => s.globalId === input.storeyGlobalId);
  if (storey) {
    storey.elements.push(element.globalId);
  }
  const newVersion = await saveModel(projectId, versionNumber, model, `Created ${input.ifcType} "${input.name}"`, userId);
  return { element, version: newVersion };
}

export async function updateElement(
  projectId: string,
  globalId: string,
  input: { name?: string; description?: string },
  userId?: string,
): Promise<{ element: IfcElementEntity; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const element = model.elements.find((e) => e.globalId === globalId);
  if (!element) throw new NotFoundError("Element not found");
  if (input.name !== undefined) element.name = input.name;
  if (input.description !== undefined) element.description = input.description;
  const newVersion = await saveModel(projectId, versionNumber, model, `Updated element "${element.name}"`, userId);
  return { element, version: newVersion };
}

export async function deleteElement(
  projectId: string,
  globalId: string,
  userId?: string,
): Promise<number> {
  const { model, versionNumber } = await loadModel(projectId);
  const element = model.elements.find((e) => e.globalId === globalId);
  if (!element) throw new NotFoundError("Element not found");
  model.elements = model.elements.filter((e) => e.globalId !== globalId);
  // Remove from storey
  for (const storey of model.storeys) {
    storey.elements = storey.elements.filter((id) => id !== globalId);
  }
  // Remove associated data
  model.propertySets = model.propertySets.filter((ps) => ps.elementGlobalId !== globalId);
  model.quantitySets = model.quantitySets.filter((qs) => qs.elementGlobalId !== globalId);
  model.materialAssignments = model.materialAssignments.filter((ma) => ma.elementGlobalId !== globalId);
  model.classificationReferences = model.classificationReferences.filter((cr) => cr.elementGlobalId !== globalId);
  delete model.placements[globalId];
  delete model.geometries[globalId];
  return saveModel(projectId, versionNumber, model, `Deleted element "${element.name}"`, userId);
}

// ─── Element Types Summary ────────────────────────────────────────────────────

export async function getElementTypes(projectId: string): Promise<{ ifcType: string; count: number }[]> {
  const { model } = await loadModel(projectId);
  const counts = new Map<string, number>();
  for (const e of model.elements) {
    counts.set(e.ifcType, (counts.get(e.ifcType) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([ifcType, count]) => ({ ifcType, count }));
}

export async function getElementSummary(
  projectId: string,
  groupBy: string[],
): Promise<{ ifcType: string; storeyName?: string; count: number }[]> {
  const { model } = await loadModel(projectId);
  const groups = new Map<string, number>();
  for (const e of model.elements) {
    let storeyName: string | undefined;
    if (groupBy.includes("storey")) {
      const storey = model.storeys.find((s) => s.globalId === e.storeyGlobalId);
      storeyName = storey?.name;
    }
    const key = `${e.ifcType}|${storeyName ?? ""}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return Array.from(groups.entries()).map(([key, count]) => {
    const [ifcType, storeyName] = key.split("|");
    return { ifcType, ...(storeyName ? { storeyName } : {}), count };
  });
}

// ─── Property Set Operations ──────────────────────────────────────────────────

export async function getPropertySets(
  projectId: string,
  elementGlobalId: string,
): Promise<IfcPropertySet[]> {
  const { model } = await loadModel(projectId);
  return model.propertySets.filter((ps) => ps.elementGlobalId === elementGlobalId);
}

export async function getPropertySet(
  projectId: string,
  elementGlobalId: string,
  psetName: string,
): Promise<IfcPropertySet> {
  const { model } = await loadModel(projectId);
  const pset = model.propertySets.find(
    (ps) => ps.elementGlobalId === elementGlobalId && ps.name === psetName,
  );
  if (!pset) throw new NotFoundError(`Property set "${psetName}" not found`);
  return pset;
}

export async function createPropertySet(
  projectId: string,
  elementGlobalId: string,
  input: { name: string; properties: IfcProperty[] },
  userId?: string,
): Promise<{ propertySet: IfcPropertySet; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const pset: IfcPropertySet = {
    name: input.name,
    globalId: generateGlobalId(),
    properties: input.properties,
    elementGlobalId,
  };
  model.propertySets.push(pset);
  const newVersion = await saveModel(projectId, versionNumber, model, `Created property set "${input.name}"`, userId);
  return { propertySet: pset, version: newVersion };
}

export async function addProperty(
  projectId: string,
  elementGlobalId: string,
  psetName: string,
  property: IfcProperty,
  userId?: string,
): Promise<{ property: IfcProperty; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const pset = model.propertySets.find(
    (ps) => ps.elementGlobalId === elementGlobalId && ps.name === psetName,
  );
  if (!pset) throw new NotFoundError(`Property set "${psetName}" not found`);
  pset.properties.push(property);
  const newVersion = await saveModel(projectId, versionNumber, model, `Added property "${property.name}" to "${psetName}"`, userId);
  return { property, version: newVersion };
}

export async function updateProperty(
  projectId: string,
  elementGlobalId: string,
  psetName: string,
  propertyName: string,
  input: { value: unknown },
  userId?: string,
): Promise<{ property: IfcProperty; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const pset = model.propertySets.find(
    (ps) => ps.elementGlobalId === elementGlobalId && ps.name === psetName,
  );
  if (!pset) throw new NotFoundError(`Property set "${psetName}" not found`);
  const property = pset.properties.find((p) => p.name === propertyName);
  if (!property) throw new NotFoundError(`Property "${propertyName}" not found`);
  property.value = input.value;
  const newVersion = await saveModel(projectId, versionNumber, model, `Updated property "${propertyName}" in "${psetName}"`, userId);
  return { property, version: newVersion };
}

export async function deleteProperty(
  projectId: string,
  elementGlobalId: string,
  psetName: string,
  propertyName: string,
  userId?: string,
): Promise<number> {
  const { model, versionNumber } = await loadModel(projectId);
  const pset = model.propertySets.find(
    (ps) => ps.elementGlobalId === elementGlobalId && ps.name === psetName,
  );
  if (!pset) throw new NotFoundError(`Property set "${psetName}" not found`);
  pset.properties = pset.properties.filter((p) => p.name !== propertyName);
  return saveModel(projectId, versionNumber, model, `Deleted property "${propertyName}" from "${psetName}"`, userId);
}

export async function deletePropertySet(
  projectId: string,
  elementGlobalId: string,
  psetName: string,
  userId?: string,
): Promise<number> {
  const { model, versionNumber } = await loadModel(projectId);
  model.propertySets = model.propertySets.filter(
    (ps) => !(ps.elementGlobalId === elementGlobalId && ps.name === psetName),
  );
  return saveModel(projectId, versionNumber, model, `Deleted property set "${psetName}"`, userId);
}

// ─── Property Set Validation ──────────────────────────────────────────────────

interface PsetSchemaProperty {
  name: string;
  type: string;
  required?: boolean;
}

interface PsetSchema {
  name: string;
  applicableTypes: string[];
  properties: PsetSchemaProperty[];
}

const STANDARD_PSET_SCHEMAS: PsetSchema[] = [
  {
    name: "Pset_WallCommon",
    applicableTypes: ["IfcWall"],
    properties: [
      { name: "IsExternal", type: "IfcBoolean" },
      { name: "ThermalTransmittance", type: "IfcThermalTransmittanceMeasure" },
      { name: "FireRating", type: "IfcLabel" },
      { name: "LoadBearing", type: "IfcBoolean" },
      { name: "AcousticRating", type: "IfcLabel" },
    ],
  },
  {
    name: "Pset_SlabCommon",
    applicableTypes: ["IfcSlab"],
    properties: [
      { name: "IsExternal", type: "IfcBoolean" },
      { name: "LoadBearing", type: "IfcBoolean" },
      { name: "FireRating", type: "IfcLabel" },
      { name: "AcousticRating", type: "IfcLabel" },
      { name: "ThermalTransmittance", type: "IfcThermalTransmittanceMeasure" },
    ],
  },
  {
    name: "Pset_ManufacturerTypeInformation",
    applicableTypes: ["IfcWall", "IfcSlab", "IfcColumn", "IfcBeam", "IfcDoor", "IfcWindow"],
    properties: [
      { name: "GlobalTradeItemNumber", type: "IfcIdentifier" },
      { name: "ArticleNumber", type: "IfcIdentifier" },
      { name: "ModelReference", type: "IfcLabel" },
      { name: "ModelLabel", type: "IfcLabel" },
      { name: "Manufacturer", type: "IfcLabel" },
    ],
  },
];

export function getStandardPsetSchemas(): PsetSchema[] {
  return STANDARD_PSET_SCHEMAS;
}

function validatePsetAgainstSchema(
  pset: IfcPropertySet,
  schema: PsetSchemaProperty[],
): { valid: boolean; errors: { property: string; issue: string }[]; warnings: { property: string; issue: string }[] } {
  const errors: { property: string; issue: string }[] = [];
  const warnings: { property: string; issue: string }[] = [];

  // Check each property in pset against the schema
  for (const prop of pset.properties) {
    const schemaProp = schema.find((sp) => sp.name === prop.name);
    if (schemaProp && prop.type !== schemaProp.type) {
      errors.push({ property: prop.name, issue: "type mismatch" });
    }
  }

  // Check for required/expected properties from the schema missing in the pset
  for (const schemaProp of schema) {
    const found = pset.properties.find((p) => p.name === schemaProp.name);
    if (!found) {
      if (schemaProp.required) {
        errors.push({ property: schemaProp.name, issue: "missing required property" });
      } else {
        warnings.push({ property: schemaProp.name, issue: "missing property" });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export async function validatePropertySet(
  projectId: string,
  elementGlobalId: string,
  psetName: string,
  customTemplate?: { properties: PsetSchemaProperty[] },
): Promise<{ psetName: string; valid: boolean; errors: { property: string; issue: string }[]; warnings: { property: string; issue: string }[] }> {
  const { model } = await loadModel(projectId);
  const pset = model.propertySets.find(
    (ps) => ps.elementGlobalId === elementGlobalId && ps.name === psetName,
  );
  if (!pset) throw new NotFoundError(`Property set "${psetName}" not found`);

  const schema = customTemplate?.properties
    ?? STANDARD_PSET_SCHEMAS.find((s) => s.name === psetName)?.properties
    ?? [];

  const result = validatePsetAgainstSchema(pset, schema);
  return { psetName, ...result };
}

export async function validateAllPropertySets(
  projectId: string,
  elementGlobalId: string,
): Promise<{ psetName: string; valid: boolean; errors: { property: string; issue: string }[]; warnings: { property: string; issue: string }[] }[]> {
  const { model } = await loadModel(projectId);
  const psets = model.propertySets.filter((ps) => ps.elementGlobalId === elementGlobalId);
  return psets.map((pset) => {
    const schema = STANDARD_PSET_SCHEMAS.find((s) => s.name === pset.name)?.properties ?? [];
    const result = validatePsetAgainstSchema(pset, schema);
    return { psetName: pset.name, ...result };
  });
}

// ─── Opening Operations ───────────────────────────────────────────────────────

export async function createOpening(
  projectId: string,
  hostElementGlobalId: string,
  data: { name: string; placement: { x: number; y: number; z: number }; dimensions: { width: number; height: number } },
  userId?: string,
): Promise<{ opening: IfcOpeningElement; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const host = model.elements.find((e) => e.globalId === hostElementGlobalId);
  if (!host) throw new NotFoundError(`Element ${hostElementGlobalId} not found`);

  const opening: IfcOpeningElement = {
    globalId: generateGlobalId(),
    name: data.name,
    ifcType: "IfcOpeningElement",
    hostElementGlobalId,
    placement: data.placement,
    dimensions: data.dimensions,
  };
  model.openings.push(opening);
  const version = await saveModel(projectId, versionNumber, model, `Create opening "${data.name}"`, userId);
  return { opening, version };
}

export async function listOpenings(
  projectId: string,
  hostElementGlobalId: string,
): Promise<IfcOpeningElement[]> {
  const { model } = await loadModel(projectId);
  return model.openings.filter((o) => o.hostElementGlobalId === hostElementGlobalId);
}

export async function setFilling(
  projectId: string,
  hostElementGlobalId: string,
  openingGlobalId: string,
  fillingGlobalId: string,
  userId?: string,
): Promise<{ fillingElement: { globalId: string; name: string; ifcType: string }; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const opening = model.openings.find(
    (o) => o.globalId === openingGlobalId && o.hostElementGlobalId === hostElementGlobalId,
  );
  if (!opening) throw new NotFoundError(`Opening ${openingGlobalId} not found`);
  if (opening.fillingGlobalId) {
    throw new DomainError(`Opening ${openingGlobalId} is already filled`);
  }
  const fillingElement = model.elements.find((e) => e.globalId === fillingGlobalId);
  if (!fillingElement) throw new NotFoundError(`Element ${fillingGlobalId} not found`);

  opening.fillingGlobalId = fillingGlobalId;
  const version = await saveModel(projectId, versionNumber, model, `Fill opening "${opening.name}"`, userId);
  return {
    fillingElement: { globalId: fillingElement.globalId, name: fillingElement.name, ifcType: fillingElement.ifcType },
    version,
  };
}

export async function getFilling(
  projectId: string,
  hostElementGlobalId: string,
  openingGlobalId: string,
): Promise<{ fillingElement: { globalId: string; name: string; ifcType: string } }> {
  const { model } = await loadModel(projectId);
  const opening = model.openings.find(
    (o) => o.globalId === openingGlobalId && o.hostElementGlobalId === hostElementGlobalId,
  );
  if (!opening) throw new NotFoundError(`Opening ${openingGlobalId} not found`);
  if (!opening.fillingGlobalId) throw new NotFoundError(`Opening ${openingGlobalId} has no filling`);
  const fillingElement = model.elements.find((e) => e.globalId === opening.fillingGlobalId);
  if (!fillingElement) throw new NotFoundError(`Filling element not found`);
  return {
    fillingElement: { globalId: fillingElement.globalId, name: fillingElement.name, ifcType: fillingElement.ifcType },
  };
}

export async function removeFilling(
  projectId: string,
  hostElementGlobalId: string,
  openingGlobalId: string,
  userId?: string,
): Promise<number> {
  const { model, versionNumber } = await loadModel(projectId);
  const opening = model.openings.find(
    (o) => o.globalId === openingGlobalId && o.hostElementGlobalId === hostElementGlobalId,
  );
  if (!opening) throw new NotFoundError(`Opening ${openingGlobalId} not found`);
  opening.fillingGlobalId = undefined;
  return saveModel(projectId, versionNumber, model, `Remove filling from opening "${opening.name}"`, userId);
}

export async function removeOpening(
  projectId: string,
  hostElementGlobalId: string,
  openingGlobalId: string,
  userId?: string,
): Promise<number> {
  const { model, versionNumber } = await loadModel(projectId);
  const idx = model.openings.findIndex(
    (o) => o.globalId === openingGlobalId && o.hostElementGlobalId === hostElementGlobalId,
  );
  if (idx === -1) throw new NotFoundError(`Opening ${openingGlobalId} not found`);
  model.openings.splice(idx, 1);
  return saveModel(projectId, versionNumber, model, `Remove opening`, userId);
}

// ─── Port Operations ──────────────────────────────────────────────────────────

export async function createPort(
  projectId: string,
  elementGlobalId: string,
  data: { name: string; flowDirection: string; systemType?: string },
  userId?: string,
): Promise<{ port: IfcDistributionPort; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const el = model.elements.find((e) => e.globalId === elementGlobalId);
  if (!el) throw new NotFoundError(`Element ${elementGlobalId} not found`);

  const port: IfcDistributionPort = {
    portId: generateGlobalId(),
    name: data.name,
    ifcType: "IfcDistributionPort",
    elementGlobalId,
    flowDirection: data.flowDirection,
    ...(data.systemType ? { systemType: data.systemType } : {}),
  };
  model.ports.push(port);
  const version = await saveModel(projectId, versionNumber, model, `Create port "${data.name}"`, userId);
  return { port, version };
}

export async function listPorts(
  projectId: string,
  elementGlobalId: string,
): Promise<IfcDistributionPort[]> {
  const { model } = await loadModel(projectId);
  return model.ports.filter((p) => p.elementGlobalId === elementGlobalId);
}

// ─── Connection Operations ────────────────────────────────────────────────────

export async function createConnection(
  projectId: string,
  elementGlobalId: string,
  data: { connectedElementGlobalId: string; sourcePortId?: string; targetPortId?: string },
  userId?: string,
): Promise<{ connection: IfcPortConnection & { relatingElement: { globalId: string; name: string }; relatedElement: { globalId: string; name: string } }; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const relatingEl = model.elements.find((e) => e.globalId === elementGlobalId);
  if (!relatingEl) throw new NotFoundError(`Element ${elementGlobalId} not found`);
  const relatedEl = model.elements.find((e) => e.globalId === data.connectedElementGlobalId);
  if (!relatedEl) throw new NotFoundError(`Connected element not found`);

  const connection: IfcPortConnection = {
    connectionId: generateGlobalId(),
    relatingElementGlobalId: elementGlobalId,
    relatedElementGlobalId: data.connectedElementGlobalId,
    ...(data.sourcePortId ? { sourcePortId: data.sourcePortId } : {}),
    ...(data.targetPortId ? { targetPortId: data.targetPortId } : {}),
  };
  model.connections.push(connection);
  const version = await saveModel(projectId, versionNumber, model, `Create connection`, userId);
  return {
    connection: {
      ...connection,
      relatingElement: { globalId: relatingEl.globalId, name: relatingEl.name },
      relatedElement: { globalId: relatedEl.globalId, name: relatedEl.name },
    },
    version,
  };
}

export async function listConnections(
  projectId: string,
  elementGlobalId: string,
): Promise<IfcPortConnection[]> {
  const { model } = await loadModel(projectId);
  return model.connections.filter(
    (c) => c.relatingElementGlobalId === elementGlobalId || c.relatedElementGlobalId === elementGlobalId,
  );
}

export async function removeConnection(
  projectId: string,
  elementGlobalId: string,
  connectionId: string,
  userId?: string,
): Promise<number> {
  const { model, versionNumber } = await loadModel(projectId);
  const idx = model.connections.findIndex((c) => c.connectionId === connectionId);
  if (idx === -1) throw new NotFoundError(`Connection ${connectionId} not found`);
  model.connections.splice(idx, 1);
  return saveModel(projectId, versionNumber, model, `Remove connection`, userId);
}

// ─── Quantity Set Operations ──────────────────────────────────────────────────

export async function getQuantitySet(
  projectId: string,
  elementGlobalId: string,
  qsetName: string,
): Promise<IfcQuantitySet> {
  const { model } = await loadModel(projectId);
  const qset = model.quantitySets.find(
    (qs) => qs.elementGlobalId === elementGlobalId && qs.name === qsetName,
  );
  if (!qset) throw new NotFoundError(`Quantity set "${qsetName}" not found`);
  return qset;
}

// ─── Material Operations ──────────────────────────────────────────────────────

export async function listMaterials(projectId: string): Promise<IfcMaterial[]> {
  const { model } = await loadModel(projectId);
  return model.materials;
}

export async function createMaterial(
  projectId: string,
  input: { name: string; category?: string },
  userId?: string,
): Promise<{ material: IfcMaterial; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const material: IfcMaterial = {
    materialId: generateGlobalId(),
    name: input.name,
    category: input.category,
  };
  model.materials.push(material);
  const newVersion = await saveModel(projectId, versionNumber, model, `Created material "${input.name}"`, userId);
  return { material, version: newVersion };
}

export async function getMaterialAssignment(
  projectId: string,
  elementGlobalId: string,
): Promise<IfcMaterialAssignment> {
  const { model } = await loadModel(projectId);
  const assignment = model.materialAssignments.find(
    (ma) => ma.elementGlobalId === elementGlobalId,
  );
  if (!assignment) throw new NotFoundError("Material assignment not found");
  return assignment;
}

export async function setMaterialAssignment(
  projectId: string,
  elementGlobalId: string,
  input: {
    assignmentType?: string;
    materialId?: string;
    name?: string;
    layers?: IfcMaterialLayer[];
    constituents?: { materialName: string; name: string; fraction?: number; category?: string }[];
    profiles?: { materialName: string; name: string; profile: Record<string, unknown> }[];
  },
  userId?: string,
): Promise<{ assignment: IfcMaterialAssignment; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);

  // Remove existing assignment
  model.materialAssignments = model.materialAssignments.filter(
    (ma) => ma.elementGlobalId !== elementGlobalId,
  );

  let assignment: IfcMaterialAssignment;
  if (input.assignmentType === "IfcMaterialConstituentSet" && input.constituents) {
    assignment = {
      assignmentType: "IfcMaterialConstituentSet",
      name: input.name,
      constituents: input.constituents,
      elementGlobalId,
    };
  } else if (input.assignmentType === "IfcMaterialProfileSet" && input.profiles) {
    assignment = {
      assignmentType: "IfcMaterialProfileSet",
      name: input.name,
      profiles: input.profiles,
      elementGlobalId,
    };
  } else if (input.layers) {
    assignment = {
      assignmentType: "IfcMaterialLayerSetUsage",
      layers: input.layers,
      elementGlobalId,
    };
  } else if (input.materialId) {
    const material = model.materials.find((m) => m.materialId === input.materialId);
    assignment = {
      assignmentType: "IfcMaterial",
      materialId: input.materialId,
      name: material?.name,
      elementGlobalId,
    };
  } else {
    throw new ValidationError("Provide materialId, layers, constituents, or profiles");
  }
  model.materialAssignments.push(assignment);
  const newVersion = await saveModel(projectId, versionNumber, model, `Set material on element`, userId);
  return { assignment, version: newVersion };
}

export async function updateMaterialLayer(
  projectId: string,
  elementGlobalId: string,
  layerIndex: number,
  input: { thickness?: number },
  userId?: string,
): Promise<{ layer: IfcMaterialLayer; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const assignment = model.materialAssignments.find(
    (ma) => ma.elementGlobalId === elementGlobalId,
  );
  if (!assignment?.layers) throw new NotFoundError("Material layer set not found");
  const layer = assignment.layers[layerIndex];
  if (!layer) throw new NotFoundError("Material layer not found");
  if (input.thickness !== undefined) layer.thickness = input.thickness;
  const newVersion = await saveModel(projectId, versionNumber, model, `Updated material layer`, userId);
  return { layer, version: newVersion };
}

export async function deleteMaterialAssignment(
  projectId: string,
  elementGlobalId: string,
  userId?: string,
): Promise<number> {
  const { model, versionNumber } = await loadModel(projectId);
  model.materialAssignments = model.materialAssignments.filter(
    (ma) => ma.elementGlobalId !== elementGlobalId,
  );
  return saveModel(projectId, versionNumber, model, `Removed material from element`, userId);
}

export async function bulkAssignMaterial(
  projectId: string,
  materialId: string,
  elementGlobalIds: string[],
  userId?: string,
): Promise<{ assignedCount?: number; materialName?: string; succeeded?: string[]; failed?: { globalId: string; reason: string }[]; partial: boolean; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const material = model.materials.find((m) => m.materialId === materialId);
  if (!material) throw new NotFoundError(`Material ${materialId} not found`);

  const succeeded: string[] = [];
  const failed: { globalId: string; reason: string }[] = [];

  for (const gid of elementGlobalIds) {
    const el = model.elements.find((e) => e.globalId === gid);
    if (!el) {
      failed.push({ globalId: gid, reason: "element not found" });
      continue;
    }
    // Remove existing assignment for this element
    model.materialAssignments = model.materialAssignments.filter(
      (ma) => ma.elementGlobalId !== gid,
    );
    model.materialAssignments.push({
      assignmentType: "IfcMaterial",
      materialId,
      name: material.name,
      elementGlobalId: gid,
    });
    succeeded.push(gid);
  }

  const version = await saveModel(projectId, versionNumber, model, `Bulk assign material "${material.name}"`, userId);

  if (failed.length > 0 && succeeded.length > 0) {
    return { succeeded, failed, partial: true, version };
  }
  return { assignedCount: succeeded.length, materialName: material.name, partial: false, version };
}

export async function updateConstituent(
  projectId: string,
  elementGlobalId: string,
  constituentIndex: number,
  input: { fraction?: number; materialName?: string; name?: string; category?: string },
  userId?: string,
): Promise<{ constituent: IfcMaterialAssignment["constituents"] extends (infer U)[] | undefined ? U : never; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const assignment = model.materialAssignments.find(
    (ma) => ma.elementGlobalId === elementGlobalId && ma.assignmentType === "IfcMaterialConstituentSet",
  );
  if (!assignment?.constituents) throw new NotFoundError("Constituent set not found");
  const constituent = assignment.constituents[constituentIndex];
  if (!constituent) throw new NotFoundError(`Constituent at index ${constituentIndex} not found`);
  if (input.fraction !== undefined) constituent.fraction = input.fraction;
  if (input.materialName !== undefined) constituent.materialName = input.materialName;
  if (input.name !== undefined) constituent.name = input.name;
  if (input.category !== undefined) constituent.category = input.category;
  const version = await saveModel(projectId, versionNumber, model, `Update constituent`, userId);
  return { constituent, version };
}

export async function removeConstituent(
  projectId: string,
  elementGlobalId: string,
  constituentIndex: number,
  userId?: string,
): Promise<{ assignment: IfcMaterialAssignment; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const assignment = model.materialAssignments.find(
    (ma) => ma.elementGlobalId === elementGlobalId && ma.assignmentType === "IfcMaterialConstituentSet",
  );
  if (!assignment?.constituents) throw new NotFoundError("Constituent set not found");
  if (constituentIndex < 0 || constituentIndex >= assignment.constituents.length) {
    throw new NotFoundError(`Constituent at index ${constituentIndex} not found`);
  }
  assignment.constituents.splice(constituentIndex, 1);
  const version = await saveModel(projectId, versionNumber, model, `Remove constituent`, userId);
  return { assignment, version };
}

// ─── Geometry & Placement ─────────────────────────────────────────────────────

export async function getGeometry(
  projectId: string,
  elementGlobalId: string,
): Promise<IfcGeometryRepresentation> {
  const { model } = await loadModel(projectId);
  const geometry = model.geometries[elementGlobalId];
  if (!geometry) {
    return { representations: [{ representationType: "SweptSolid", items: [] }] };
  }
  return geometry;
}

export async function getPlacement(
  projectId: string,
  elementGlobalId: string,
): Promise<IfcPlacement> {
  const { model } = await loadModel(projectId);
  const placement = model.placements[elementGlobalId];
  if (!placement) {
    return {
      location: { x: 0, y: 0, z: 0 },
      axis: { x: 0, y: 0, z: 1 },
      refDirection: { x: 1, y: 0, z: 0 },
    };
  }
  return placement;
}

export async function updatePlacement(
  projectId: string,
  elementGlobalId: string,
  input: { location?: IfcPoint3D; axis?: IfcPoint3D; refDirection?: IfcPoint3D },
  userId?: string,
): Promise<{ placement: IfcPlacement; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const existing = model.placements[elementGlobalId] ?? {
    location: { x: 0, y: 0, z: 0 },
    axis: { x: 0, y: 0, z: 1 },
    refDirection: { x: 1, y: 0, z: 0 },
  };
  if (input.location) existing.location = input.location;
  if (input.axis) existing.axis = input.axis;
  if (input.refDirection) existing.refDirection = input.refDirection;
  model.placements[elementGlobalId] = existing;
  const newVersion = await saveModel(projectId, versionNumber, model, `Updated placement`, userId);
  return { placement: existing, version: newVersion };
}

const VALID_REPRESENTATION_TYPES = new Set([
  "SweptSolid", "Brep", "Clipping", "MappedRepresentation", "Tessellation",
  "CSG", "AdvancedSweptSolid", "BoundingBox", "SectionedSpine", "SurfaceModel",
]);

export async function updateGeometry(
  projectId: string,
  elementGlobalId: string,
  input: { representations: { representationType: string; items: unknown[] }[] },
  userId?: string,
): Promise<{ geometry: IfcGeometryRepresentation; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const element = model.elements.find((e) => e.globalId === elementGlobalId);
  if (!element) throw new NotFoundError("Element not found");

  for (const rep of input.representations) {
    if (!VALID_REPRESENTATION_TYPES.has(rep.representationType)) {
      throw new ValidationError(
        `Invalid representationType "${rep.representationType}". Supported types: ${[...VALID_REPRESENTATION_TYPES].join(", ")}`,
      );
    }
  }

  const existing = model.geometries[elementGlobalId] ?? { representations: [] };
  for (const rep of input.representations) {
    const idx = existing.representations.findIndex(
      (r) => r.representationType === rep.representationType,
    );
    if (idx >= 0) {
      // Merge items into existing representation
      existing.representations[idx] = { ...existing.representations[idx], ...rep };
    } else {
      existing.representations.push(rep);
    }
  }
  model.geometries[elementGlobalId] = existing;
  const newVersion = await saveModel(projectId, versionNumber, model, `Updated geometry`, userId);
  return { geometry: existing, version: newVersion };
}

export async function replaceGeometry(
  projectId: string,
  elementGlobalId: string,
  input: { representations: { representationType: string; items: unknown[] }[] },
  userId?: string,
): Promise<{ geometry: IfcGeometryRepresentation; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const element = model.elements.find((e) => e.globalId === elementGlobalId);
  if (!element) throw new NotFoundError("Element not found");

  for (const rep of input.representations) {
    if (!VALID_REPRESENTATION_TYPES.has(rep.representationType)) {
      throw new ValidationError(
        `Invalid representationType "${rep.representationType}". Supported types: ${[...VALID_REPRESENTATION_TYPES].join(", ")}`,
      );
    }
  }

  const geometry: IfcGeometryRepresentation = { representations: input.representations };
  model.geometries[elementGlobalId] = geometry;
  const newVersion = await saveModel(projectId, versionNumber, model, `Replaced geometry`, userId);
  return { geometry, version: newVersion };
}

export async function getCoordinateReferenceSystem(
  projectId: string,
): Promise<IfcCoordinateReferenceSystem> {
  const { model } = await loadModel(projectId);
  return model.coordinateReferenceSystem ?? {
    name: "EPSG:27700 - British National Grid",
    eastings: 0,
    northings: 0,
    orthogonalHeight: 0,
    xAxisAbscissa: 1,
    xAxisOrdinate: 0,
  };
}

// ─── Classification Operations ────────────────────────────────────────────────

export async function createClassificationSystem(
  projectId: string,
  input: { name: string; source?: string; edition?: string; editionDate?: string },
  userId?: string,
): Promise<{ system: IfcClassificationSystem; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const system: IfcClassificationSystem = {
    systemId: generateGlobalId(),
    name: input.name,
    ...(input.source !== undefined && { source: input.source }),
    ...(input.edition !== undefined && { edition: input.edition }),
    ...(input.editionDate !== undefined && { editionDate: input.editionDate }),
  };
  model.classifications.push(system);
  const newVersion = await saveModel(projectId, versionNumber, model, `Created classification system ${input.name}`, userId);
  return { system, version: newVersion };
}

export async function getClassificationSystem(
  projectId: string,
  systemId: string,
): Promise<IfcClassificationSystem> {
  const { model } = await loadModel(projectId);
  const system = model.classifications.find((c) => c.systemId === systemId);
  if (!system) throw new NotFoundError("Classification system not found");
  return system;
}

export async function updateClassificationSystem(
  projectId: string,
  systemId: string,
  input: { name?: string; source?: string; edition?: string; editionDate?: string },
  userId?: string,
): Promise<{ system: IfcClassificationSystem; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const system = model.classifications.find((c) => c.systemId === systemId);
  if (!system) throw new NotFoundError("Classification system not found");
  if (input.name !== undefined) system.name = input.name;
  if (input.source !== undefined) system.source = input.source;
  if (input.edition !== undefined) system.edition = input.edition;
  if (input.editionDate !== undefined) system.editionDate = input.editionDate;
  const newVersion = await saveModel(projectId, versionNumber, model, `Updated classification system`, userId);
  return { system, version: newVersion };
}

export async function deleteClassificationSystem(
  projectId: string,
  systemId: string,
  userId?: string,
): Promise<number> {
  const { model, versionNumber } = await loadModel(projectId);
  const idx = model.classifications.findIndex((c) => c.systemId === systemId);
  if (idx === -1) throw new NotFoundError("Classification system not found");
  const hasRefs = model.classificationReferences.some((cr) => cr.systemId === systemId);
  if (hasRefs) throw new DomainError("classification system is referenced by elements");
  model.classifications.splice(idx, 1);
  return saveModel(projectId, versionNumber, model, `Deleted classification system`, userId);
}

export async function listClassifications(projectId: string): Promise<IfcClassificationSystem[]> {
  const { model } = await loadModel(projectId);
  return model.classifications;
}

export async function getElementClassifications(
  projectId: string,
  elementGlobalId: string,
): Promise<IfcClassificationReference[]> {
  const { model } = await loadModel(projectId);
  return model.classificationReferences.filter(
    (cr) => cr.elementGlobalId === elementGlobalId,
  );
}

export async function assignClassificationReference(
  projectId: string,
  elementGlobalId: string,
  input: { systemId: string; notation: string; name: string },
  userId?: string,
): Promise<{ reference: IfcClassificationReference; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const reference: IfcClassificationReference = {
    referenceId: generateGlobalId(),
    systemId: input.systemId,
    notation: input.notation,
    name: input.name,
    elementGlobalId,
  };
  model.classificationReferences.push(reference);
  const newVersion = await saveModel(projectId, versionNumber, model, `Assigned classification to element`, userId);
  return { reference, version: newVersion };
}

export async function updateClassificationReference(
  projectId: string,
  elementGlobalId: string,
  referenceId: string,
  input: { notation?: string; name?: string },
  userId?: string,
): Promise<{ reference: IfcClassificationReference; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const reference = model.classificationReferences.find(
    (cr) => cr.elementGlobalId === elementGlobalId && cr.referenceId === referenceId,
  );
  if (!reference) throw new NotFoundError("Classification reference not found");
  if (input.notation !== undefined) reference.notation = input.notation;
  if (input.name !== undefined) reference.name = input.name;
  const newVersion = await saveModel(projectId, versionNumber, model, `Updated classification reference`, userId);
  return { reference, version: newVersion };
}

export async function deleteClassificationReference(
  projectId: string,
  elementGlobalId: string,
  referenceId: string,
  userId?: string,
): Promise<number> {
  const { model, versionNumber } = await loadModel(projectId);
  model.classificationReferences = model.classificationReferences.filter(
    (cr) => !(cr.elementGlobalId === elementGlobalId && cr.referenceId === referenceId),
  );
  return saveModel(projectId, versionNumber, model, `Removed classification reference`, userId);
}

// ─── Relationship Operations ──────────────────────────────────────────────────

export async function getSpatialContainment(
  projectId: string,
  elementGlobalId: string,
): Promise<{ containedIn: { ifcType: string; name: string; globalId: string } }> {
  const { model } = await loadModel(projectId);
  const element = model.elements.find((e) => e.globalId === elementGlobalId);
  if (!element) throw new NotFoundError("Element not found");
  const storey = model.storeys.find((s) => s.globalId === element.storeyGlobalId);
  if (!storey) throw new NotFoundError("Storey not found");
  return {
    containedIn: {
      ifcType: "IfcBuildingStorey",
      name: storey.name,
      globalId: storey.globalId,
    },
  };
}

export async function updateSpatialContainment(
  projectId: string,
  elementGlobalId: string,
  input: { storeyGlobalId: string },
  userId?: string,
): Promise<{ containedIn: { ifcType: string; name: string; globalId: string }; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const element = model.elements.find((e) => e.globalId === elementGlobalId);
  if (!element) throw new NotFoundError("Element not found");
  const newStorey = model.storeys.find((s) => s.globalId === input.storeyGlobalId);
  if (!newStorey) throw new NotFoundError("Storey not found");
  // Remove from old storey
  const oldStorey = model.storeys.find((s) => s.globalId === element.storeyGlobalId);
  if (oldStorey) {
    oldStorey.elements = oldStorey.elements.filter((id) => id !== elementGlobalId);
  }
  // Add to new storey
  element.storeyGlobalId = input.storeyGlobalId;
  newStorey.elements.push(elementGlobalId);
  const newVersion = await saveModel(projectId, versionNumber, model, `Moved element to "${newStorey.name}"`, userId);
  return {
    containedIn: { ifcType: "IfcBuildingStorey", name: newStorey.name, globalId: newStorey.globalId },
    version: newVersion,
  };
}

export async function getTypeAssignment(
  projectId: string,
  elementGlobalId: string,
): Promise<IfcTypeDefinition> {
  const { model } = await loadModel(projectId);
  const assignment = model.typeAssignments.find((ta) => ta.elementGlobalId === elementGlobalId);
  if (!assignment) throw new NotFoundError("Type assignment not found");
  const typeDef = model.typeDefinitions.find((td) => td.globalId === assignment.typeGlobalId);
  if (!typeDef) throw new NotFoundError("Type definition not found");
  return typeDef;
}

export async function setTypeAssignment(
  projectId: string,
  elementGlobalId: string,
  input: { typeGlobalId: string },
  userId?: string,
): Promise<{ type: IfcTypeDefinition; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const typeDef = model.typeDefinitions.find((td) => td.globalId === input.typeGlobalId);
  if (!typeDef) throw new NotFoundError("Type definition not found");
  // Remove existing assignment
  model.typeAssignments = model.typeAssignments.filter(
    (ta) => ta.elementGlobalId !== elementGlobalId,
  );
  model.typeAssignments.push({ elementGlobalId, typeGlobalId: input.typeGlobalId });
  const newVersion = await saveModel(projectId, versionNumber, model, `Assigned type to element`, userId);
  return { type: typeDef, version: newVersion };
}

// ─── Group Operations ─────────────────────────────────────────────────────────

export async function createGroup(
  projectId: string,
  input: { name: string; description?: string; memberGlobalIds: string[] },
  userId?: string,
): Promise<{ group: IfcGroup; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const group: IfcGroup = {
    ifcType: "IfcGroup",
    globalId: generateGlobalId(),
    name: input.name,
    description: input.description,
    members: input.memberGlobalIds,
  };
  model.groups.push(group);
  const newVersion = await saveModel(projectId, versionNumber, model, `Created group "${input.name}"`, userId);
  return { group, version: newVersion };
}

export async function addGroupMember(
  projectId: string,
  groupGlobalId: string,
  memberGlobalId: string,
  userId?: string,
): Promise<{ group: IfcGroup; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const group = model.groups.find((g) => g.globalId === groupGlobalId);
  if (!group) throw new NotFoundError("Group not found");
  group.members.push(memberGlobalId);
  const newVersion = await saveModel(projectId, versionNumber, model, `Added member to group "${group.name}"`, userId);
  return { group, version: newVersion };
}

export async function removeGroupMember(
  projectId: string,
  groupGlobalId: string,
  memberGlobalId: string,
  userId?: string,
): Promise<number> {
  const { model, versionNumber } = await loadModel(projectId);
  const group = model.groups.find((g) => g.globalId === groupGlobalId);
  if (!group) throw new NotFoundError("Group not found");
  group.members = group.members.filter((id) => id !== memberGlobalId);
  return saveModel(projectId, versionNumber, model, `Removed member from group "${group.name}"`, userId);
}

export async function getGroup(
  projectId: string,
  groupGlobalId: string,
): Promise<IfcGroup> {
  const { model } = await loadModel(projectId);
  const group = model.groups.find((g) => g.globalId === groupGlobalId);
  if (!group) throw new NotFoundError("Group not found");
  return group;
}

// ─── System Operations ────────────────────────────────────────────────────────

export async function createSystem(
  projectId: string,
  input: { name: string; predefinedType?: string; memberGlobalIds: string[] },
  userId?: string,
): Promise<{ system: IfcSystem; version: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const system: IfcSystem = {
    ifcType: "IfcSystem",
    globalId: generateGlobalId(),
    name: input.name,
    predefinedType: input.predefinedType,
    members: input.memberGlobalIds,
  };
  model.systems.push(system);
  const newVersion = await saveModel(projectId, versionNumber, model, `Created system "${input.name}"`, userId);
  return { system, version: newVersion };
}

// ─── Versioning Operations ────────────────────────────────────────────────────

export async function listVersions(
  projectId: string,
): Promise<{ version: number; createdAt: Date; createdBy: string; changeDescription: string }[]> {
  const records = await prisma.ifcVersion.findMany({
    where: { projectId },
    orderBy: { versionNumber: "desc" },
  });
  return records.map((r) => {
    const data = r.data as Record<string, unknown>;
    return {
      version: r.versionNumber,
      createdAt: r.createdAt,
      createdBy: (data.createdBy as string) ?? "system",
      changeDescription: (data.changeDescription as string) ?? "Initial version",
    };
  });
}

export async function getVersionMetadata(
  projectId: string,
  version: number,
): Promise<{ version: number; createdAt: Date; createdBy: string; changeDescription: string }> {
  const record = await prisma.ifcVersion.findUnique({
    where: { projectId_versionNumber: { projectId, versionNumber: version } },
  });
  if (!record) throw new NotFoundError(`Version ${version} not found for file ${projectId}`);
  const data = record.data as Record<string, unknown>;
  return {
    version: record.versionNumber,
    createdAt: record.createdAt,
    createdBy: (data.createdBy as string) ?? "system",
    changeDescription: (data.changeDescription as string) ?? "Initial version",
  };
}

export async function restoreVersion(
  projectId: string,
  targetVersion: number,
  userId?: string,
): Promise<{ version: number; restoredFromVersion: number }> {
  const record = await prisma.ifcVersion.findUnique({
    where: { projectId_versionNumber: { projectId, versionNumber: targetVersion } },
  });
  if (!record) throw new NotFoundError(`Version ${targetVersion} not found for file ${projectId}`);

  const { versionNumber: currentVersion } = (await prisma.ifcVersion.findFirst({
    where: { projectId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  }))!;

  const newVersion = currentVersion + 1;
  await prisma.ifcVersion.create({
    data: {
      projectId,
      versionNumber: newVersion,
      data: {
        ...(record.data as Record<string, unknown>),
        changeDescription: `Restored from version ${targetVersion}`,
        createdBy: userId ?? "system",
        restoredFromVersion: targetVersion,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return { version: newVersion, restoredFromVersion: targetVersion };
}

// ─── Export Operations ────────────────────────────────────────────────────────

const SUPPORTED_FORMATS = ["ifc", "json", "xml", "cobie"];

export function validateExportFormat(format: string): void {
  if (!SUPPORTED_FORMATS.includes(format)) {
    throw new ValidationError(
      `Unsupported export format '${format}'; supported formats are: ${SUPPORTED_FORMATS.join(", ")}`,
    );
  }
}

export async function exportModel(
  projectId: string,
  format: string,
  globalIds?: string[],
  projectName?: string,
): Promise<{ contentType: string; filename: string; body: string | Buffer }> {
  const { model } = await loadModel(projectId);

  const filteredElements = globalIds
    ? model.elements.filter((e) => globalIds.includes(e.globalId))
    : model.elements;

  const baseName = projectName ? projectName.replace(/\.[^.]+$/, "") : projectId;

  switch (format) {
    case "ifc":
      return {
        contentType: "application/x-step",
        filename: `${baseName}.ifc`,
        body: generateStepFile(model, filteredElements),
      };
    case "json":
      return {
        contentType: "application/json",
        filename: `${baseName}.ifcjson`,
        body: JSON.stringify({
          type: "ifcJSON",
          version: "0.0.1",
          data: filteredElements,
        }),
      };
    case "xml":
      return {
        contentType: "application/xml",
        filename: `${baseName}.ifcxml`,
        body: generateXmlFile(model, filteredElements),
      };
    case "cobie":
      return {
        contentType: "application/zip",
        filename: `${baseName}-cobie.zip`,
        body: generateCobieZip(model),
      };
    default:
      throw new ValidationError(
        `Unsupported export format '${format}'; supported formats are: ifc, json, xml, cobie`,
      );
  }
}

export async function exportVersionSnapshot(
  projectId: string,
  version: number,
  projectName?: string,
): Promise<{ contentType: string; filename: string; body: string }> {
  const { model } = await loadModelAtVersion(projectId, version);
  const baseName = projectName ? projectName.replace(/\.[^.]+$/, "") : projectId;
  return {
    contentType: "application/x-step",
    filename: `${baseName}-v${version}.ifc`,
    body: generateStepFile(model, model.elements),
  };
}

function generateStepFile(model: IfcModelEntities, elements: IfcElementEntity[]): string {
  // ── ID allocator ────────────────────────────────────────────────────────────
  let nextId = 1;
  const alloc = () => nextId++;
  // Maps globalId → STEP entity ID for cross-referencing
  const refMap = new Map<string, number>();
  const lines: string[] = [];
  const emit = (id: number, line: string) => { lines.push(`#${id}= ${line}`); };
  const s = (v: string | undefined) => v ? `'${v.replace(/'/g, "''")}'` : "$";
  const r = (id: number | undefined) => id ? `#${id}` : "$";
  /** Format a number as a STEP REAL value (must always have a decimal point). */
  const f = (n: number) => Number.isInteger(n) ? `${n}.` : `${n}`;
  const iso = new Date().toISOString().slice(0, 10);

  // ── HEADER ──────────────────────────────────────────────────────────────────
  const header = [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');",
    `FILE_NAME('model.ifc','${iso}',(''),(''),'','IfcModelService','');`,
    "FILE_SCHEMA(('IFC4'));",
    "ENDSEC;",
    "DATA;",
  ];

  // ── Foundation entities ─────────────────────────────────────────────────────
  // #1 IFCPERSON, #2 IFCORGANIZATION, #3 IFCPERSONANDORGANIZATION, #4 IFCAPPLICATION, #5 IFCOWNERHISTORY
  const personId = alloc();
  emit(personId, "IFCPERSON($,$,'',$,$,$,$,$);");
  const orgId = alloc();
  emit(orgId, "IFCORGANIZATION($,'Model',$,$,$);");
  const personOrgId = alloc();
  emit(personOrgId, `IFCPERSONANDORGANIZATION(#${personId},#${orgId},$);`);
  const appId = alloc();
  emit(appId, `IFCAPPLICATION(#${orgId},'1.0','IfcModelService','IMS');`);
  const ownerHistId = alloc();
  emit(ownerHistId, `IFCOWNERHISTORY(#${personOrgId},#${appId},$,.NOCHANGE.,$,$,$,0);`);

  // ── World coordinate system (origin) ────────────────────────────────────────
  const originId = alloc();
  emit(originId, "IFCCARTESIANPOINT((0.,0.,0.));");
  const zAxisId = alloc();
  emit(zAxisId, "IFCDIRECTION((0.,0.,1.));");
  const xAxisId = alloc();
  emit(xAxisId, "IFCDIRECTION((1.,0.,0.));");
  const worldPlacementId = alloc();
  emit(worldPlacementId, `IFCAXIS2PLACEMENT3D(#${originId},#${zAxisId},#${xAxisId});`);
  const worldContextId = alloc();
  emit(worldContextId, `IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#${worldPlacementId},$);`);
  const bodySubCtxId = alloc();
  emit(bodySubCtxId, `IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,#${worldContextId},$,.MODEL_VIEW.,$);`);

  // ── Units ───────────────────────────────────────────────────────────────────
  const unitIds: number[] = [];
  const modelUnits = model.units ?? model.project?.units ?? [];
  if (modelUnits.length > 0) {
    for (const u of modelUnits) {
      const unitId = alloc();
      const typeName = u.unitType.startsWith(".") ? u.unitType : `.${u.unitType}.`;
      if (u.prefix) {
        const siName = u.name.startsWith(".") ? u.name : `.${u.name}.`;
        const pfx = u.prefix.startsWith(".") ? u.prefix : `.${u.prefix}.`;
        emit(unitId, `IFCSIUNIT(*,${typeName},${pfx},${siName});`);
      } else {
        const siName = u.name.startsWith(".") ? u.name : `.${u.name}.`;
        emit(unitId, `IFCSIUNIT(*,${typeName},$,${siName});`);
      }
      unitIds.push(unitId);
    }
  } else {
    // Default: millimetres, square metres, degrees
    const luId = alloc(); emit(luId, "IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);"); unitIds.push(luId);
    const auId = alloc(); emit(auId, "IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);"); unitIds.push(auId);
    const paId = alloc(); emit(paId, "IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.);"); unitIds.push(paId);
  }
  const unitAssignId = alloc();
  emit(unitAssignId, `IFCUNITASSIGNMENT((${unitIds.map(u => `#${u}`).join(",")}));`);

  // ── IFCPROJECT ──────────────────────────────────────────────────────────────
  const projectGid = model.project?.globalId ?? generateGlobalId();
  const projectName = model.project?.name ?? "Unnamed Project";
  const projectDesc = model.project?.description;
  const projectId = alloc();
  emit(projectId, `IFCPROJECT('${projectGid}',#${ownerHistId},${s(projectName)},${s(projectDesc)},$,$,$,(#${worldContextId}),#${unitAssignId});`);
  refMap.set(projectGid, projectId);

  // ── Helper: emit a local placement ──────────────────────────────────────────
  function emitPlacement(globalId: string, parentPlacementId?: number): number {
    const p = model.placements[globalId];
    if (p) {
      const ptId = alloc();
      emit(ptId, `IFCCARTESIANPOINT((${f(p.location.x)},${f(p.location.y)},${f(p.location.z)}));`);
      const axId = alloc();
      emit(axId, `IFCDIRECTION((${f(p.axis.x)},${f(p.axis.y)},${f(p.axis.z)}));`);
      const rdId = alloc();
      emit(rdId, `IFCDIRECTION((${f(p.refDirection.x)},${f(p.refDirection.y)},${f(p.refDirection.z)}));`);
      const a2pId = alloc();
      emit(a2pId, `IFCAXIS2PLACEMENT3D(#${ptId},#${axId},#${rdId});`);
      const lpId = alloc();
      emit(lpId, `IFCLOCALPLACEMENT(${r(parentPlacementId)},#${a2pId});`);
      return lpId;
    }
    // Default: identity placement relative to parent
    const lpId = alloc();
    emit(lpId, `IFCLOCALPLACEMENT(${r(parentPlacementId)},#${worldPlacementId});`);
    return lpId;
  }

  // Track geometry solid IDs per element for surface styling
  const elementGeometryItems = new Map<string, number[]>();

  // ── Helper: emit geometry for an entity ─────────────────────────────────────
  function emitGeometry(globalId: string): number | undefined {
    const geo = model.geometries[globalId];
    if (!geo || !geo.representations || geo.representations.length === 0) return undefined;
    const shapeRepIds: number[] = [];
    for (const rep of geo.representations) {
      const itemIds: number[] = [];
      for (const item of rep.items) {
        // Emit geometry items as STEP — handle SweptSolid (extruded area solid)
        const itemObj = item as Record<string, unknown>;
        if (rep.representationType === "SweptSolid" && itemObj.type === "IfcExtrudedAreaSolid") {
          const profileId = emitProfile(itemObj.profile as Record<string, unknown>);
          if (profileId) {
            const posId = emitAxis2(itemObj.position as Record<string, unknown> | undefined);
            const dirId = alloc();
            const dir = (itemObj.direction as Record<string, unknown>) ?? { x: 0, y: 0, z: 1 };
            emit(dirId, `IFCDIRECTION((${f(Number(dir.x ?? 0))},${f(Number(dir.y ?? 0))},${f(Number(dir.z ?? 1))}));`);
            const depth = (itemObj.depth as number) ?? 1;
            const easId = alloc();
            emit(easId, `IFCEXTRUDEDAREASOLID(#${profileId},${r(posId)},#${dirId},${f(depth)});`);
            itemIds.push(easId);
            // Track for surface styling
            if (!elementGeometryItems.has(globalId)) elementGeometryItems.set(globalId, []);
            elementGeometryItems.get(globalId)!.push(easId);
          }
        } else {
          // Generic fallback: emit as IFCFACETEDBREP proxy if possible, or skip
          // Unknown geometry types cannot be faithfully represented; skip
        }
      }
      if (itemIds.length > 0) {
        const srId = alloc();
        emit(srId, `IFCSHAPEREPRESENTATION(#${bodySubCtxId},${s("Body")},${s(rep.representationType)},(${itemIds.map(i => `#${i}`).join(",")}));`);
        shapeRepIds.push(srId);
      }
    }
    if (shapeRepIds.length === 0) return undefined;
    const pdsId = alloc();
    emit(pdsId, `IFCPRODUCTDEFINITIONSHAPE($,$,(${shapeRepIds.map(i => `#${i}`).join(",")}));`);
    return pdsId;
  }

  function emitProfile(profile: Record<string, unknown> | undefined): number | undefined {
    if (!profile) return undefined;
    const pType = profile.type as string;
    if (pType === "IfcRectangleProfileDef") {
      const xd = (profile.xDim as number) ?? 0;
      const yd = (profile.yDim as number) ?? 0;
      const profId = alloc();
      emit(profId, `IFCRECTANGLEPROFILEDEF(.AREA.,$,$,${f(xd)},${f(yd)});`);
      return profId;
    }
    if (pType === "IfcArbitraryClosedProfileDef") {
      const pts = (profile.outerCurve as Record<string, unknown>[]) ?? [];
      if (pts.length >= 3) {
        const ptIds: number[] = [];
        for (const pt of pts) {
          const cpId = alloc();
          emit(cpId, `IFCCARTESIANPOINT((${f(Number(pt.x ?? 0))},${f(Number(pt.y ?? 0))}));`);
          ptIds.push(cpId);
        }
        const polyId = alloc();
        emit(polyId, `IFCPOLYLINE((${ptIds.map(i => `#${i}`).join(",")}));`);
        const profId = alloc();
        emit(profId, `IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,#${polyId});`);
        return profId;
      }
    }
    return undefined;
  }

  function emitAxis2(pos: Record<string, unknown> | undefined): number | undefined {
    if (!pos) return undefined;
    const loc = pos.location as Record<string, unknown> | undefined;
    if (!loc) return undefined;
    const ptId = alloc();
    emit(ptId, `IFCCARTESIANPOINT((${f(Number(loc.x ?? 0))},${f(Number(loc.y ?? 0))},${f(Number(loc.z ?? 0))}));`);
    const a2Id = alloc();
    emit(a2Id, `IFCAXIS2PLACEMENT3D(#${ptId},$,$);`);
    return a2Id;
  }

  // ── Spatial hierarchy ───────────────────────────────────────────────────────
  const sitePlacementIds = new Map<string, number>();
  const buildingPlacementIds = new Map<string, number>();
  const storeyPlacementIds = new Map<string, number>();

  // Sites
  for (const site of model.sites) {
    const plId = emitPlacement(site.globalId);
    sitePlacementIds.set(site.globalId, plId);
    const sId = alloc();
    emit(sId, `IFCSITE('${site.globalId}',#${ownerHistId},${s(site.name)},${s(site.description)},$,#${plId},$,$,.ELEMENT.,$,$,$,$,$);`);
    refMap.set(site.globalId, sId);
  }

  // Buildings
  for (const bldg of model.buildings) {
    // Find parent site for placement
    const parentSite = model.sites.find(st => st.buildings.includes(bldg.globalId));
    const parentPl = parentSite ? sitePlacementIds.get(parentSite.globalId) : undefined;
    const plId = emitPlacement(bldg.globalId, parentPl);
    buildingPlacementIds.set(bldg.globalId, plId);
    const bId = alloc();
    emit(bId, `IFCBUILDING('${bldg.globalId}',#${ownerHistId},${s(bldg.name)},${s(bldg.description)},$,#${plId},$,$,.ELEMENT.,$,$,$);`);
    refMap.set(bldg.globalId, bId);
  }

  // Storeys
  for (const storey of model.storeys) {
    const parentBldg = model.buildings.find(b => b.storeys.includes(storey.globalId));
    const parentPl = parentBldg ? buildingPlacementIds.get(parentBldg.globalId) : undefined;
    const plId = emitPlacement(storey.globalId, parentPl);
    storeyPlacementIds.set(storey.globalId, plId);
    const stId = alloc();
    emit(stId, `IFCBUILDINGSTOREY('${storey.globalId}',#${ownerHistId},${s(storey.name)},${s(storey.description)},$,#${plId},$,$,.ELEMENT.,${f(storey.elevation)});`);
    refMap.set(storey.globalId, stId);
  }

  // Spaces
  for (const space of model.spaces) {
    const parentPl = storeyPlacementIds.get(space.storeyGlobalId);
    const plId = emitPlacement(space.globalId, parentPl);
    const spId = alloc();
    emit(spId, `IFCSPACE('${space.globalId}',#${ownerHistId},${s(space.name)},${s(space.description)},$,#${plId},$,${s(space.longName)},.ELEMENT.,$);`);
    refMap.set(space.globalId, spId);
  }

  // ── IFCRELAGGREGATES: project→sites, sites→buildings, buildings→storeys ────
  if (model.sites.length > 0) {
    const relId = alloc();
    const siteRefs = model.sites.map(st => `#${refMap.get(st.globalId)}`).join(",");
    emit(relId, `IFCRELAGGREGATES('${generateGlobalId()}',#${ownerHistId},$,$,#${projectId},(${siteRefs}));`);
  }
  for (const site of model.sites) {
    const childBldgs = model.buildings.filter(b => site.buildings.includes(b.globalId));
    if (childBldgs.length > 0) {
      const relId = alloc();
      const bldgRefs = childBldgs.map(b => `#${refMap.get(b.globalId)}`).join(",");
      emit(relId, `IFCRELAGGREGATES('${generateGlobalId()}',#${ownerHistId},$,$,#${refMap.get(site.globalId)},(${bldgRefs}));`);
    }
  }
  for (const bldg of model.buildings) {
    const childStoreys = model.storeys.filter(st => bldg.storeys.includes(st.globalId));
    if (childStoreys.length > 0) {
      const relId = alloc();
      const stRefs = childStoreys.map(st => `#${refMap.get(st.globalId)}`).join(",");
      emit(relId, `IFCRELAGGREGATES('${generateGlobalId()}',#${ownerHistId},$,$,#${refMap.get(bldg.globalId)},(${stRefs}));`);
    }
  }
  // Storeys→spaces
  for (const storey of model.storeys) {
    const childSpaces = model.spaces.filter(sp => sp.storeyGlobalId === storey.globalId);
    if (childSpaces.length > 0) {
      const relId = alloc();
      const spRefs = childSpaces.map(sp => `#${refMap.get(sp.globalId)}`).join(",");
      emit(relId, `IFCRELAGGREGATES('${generateGlobalId()}',#${ownerHistId},$,$,#${refMap.get(storey.globalId)},(${spRefs}));`);
    }
  }

  // ── Elements ────────────────────────────────────────────────────────────────
  // IFC4 element types have varying attribute counts.
  // Types with only the 8 base IfcElement attributes (no PredefinedType):
  const NO_PREDEFINED_TYPE = new Set(["IfcFurnishingElement", "IfcBuildingElementProxy", "IfcOpeningElement"]);
  const elementGlobalIds = new Set(elements.map(e => e.globalId));
  for (const el of elements) {
    const parentPl = storeyPlacementIds.get(el.storeyGlobalId);
    const plId = emitPlacement(el.globalId, parentPl);
    const geoId = emitGeometry(el.globalId);
    const predType = el.predefinedType ? `.${el.predefinedType}.` : "$";
    const elId = alloc();
    const base = `'${el.globalId}',#${ownerHistId},${s(el.name)},${s(el.description)},$,#${plId},${r(geoId)},$`;
    // IFC4 IfcDoor/IfcWindow have 13 attributes (extra: OverallHeight,
    // OverallWidth, PredefinedType, OperationType/PartitioningType,
    // UserDefinedOperationType/UserDefinedPartitionType).
    // IfcStairFlight has 13 (extra: NumberOfRisers, NumberOfTreads,
    // RiserHeight, TreadLength, PredefinedType).
    if (el.ifcType === "IfcDoor" || el.ifcType === "IfcWindow") {
      emit(elId, `${el.ifcType.toUpperCase()}(${base},$,$,${predType},$,$);`);
    } else if (el.ifcType === "IfcStairFlight") {
      emit(elId, `IFCSTAIRFLIGHT(${base},$,$,$,$,${predType});`);
    } else if (NO_PREDEFINED_TYPE.has(el.ifcType)) {
      emit(elId, `${el.ifcType.toUpperCase()}(${base});`);
    } else {
      emit(elId, `${el.ifcType.toUpperCase()}(${base},${predType});`);
    }
    refMap.set(el.globalId, elId);
  }

  // ── IFCRELCONTAINEDINSPATIALSTRUCTURE: storeys→elements ─────────────────────
  for (const storey of model.storeys) {
    const contained = elements.filter(e => e.storeyGlobalId === storey.globalId);
    if (contained.length > 0) {
      const relId = alloc();
      const elRefs = contained.map(e => `#${refMap.get(e.globalId)}`).join(",");
      emit(relId, `IFCRELCONTAINEDINSPATIALSTRUCTURE('${generateGlobalId()}',#${ownerHistId},$,$,(${elRefs}),#${refMap.get(storey.globalId)});`);
    }
  }

  // ── Openings ────────────────────────────────────────────────────────────────
  for (const opening of model.openings) {
    if (!refMap.has(opening.hostElementGlobalId)) continue;
    const hostEl = elements.find(e => e.globalId === opening.hostElementGlobalId);
    const hostPl = storeyPlacementIds.get(hostEl?.storeyGlobalId ?? "");
    const wallP = model.placements[opening.hostElementGlobalId];

    // Opening placement – inherit host wall's orientation so local X = along
    // wall face, local Y = through wall, local Z = vertical
    const opPtId = alloc();
    emit(opPtId, `IFCCARTESIANPOINT((${f(opening.placement.x)},${f(opening.placement.y)},${f(opening.placement.z)}));`);
    let opA2Id: number;
    if (wallP) {
      const oAxId = alloc();
      emit(oAxId, `IFCDIRECTION((${f(wallP.axis.x)},${f(wallP.axis.y)},${f(wallP.axis.z)}));`);
      const oRdId = alloc();
      emit(oRdId, `IFCDIRECTION((${f(wallP.refDirection.x)},${f(wallP.refDirection.y)},${f(wallP.refDirection.z)}));`);
      opA2Id = alloc();
      emit(opA2Id, `IFCAXIS2PLACEMENT3D(#${opPtId},#${oAxId},#${oRdId});`);
    } else {
      opA2Id = alloc();
      emit(opA2Id, `IFCAXIS2PLACEMENT3D(#${opPtId},$,$);`);
    }
    const opPlId = alloc();
    emit(opPlId, `IFCLOCALPLACEMENT(${r(hostPl)},#${opA2Id});`);

    // Opening geometry: profile in local XY (width × through-wall depth),
    // extruded vertically along local Z for the opening height
    const opRPtId = alloc();
    emit(opRPtId, `IFCRECTANGLEPROFILEDEF(.AREA.,$,$,${f(opening.dimensions.width)},${f(400)});`);
    const opDirId = alloc();
    emit(opDirId, "IFCDIRECTION((0.,0.,1.));");
    const opEasId = alloc();
    emit(opEasId, `IFCEXTRUDEDAREASOLID(#${opRPtId},$,#${opDirId},${f(opening.dimensions.height)});`);
    const opSrId = alloc();
    emit(opSrId, `IFCSHAPEREPRESENTATION(#${bodySubCtxId},'Body','SweptSolid',(#${opEasId}));`);
    const opPdsId = alloc();
    emit(opPdsId, `IFCPRODUCTDEFINITIONSHAPE($,$,(#${opSrId}));`);
    const opId = alloc();
    emit(opId, `IFCOPENINGELEMENT('${opening.globalId}',#${ownerHistId},${s(opening.name)},$,$,#${opPlId},#${opPdsId},$);`);
    refMap.set(opening.globalId, opId);
    // IfcRelVoidsElement
    const rvId = alloc();
    emit(rvId, `IFCRELVOIDSELEMENT('${generateGlobalId()}',#${ownerHistId},$,$,#${refMap.get(opening.hostElementGlobalId)},#${opId});`);
    // IfcRelFillsElement
    if (opening.fillingGlobalId && refMap.has(opening.fillingGlobalId)) {
      const rfId = alloc();
      emit(rfId, `IFCRELFILLSELEMENT('${generateGlobalId()}',#${ownerHistId},$,$,#${opId},#${refMap.get(opening.fillingGlobalId)});`);
    }
  }

  // ── Materials ───────────────────────────────────────────────────────────────
  const materialIdMap = new Map<string, number>(); // materialId → STEP ID
  for (const mat of model.materials) {
    const mId = alloc();
    emit(mId, `IFCMATERIAL(${s(mat.name)},${s(mat.category)},$);`);
    materialIdMap.set(mat.materialId, mId);
    // Also map by name for layer references
    materialIdMap.set(`name:${mat.name}`, mId);
  }

  // Material assignments → IfcRelAssociatesMaterial
  for (const ma of model.materialAssignments) {
    if (!refMap.has(ma.elementGlobalId) || !elementGlobalIds.has(ma.elementGlobalId)) continue;
    let matUsageId: number | undefined;
    if (ma.assignmentType === "IfcMaterialLayerSetUsage" && ma.layers && ma.layers.length > 0) {
      const layerIds: number[] = [];
      for (const layer of ma.layers) {
        // Ensure the material entity exists
        let matStepId = materialIdMap.get(`name:${layer.materialName}`);
        if (!matStepId) {
          matStepId = alloc();
          emit(matStepId, `IFCMATERIAL(${s(layer.materialName)},$,$);`);
          materialIdMap.set(`name:${layer.materialName}`, matStepId);
        }
        const mlId = alloc();
        emit(mlId, `IFCMATERIALLAYER(#${matStepId},${f(layer.thickness)},$,$,$,$,$);`);
        layerIds.push(mlId);
      }
      const lsId = alloc();
      emit(lsId, `IFCMATERIALLAYERSET((${layerIds.map(i => `#${i}`).join(",")}),$,$);`);
      const lsuId = alloc();
      emit(lsuId, `IFCMATERIALLAYERSETUSAGE(#${lsId},.AXIS2.,.POSITIVE.,0.);`);
      matUsageId = lsuId;
    } else if (ma.materialId) {
      matUsageId = materialIdMap.get(ma.materialId) ?? materialIdMap.get(`name:${ma.name ?? ""}`);
    }
    if (matUsageId) {
      const relId = alloc();
      emit(relId, `IFCRELASSOCIATESMATERIAL('${generateGlobalId()}',#${ownerHistId},$,$,(#${refMap.get(ma.elementGlobalId)}),#${matUsageId});`);
    }
  }

  // ── Surface styles (material colours) ───────────────────────────────────────
  const materialColours: Record<string, [number, number, number]> = {
    "Brick": [0.72, 0.33, 0.18],
    "Insulation Board": [0.95, 0.95, 0.1],
    "Plasterboard": [0.92, 0.92, 0.88],
    "Timber Frame": [0.76, 0.6, 0.35],
    "Timber Flooring": [0.65, 0.45, 0.22],
    "Concrete": [0.7, 0.7, 0.7],
    "Ceramic": [0.95, 0.95, 0.95],
    "Stainless Steel": [0.78, 0.78, 0.8],
    "Granite": [0.35, 0.33, 0.32],
  };
  const materialStyleMap = new Map<string, number>();
  for (const mat of model.materials) {
    const rgb = materialColours[mat.name];
    if (!rgb) continue;
    const colId = alloc();
    emit(colId, `IFCCOLOURRGB($,${f(rgb[0])},${f(rgb[1])},${f(rgb[2])});`);
    const rendId = alloc();
    emit(rendId, `IFCSURFACESTYLERENDERING(#${colId},0.,$,$,$,$,$,$,.FLAT.);`);
    const ssId = alloc();
    emit(ssId, `IFCSURFACESTYLE(${s(mat.name)},.BOTH.,(#${rendId}));`);
    materialStyleMap.set(mat.name, ssId);
  }
  // Apply styles to element geometry items via IfcStyledItem
  for (const ma of model.materialAssignments) {
    const items = elementGeometryItems.get(ma.elementGlobalId);
    if (!items) continue;
    let primaryMaterialName: string | undefined;
    if (ma.assignmentType === "IfcMaterialLayerSetUsage" && ma.layers && ma.layers.length > 0) {
      primaryMaterialName = ma.layers[0].materialName;
    } else if (ma.name) {
      primaryMaterialName = ma.name;
    }
    if (!primaryMaterialName || !materialStyleMap.has(primaryMaterialName)) continue;
    const styleId = materialStyleMap.get(primaryMaterialName)!;
    for (const itemId of items) {
      const styledId = alloc();
      emit(styledId, `IFCSTYLEDITEM(#${itemId},(#${styleId}),$);`);
    }
  }

  // ── Property sets ───────────────────────────────────────────────────────────
  for (const ps of model.propertySets) {
    if (!refMap.has(ps.elementGlobalId) || !elementGlobalIds.has(ps.elementGlobalId)) continue;
    const propIds: number[] = [];
    for (const prop of ps.properties) {
      const pId = alloc();
      const val = typeof prop.value === "boolean"
        ? (prop.value ? ".TRUE." : ".FALSE.")
        : typeof prop.value === "number"
          ? f(prop.value)
          : s(String(prop.value));
      const wrappedVal = typeof prop.value === "boolean"
        ? `IFCBOOLEAN(${val})`
        : typeof prop.value === "number"
          ? `IFCREAL(${val})`
          : `IFCLABEL(${val})`;
      emit(pId, `IFCPROPERTYSINGLEVALUE(${s(prop.name)},$,${wrappedVal},$);`);
      propIds.push(pId);
    }
    const psId = alloc();
    emit(psId, `IFCPROPERTYSET('${ps.globalId}',#${ownerHistId},${s(ps.name)},$,(${propIds.map(i => `#${i}`).join(",")}));`);
    const relId = alloc();
    emit(relId, `IFCRELDEFINESBYPROPERTIES('${generateGlobalId()}',#${ownerHistId},$,$,(#${refMap.get(ps.elementGlobalId)}),#${psId});`);
  }

  // ── Classifications ─────────────────────────────────────────────────────────
  const classSystemMap = new Map<string, number>(); // systemId → STEP ID
  for (const cs of model.classifications) {
    const csId = alloc();
    emit(csId, `IFCCLASSIFICATION(${s(cs.source)},$,$,${s(cs.name)},$,${s(cs.edition)},$);`);
    classSystemMap.set(cs.systemId, csId);
  }
  for (const cr of model.classificationReferences) {
    if (!refMap.has(cr.elementGlobalId) || !elementGlobalIds.has(cr.elementGlobalId)) continue;
    const sysStepId = classSystemMap.get(cr.systemId);
    if (!sysStepId) continue;
    const crId = alloc();
    emit(crId, `IFCCLASSIFICATIONREFERENCE($,${s(cr.notation)},${s(cr.name)},#${sysStepId},$,$);`);
    const relId = alloc();
    emit(relId, `IFCRELASSOCIATESCLASSIFICATION('${generateGlobalId()}',#${ownerHistId},$,$,(#${refMap.get(cr.elementGlobalId)}),#${crId});`);
  }

  // ── Assemble final output ───────────────────────────────────────────────────
  return [...header, ...lines, "ENDSEC;", "END-ISO-10303-21;"].join("\n");
}

function generateXmlFile(model: IfcModelEntities, elements: IfcElementEntity[]): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ex:iso_10303_28 xmlns:ex="urn:iso.org:standard:10303:part(28):version(2):xmlschema:common">',
  ];
  for (const element of elements) {
    lines.push(`  <${element.ifcType} GlobalId="${element.globalId}" Name="${element.name}"/>`);
  }
  lines.push("</ex:iso_10303_28>");
  return lines.join("\n");
}

function generateCobieZip(model: IfcModelEntities): Buffer {
  // Build a minimal ZIP archive containing COBie CSV files
  const csvFiles: Record<string, string> = {
    "Contact.csv": "Email,Company,Phone\n",
    "Facility.csv": "Name,Description\n" + (model.buildings[0]?.name ?? "Facility") + ",\n",
    "Floor.csv": "Name,Elevation\n" + model.storeys.map((s) => `${s.name},${s.elevation}`).join("\n") + "\n",
    "Space.csv": "Name,FloorName\n" + model.spaces.map((s) => {
      const storey = model.storeys.find((st) => st.globalId === s.storeyGlobalId);
      return `${s.name},${storey?.name ?? ""}`;
    }).join("\n") + "\n",
    "Component.csv": "Name,Type\n" + model.elements.map((e) => `${e.name},${e.ifcType}`).join("\n") + "\n",
  };

  // Build ZIP file structure (no compression — STORED method)
  const entries: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(csvFiles)) {
    const nameBytes = Buffer.from(name, "utf8");
    const contentBytes = Buffer.from(content, "utf8");

    // Local file header (30 + name + content)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // general purpose flag
    localHeader.writeUInt16LE(0, 8); // compression method: STORED
    localHeader.writeUInt16LE(0, 10); // last mod time
    localHeader.writeUInt16LE(0, 12); // last mod date
    localHeader.writeUInt32LE(0, 14); // crc-32 (skip for simplicity)
    localHeader.writeUInt32LE(contentBytes.length, 18); // compressed size
    localHeader.writeUInt32LE(contentBytes.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBytes.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length

    const localEntry = Buffer.concat([localHeader, nameBytes, contentBytes]);

    // Central directory entry (46 + name)
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // central directory signature
    cdHeader.writeUInt16LE(20, 4); // version made by
    cdHeader.writeUInt16LE(20, 6); // version needed
    cdHeader.writeUInt16LE(0, 8); // general purpose flag
    cdHeader.writeUInt16LE(0, 10); // compression method: STORED
    cdHeader.writeUInt16LE(0, 12); // last mod time
    cdHeader.writeUInt16LE(0, 14); // last mod date
    cdHeader.writeUInt32LE(0, 16); // crc-32
    cdHeader.writeUInt32LE(contentBytes.length, 20); // compressed size
    cdHeader.writeUInt32LE(contentBytes.length, 24); // uncompressed size
    cdHeader.writeUInt16LE(nameBytes.length, 28); // file name length
    cdHeader.writeUInt16LE(0, 30); // extra field length
    cdHeader.writeUInt16LE(0, 32); // file comment length
    cdHeader.writeUInt16LE(0, 34); // disk number start
    cdHeader.writeUInt16LE(0, 36); // internal file attributes
    cdHeader.writeUInt32LE(0, 38); // external file attributes
    cdHeader.writeUInt32LE(offset, 42); // relative offset of local header

    centralDirectory.push(Buffer.concat([cdHeader, nameBytes]));
    entries.push(localEntry);
    offset += localEntry.length;
  }

  const cdData = Buffer.concat(centralDirectory);

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk of central directory
  eocd.writeUInt16LE(Object.keys(csvFiles).length, 8); // entries on this disk
  eocd.writeUInt16LE(Object.keys(csvFiles).length, 10); // total entries
  eocd.writeUInt32LE(cdData.length, 12); // size of central directory
  eocd.writeUInt32LE(offset, 16); // offset of central directory
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...entries, cdData, eocd]);
}

// ─── File Management Operations ───────────────────────────────────────────────

export async function getFileMetadata(
  projectId: string,
): Promise<{ fileId: string; name: string; schema: string; createdAt: Date; elementCount: number; currentVersion: number }> {
  const { model, versionNumber } = await loadModel(projectId);
  const project = await prisma.ifcProject.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError("IFC file not found");
  return {
    fileId: projectId,
    name: project.name,
    schema: "IFC4",
    createdAt: project.createdAt,
    elementCount: model.elements.length,
    currentVersion: versionNumber,
  };
}

export async function downloadFile(
  projectId: string,
): Promise<{ contentType: string; body: string }> {
  const { model } = await loadModel(projectId);
  return {
    contentType: "application/x-step",
    body: generateStepFile(model, model.elements),
  };
}

// ─── Seed Model Data ──────────────────────────────────────────────────────────

/** Seed model data for testing — adds structured IFC data to a project's latest version. */
/** Upsert items into an array by key — replaces existing entries with matching key. */
function upsertArray<T extends Record<string, unknown>>(arr: T[], incoming: T[], key: string): void {
  for (const item of incoming) {
    const idx = arr.findIndex((e) => e[key] === item[key]);
    if (idx >= 0) {
      arr[idx] = item;
    } else {
      arr.push(item);
    }
  }
}

export async function seedModelData(
  projectId: string,
  data: Partial<IfcModelEntities>,
  replace = false,
): Promise<number> {
  const { model, versionNumber } = await loadModel(projectId);
  if (data.project) model.project = data.project;
  if (data.units) {
    if (replace) model.units = data.units; else model.units = data.units;
  }
  if (data.sites) {
    if (replace) model.sites = data.sites; else upsertArray(model.sites as Record<string, unknown>[], data.sites as Record<string, unknown>[], "globalId");
  }
  if (data.buildings) {
    if (replace) model.buildings = data.buildings; else upsertArray(model.buildings as Record<string, unknown>[], data.buildings as Record<string, unknown>[], "globalId");
  }
  if (data.storeys) {
    if (replace) model.storeys = data.storeys; else upsertArray(model.storeys as Record<string, unknown>[], data.storeys as Record<string, unknown>[], "globalId");
  }
  if (data.spaces) {
    if (replace) model.spaces = data.spaces; else upsertArray(model.spaces as Record<string, unknown>[], data.spaces as Record<string, unknown>[], "globalId");
  }
  if (data.elements) {
    if (replace) model.elements = data.elements; else upsertArray(model.elements as Record<string, unknown>[], data.elements as Record<string, unknown>[], "globalId");
  }
  if (data.propertySets) {
    if (replace) model.propertySets = data.propertySets; else upsertArray(model.propertySets as Record<string, unknown>[], data.propertySets as Record<string, unknown>[], "globalId");
  }
  if (data.quantitySets) {
    if (replace) model.quantitySets = data.quantitySets; else upsertArray(model.quantitySets as Record<string, unknown>[], data.quantitySets as Record<string, unknown>[], "globalId");
  }
  if (data.materials) {
    if (replace) model.materials = data.materials; else upsertArray(model.materials as Record<string, unknown>[], data.materials as Record<string, unknown>[], "materialId");
  }
  if (data.materialAssignments) {
    if (replace) model.materialAssignments = data.materialAssignments; else model.materialAssignments.push(...data.materialAssignments);
  }
  if (data.placements) Object.assign(model.placements, data.placements);
  if (data.geometries) Object.assign(model.geometries, data.geometries);
  if (data.coordinateReferenceSystem) model.coordinateReferenceSystem = data.coordinateReferenceSystem;
  if (data.classifications) {
    if (replace) model.classifications = data.classifications; else model.classifications.push(...data.classifications);
  }
  if (data.classificationReferences) {
    if (replace) model.classificationReferences = data.classificationReferences; else model.classificationReferences.push(...data.classificationReferences);
  }
  if (data.typeDefinitions) {
    if (replace) model.typeDefinitions = data.typeDefinitions; else upsertArray(model.typeDefinitions as Record<string, unknown>[], data.typeDefinitions as Record<string, unknown>[], "globalId");
  }
  if (data.typeAssignments) {
    if (replace) model.typeAssignments = data.typeAssignments; else model.typeAssignments.push(...data.typeAssignments);
  }
  if (data.groups) {
    if (replace) model.groups = data.groups; else upsertArray(model.groups as Record<string, unknown>[], data.groups as Record<string, unknown>[], "globalId");
  }
  if (data.systems) {
    if (replace) model.systems = data.systems; else upsertArray(model.systems as Record<string, unknown>[], data.systems as Record<string, unknown>[], "globalId");
  }
  if (data.openings) {
    if (replace) model.openings = data.openings; else upsertArray(model.openings as Record<string, unknown>[], data.openings as Record<string, unknown>[], "globalId");
  }
  if (data.ports) {
    if (replace) model.ports = data.ports; else upsertArray(model.ports as Record<string, unknown>[], data.ports as Record<string, unknown>[], "portId");
  }
  if (data.connections) {
    if (replace) model.connections = data.connections; else upsertArray(model.connections as Record<string, unknown>[], data.connections as Record<string, unknown>[], "connectionId");
  }
  return saveModel(projectId, versionNumber, model, "Seed test data");
}
