/**
 * Project application service.
 * Orchestrates validation → domain → repository for IFC project operations.
 */

import {
  ValidationError,
  NotFoundError,
  DomainError,
  ForbiddenError,
} from "@/lib/errors";
import { profileRepository } from "@/modules/profile/profileRepository";
import { projectRepository } from "./projectRepository";
import { ifcVersionRepository } from "./ifcVersionRepository";
import { sanitiseName, sanitiseDescription, validateName } from "./projectDomain";
import type {
  IfcProject,
  ProjectWithVersion,
  CreateProjectInput,
  UpdateProjectInput,
} from "./ifcTypes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveProfileId(supabaseUserId: string): Promise<string> {
  const profile =
    await profileRepository.findBySupabaseUserId(supabaseUserId);
  if (!profile) {
    throw new NotFoundError("Profile not found.");
  }
  return profile.id;
}

function assertOwnership(project: IfcProject, profileId: string): void {
  if (project.profileId !== profileId) {
    throw new ForbiddenError("Access denied");
  }
}

// ─── createProject ────────────────────────────────────────────────────────────

export async function createProject(
  supabaseUserId: string,
  input: CreateProjectInput,
): Promise<ProjectWithVersion> {
  const name = sanitiseName(input.name ?? "");
  const description = sanitiseDescription(input.description);

  try {
    validateName(name);
  } catch {
    throw new ValidationError("Project name is required", {
      name: "Project name is required",
    });
  }

  const profileId = await resolveProfileId(supabaseUserId);

  const existing = await projectRepository.findByProfileIdAndName(
    profileId,
    name,
  );
  if (existing) {
    throw new DomainError(
      `A project named '${name}' already exists in your workspace`,
    );
  }

  const project = await projectRepository.create({
    profileId,
    name,
    description,
  });

  await ifcVersionRepository.createInitialVersion(project.id);

  return { project, currentIfcVersion: 1 };
}

// ─── listProjects ─────────────────────────────────────────────────────────────

export async function listProjects(
  supabaseUserId: string,
): Promise<ProjectWithVersion[]> {
  const profileId = await resolveProfileId(supabaseUserId);

  const projects = await projectRepository.findAllByProfileId(profileId);
  if (projects.length === 0) return [];

  const versionMap = await ifcVersionRepository.getCurrentVersionNumbers(
    projects.map((p) => p.id),
  );

  return projects.map((project) => ({
    project,
    currentIfcVersion: versionMap.get(project.id) ?? 0,
  }));
}

// ─── getProject ───────────────────────────────────────────────────────────────

export async function getProject(
  supabaseUserId: string,
  projectId: string,
): Promise<ProjectWithVersion> {
  const profileId = await resolveProfileId(supabaseUserId);

  const project = await projectRepository.findById(projectId);
  if (!project) {
    throw new NotFoundError("Project not found");
  }

  assertOwnership(project, profileId);

  const currentIfcVersion =
    await ifcVersionRepository.getMaxVersionNumber(projectId);

  return { project, currentIfcVersion };
}

// ─── updateProject ────────────────────────────────────────────────────────────

export async function updateProject(
  supabaseUserId: string,
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectWithVersion> {
  const profileId = await resolveProfileId(supabaseUserId);

  const project = await projectRepository.findById(projectId);
  if (!project) {
    throw new NotFoundError("Project not found");
  }

  assertOwnership(project, profileId);

  const updateData: { name?: string; description?: string | null } = {};

  if (input.name !== undefined) {
    const name = sanitiseName(input.name);
    try {
      validateName(name);
    } catch {
      throw new ValidationError("Project name is required", {
        name: "Project name is required",
      });
    }

    if (name !== project.name) {
      const existing = await projectRepository.findByProfileIdAndName(
        profileId,
        name,
      );
      if (existing) {
        throw new DomainError(
          `A project named '${name}' already exists in your workspace`,
        );
      }
      updateData.name = name;
    }
  }

  if (input.description !== undefined) {
    updateData.description = sanitiseDescription(input.description);
  }

  const updated = await projectRepository.update(
    projectId,
    updateData,
    project.version,
  );

  const currentIfcVersion =
    await ifcVersionRepository.getMaxVersionNumber(projectId);

  return { project: updated, currentIfcVersion };
}

// ─── deleteProject ────────────────────────────────────────────────────────────

export async function deleteProject(
  supabaseUserId: string,
  projectId: string,
  confirm: boolean,
): Promise<void> {
  const profileId = await resolveProfileId(supabaseUserId);

  const project = await projectRepository.findById(projectId);
  if (!project) {
    throw new NotFoundError("Project not found");
  }

  assertOwnership(project, profileId);

  const maxVersion =
    await ifcVersionRepository.getMaxVersionNumber(projectId);

  if (maxVersion > 1 && !confirm) {
    throw new DomainError(
      "Project contains IFC data; add ?confirm=true to the request to permanently delete it",
    );
  }

  await projectRepository.delete(projectId, project.version);
}
