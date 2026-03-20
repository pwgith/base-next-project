/**
 * IFC model domain types.
 * Defines the shape of entities stored in ifc_version.data (IFC-JSON format).
 */

// ─── IFC GlobalId ─────────────────────────────────────────────────────────────

/** Generates a 22-character IFC GlobalId (base64-encoded UUID). */
export function generateGlobalId(): string {
  const chars =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
  let result = "";
  for (let i = 0; i < 22; i++) {
    result += chars[Math.floor(Math.random() * 64)];
  }
  return result;
}

// ─── Base Entity ──────────────────────────────────────────────────────────────

export interface IfcEntity {
  ifcType: string;
  globalId: string;
  name: string;
  description?: string;
}

// ─── Spatial Structure ────────────────────────────────────────────────────────

export interface IfcUnitAssignment {
  unitType: string;
  name: string;
  prefix?: string;
}

export interface IfcProjectEntity extends IfcEntity {
  ifcType: "IfcProject";
  phase?: string;
  trueNorth?: { x: number; y: number };
  units?: IfcUnitAssignment[];
}

export interface IfcSiteEntity extends IfcEntity {
  ifcType: "IfcSite";
  buildings: string[]; // globalIds of child buildings
}

export interface IfcBuildingEntity extends IfcEntity {
  ifcType: "IfcBuilding";
  storeys: string[]; // globalIds of child storeys
}

export interface IfcBuildingStoreyEntity extends IfcEntity {
  ifcType: "IfcBuildingStorey";
  elevation: number;
  spaces: string[]; // globalIds of child spaces
  elements: string[]; // globalIds of contained elements
}

export interface IfcSpaceEntity extends IfcEntity {
  ifcType: "IfcSpace";
  longName?: string;
  storeyGlobalId: string;
}

// ─── Building Elements ────────────────────────────────────────────────────────

export type IfcElementType =
  | "IfcWall"
  | "IfcSlab"
  | "IfcColumn"
  | "IfcBeam"
  | "IfcDoor"
  | "IfcWindow"
  | "IfcStair"
  | "IfcDuctSegment"
  | "IfcAirTerminal"
  | "IfcPipeSegment"
  | "IfcLightFixture"
  | "IfcElectricAppliance";

export type MepCategory = "MEP";

export const MEP_TYPES: Set<string> = new Set([
  "IfcDuctSegment",
  "IfcAirTerminal",
  "IfcPipeSegment",
  "IfcLightFixture",
  "IfcElectricAppliance",
]);

export interface IfcElementEntity extends IfcEntity {
  predefinedType?: string;
  storeyGlobalId: string;
  hostGlobalId?: string;
}

// ─── Property Sets ────────────────────────────────────────────────────────────

export interface IfcProperty {
  name: string;
  type: string;
  value: unknown;
}

export interface IfcPropertySet {
  name: string;
  globalId: string;
  properties: IfcProperty[];
  elementGlobalId: string;
}

// ─── Quantity Sets ────────────────────────────────────────────────────────────

export interface IfcQuantity {
  name: string;
  value: number;
}

export interface IfcQuantitySet {
  name: string;
  globalId: string;
  quantities: IfcQuantity[];
  elementGlobalId: string;
}

// ─── Materials ────────────────────────────────────────────────────────────────

export interface IfcMaterial {
  materialId: string;
  name: string;
  category?: string;
}

export interface IfcMaterialLayer {
  materialName: string;
  thickness: number;
}

export interface IfcMaterialConstituent {
  materialName: string;
  name: string;
  fraction?: number;
  category?: string;
}

export interface IfcMaterialProfile {
  materialName: string;
  name: string;
  profile: { type: string; [key: string]: unknown };
}

export interface IfcMaterialAssignment {
  assignmentType: "IfcMaterial" | "IfcMaterialLayerSetUsage" | "IfcMaterialConstituentSet" | "IfcMaterialProfileSet";
  materialId?: string;
  name?: string;
  layers?: IfcMaterialLayer[];
  constituents?: IfcMaterialConstituent[];
  profiles?: IfcMaterialProfile[];
  elementGlobalId: string;
}

// ─── Geometry & Placement ─────────────────────────────────────────────────────

export interface IfcPoint3D {
  x: number;
  y: number;
  z: number;
}

export interface IfcPlacement {
  location: IfcPoint3D;
  axis: IfcPoint3D;
  refDirection: IfcPoint3D;
}

export interface IfcGeometryItem {
  representationType: string;
  items: unknown[];
}

export interface IfcGeometryRepresentation {
  representations: IfcGeometryItem[];
}

export interface IfcCoordinateReferenceSystem {
  name: string;
  eastings: number;
  northings: number;
  orthogonalHeight: number;
  xAxisAbscissa: number;
  xAxisOrdinate: number;
}

// ─── Classification ───────────────────────────────────────────────────────────

export interface IfcClassificationSystem {
  systemId: string;
  name: string;
  source?: string;
  edition?: string;
  editionDate?: string;
}

export interface IfcClassificationReference {
  referenceId: string;
  systemId: string;
  notation: string;
  name: string;
  elementGlobalId: string;
}

// ─── Relationships ────────────────────────────────────────────────────────────

export interface IfcTypeDefinition extends IfcEntity {
  // e.g. IfcWallType, IfcSlabType
}

export interface IfcTypeAssignment {
  elementGlobalId: string;
  typeGlobalId: string;
}

export interface IfcGroup extends IfcEntity {
  ifcType: "IfcGroup";
  members: string[]; // globalIds
}

export interface IfcSystem extends IfcEntity {
  ifcType: "IfcSystem";
  predefinedType?: string;
  members: string[]; // globalIds
}

// ─── Full Model Data ──────────────────────────────────────────────────────────

export interface IfcOpeningElement {
  globalId: string;
  name: string;
  ifcType: "IfcOpeningElement";
  hostElementGlobalId: string;
  placement: { x: number; y: number; z: number };
  dimensions: { width: number; height: number };
  fillingGlobalId?: string;
}

export interface IfcDistributionPort {
  portId: string;
  name: string;
  ifcType: "IfcDistributionPort";
  elementGlobalId: string;
  flowDirection: string;
  systemType?: string;
}

export interface IfcPortConnection {
  connectionId: string;
  relatingElementGlobalId: string;
  relatedElementGlobalId: string;
  sourcePortId?: string;
  targetPortId?: string;
}

export interface IfcModelEntities {
  project?: IfcProjectEntity;
  sites: IfcSiteEntity[];
  buildings: IfcBuildingEntity[];
  storeys: IfcBuildingStoreyEntity[];
  spaces: IfcSpaceEntity[];
  elements: IfcElementEntity[];
  propertySets: IfcPropertySet[];
  quantitySets: IfcQuantitySet[];
  materials: IfcMaterial[];
  materialAssignments: IfcMaterialAssignment[];
  placements: Record<string, IfcPlacement>;
  geometries: Record<string, IfcGeometryRepresentation>;
  coordinateReferenceSystem?: IfcCoordinateReferenceSystem;
  classifications: IfcClassificationSystem[];
  classificationReferences: IfcClassificationReference[];
  typeDefinitions: IfcTypeDefinition[];
  typeAssignments: IfcTypeAssignment[];
  groups: IfcGroup[];
  systems: IfcSystem[];
  openings: IfcOpeningElement[];
  ports: IfcDistributionPort[];
  connections: IfcPortConnection[];
  units?: IfcUnitAssignment[];
}
