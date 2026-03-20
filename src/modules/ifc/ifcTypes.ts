// IFC domain types

export interface IfcProject {
  id: string;
  profileId: string;
  name: string;
  description: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IfcVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  data: IfcModelData;
  createdAt: Date;
}

/** The IFC-JSON object stored in the ifc_version.data JSONB column. */
export interface IfcModelData {
  type: string;
  version: string;
  data: unknown[];
}

export interface ProjectWithVersion {
  project: IfcProject;
  currentIfcVersion: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}
