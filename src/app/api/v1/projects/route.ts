/**
 * GET  /api/v1/projects — list all projects for the authenticated user.
 * POST /api/v1/projects — create a new project.
 *
 * Public REST API — requires OAuth Bearer token with explicit scopes.
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import {
  createProject,
  listProjects,
} from "@/modules/ifc/projectService";
import {
  AuthorisationError,
  ForbiddenError,
  ValidationError,
  DomainError,
} from "@/lib/errors";
import {
  ok,
  created,
  unauthorized,
  forbidden,
  conflict,
  unprocessableEntity,
  internalError,
  badRequest,
} from "@/lib/apiResponse";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatProject(p: {
  project: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  currentIfcVersion: number;
}) {
  return {
    projectId: p.project.id,
    name: p.project.name,
    description: p.project.description,
    currentIfcVersion: p.currentIfcVersion,
    createdAt: p.project.createdAt.toISOString(),
    lastUpdatedAt: p.project.updatedAt.toISOString(),
  };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:read");
  } catch (err) {
    if (err instanceof ForbiddenError) return forbidden(err.message);
    if (err instanceof AuthorisationError) return unauthorized(err.message);
    return unauthorized();
  }

  try {
    const projects = await listProjects(supabaseUserId);
    return ok({
      projects: projects.map(formatProject),
    });
  } catch (err) {
    console.error("[GET /api/v1/projects] Unexpected error:", err);
    return internalError();
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:write");
  } catch (err) {
    if (err instanceof ForbiddenError) return forbidden(err.message);
    if (err instanceof AuthorisationError) return unauthorized(err.message);
    return unauthorized();
  }

  let body: { name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  try {
    const result = await createProject(supabaseUserId, {
      name: body.name ?? "",
      description: body.description,
    });
    return created(formatProject(result));
  } catch (err) {
    if (err instanceof ValidationError)
      return unprocessableEntity(err.message);
    if (err instanceof DomainError) return conflict(err.message);
    console.error("[POST /api/v1/projects] Unexpected error:", err);
    return internalError();
  }
}
