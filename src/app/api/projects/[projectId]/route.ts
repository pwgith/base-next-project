/**
 * GET    /api/projects/[projectId] — get a single project.
 * PATCH  /api/projects/[projectId] — update project name/description.
 * DELETE /api/projects/[projectId] — delete a project.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/modules/auth/authService";
import {
  getProject,
  updateProject,
  deleteProject,
} from "@/modules/ifc/projectService";
import {
  AuthorisationError,
  ValidationError,
  DomainError,
  NotFoundError,
  ConcurrencyError,
} from "@/lib/errors";

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

async function authenticate(request: NextRequest): Promise<string> {
  return verifyToken(request);
}

function mapErrorToResponse(err: unknown, endpoint: string): NextResponse {
  if (err instanceof AuthorisationError) {
    return NextResponse.json(
      { error: { message: err.message } },
      { status: 401 },
    );
  }
  if (err instanceof ValidationError) {
    return NextResponse.json(
      { error: { message: err.message } },
      { status: 422 },
    );
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json(
      { error: { message: err.message } },
      { status: 404 },
    );
  }
  if (err instanceof DomainError) {
    return NextResponse.json(
      { error: { message: err.message } },
      { status: 409 },
    );
  }
  if (err instanceof ConcurrencyError) {
    return NextResponse.json(
      { error: { message: err.message } },
      { status: 409 },
    );
  }
  console.error(`[${endpoint}] Unexpected error:`, err);
  return NextResponse.json(
    { error: { message: "An unexpected error occurred." } },
    { status: 500 },
  );
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { projectId } = await context.params;

  let supabaseUserId: string;
  try {
    supabaseUserId = await authenticate(request);
  } catch (err) {
    return mapErrorToResponse(err, `GET /api/projects/${projectId}`);
  }

  try {
    const result = await getProject(supabaseUserId, projectId);
    return NextResponse.json({ data: formatProject(result) });
  } catch (err) {
    return mapErrorToResponse(err, `GET /api/projects/${projectId}`);
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { projectId } = await context.params;

  let supabaseUserId: string;
  try {
    supabaseUserId = await authenticate(request);
  } catch (err) {
    return mapErrorToResponse(err, `PATCH /api/projects/${projectId}`);
  }

  let body: { name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  try {
    const result = await updateProject(supabaseUserId, projectId, {
      name: body.name,
      description: body.description,
    });
    return NextResponse.json({ data: formatProject(result) });
  } catch (err) {
    return mapErrorToResponse(err, `PATCH /api/projects/${projectId}`);
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { projectId } = await context.params;

  let supabaseUserId: string;
  try {
    supabaseUserId = await authenticate(request);
  } catch (err) {
    return mapErrorToResponse(err, `DELETE /api/projects/${projectId}`);
  }

  const confirm =
    request.nextUrl.searchParams.get("confirm") === "true";

  try {
    await deleteProject(supabaseUserId, projectId, confirm);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return mapErrorToResponse(err, `DELETE /api/projects/${projectId}`);
  }
}
