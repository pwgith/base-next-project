/**
 * Project domain logic.
 * Pure business rule functions for IFC project data — no I/O.
 */

import type { IfcProject } from "./ifcTypes";

const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 1000;

// ─── Sanitisation ─────────────────────────────────────────────────────────────

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

export function sanitiseName(raw: string): string {
  return stripHtml(raw).trim().slice(0, MAX_NAME_LENGTH);
}

export function sanitiseDescription(raw: string | undefined): string | null {
  if (raw === undefined || raw === null) return null;
  const cleaned = stripHtml(raw).trim();
  return cleaned.length === 0 ? null : cleaned.slice(0, MAX_DESCRIPTION_LENGTH);
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error("Project name is required");
  }
}

// ─── Builders ─────────────────────────────────────────────────────────────────

export function buildNewProject(
  profileId: string,
  name: string,
  description: string | null,
): Omit<IfcProject, "id" | "createdAt" | "updatedAt"> {
  return {
    profileId,
    name,
    description,
    version: 1,
  };
}
