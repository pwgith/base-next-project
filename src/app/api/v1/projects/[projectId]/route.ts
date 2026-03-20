/**
 * GET    /api/v1/projects/[projectId] — get a single project.
 * PATCH  /api/v1/projects/[projectId] — update project name/description.
 * DELETE /api/v1/projects/[projectId] — delete a project.
 *
 * Public REST API — requires OAuth Bearer token with explicit scopes.
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import {
  getProject,
  updateProject,
  deleteProject,
} from "@/modules/ifc/projectService";
import {
  AuthorisationError,
  ForbiddenError,
  ValidationError,
  DomainError,
  NotFoundError,
  ConcurrencyError,
} from "@/lib/errors";
import {
  ok,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessableEntity,
  internalError,
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

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

function mapError(
  err: unknown,
  endpoint: string,
) {
  // For the projects API, ownership failures are reported as 404 to avoid
  // revealing the existence of another user's project.
  if (err instanceof ForbiddenError) return notFound("Project not found");
  if (err instanceof AuthorisationError) return unauthorized(err.message);
  if (err instanceof ValidationError) return unprocessableEntity(err.message);
  if (err instanceof NotFoundError) return notFound(err.message);
  if (err instanceof DomainError) return conflict(err.message);
  if (err instanceof ConcurrencyError) return conflict(err.message);
  console.error(`[${endpoint}] Unexpected error:`, err);
  return internalError();
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:read");
  } catch (err) {
    return mapError(err, `GET /api/v1/projects/${projectId}`);
  }

  try {
    const result = await getProject(supabaseUserId, projectId);
    return ok(formatProject(result));
  } catch (err) {
    return mapError(err, `GET /api/v1/projects/${projectId}`);
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:write");
  } catch (err) {
    return mapError(err, `PATCH /api/v1/projects/${projectId}`);
  }

  let body: { name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  try {
    const result = await updateProject(supabaseUserId, projectId, {
      name: body.name,
      description: body.description,
    });
    return ok(formatProject(result));
  } catch (err) {
    return mapError(err, `PATCH /api/v1/projects/${projectId}`);
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:delete");
  } catch (err) {
    return mapError(err, `DELETE /api/v1/projects/${projectId}`);
  }

  const confirm = request.nextUrl.searchParams.get("confirm") === "true";

  try {
    await deleteProject(supabaseUserId, projectId, confirm);
    return noContent();
  } catch (err) {
    return mapError(err, `DELETE /api/v1/projects/${projectId}`);
  }
}
