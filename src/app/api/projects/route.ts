/**
 * GET  /api/projects — list all projects for the authenticated user.
 * POST /api/projects — create a new project.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/modules/auth/authService";
import {
  createProject,
  listProjects,
} from "@/modules/ifc/projectService";
import {
  AuthorisationError,
  ValidationError,
  DomainError,
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

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyToken(request);
  } catch (err) {
    if (err instanceof AuthorisationError) {
      return NextResponse.json(
        { error: { message: err.message } },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: { message: "Authentication required." } },
      { status: 401 },
    );
  }

  try {
    const projects = await listProjects(supabaseUserId);
    return NextResponse.json({
      data: { projects: projects.map(formatProject) },
    });
  } catch (err) {
    console.error("[GET /api/projects] Unexpected error:", err);
    return NextResponse.json(
      { error: { message: "An unexpected error occurred." } },
      { status: 500 },
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyToken(request);
  } catch (err) {
    if (err instanceof AuthorisationError) {
      return NextResponse.json(
        { error: { message: err.message } },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: { message: "Authentication required." } },
      { status: 401 },
    );
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
    const result = await createProject(supabaseUserId, {
      name: body.name ?? "",
      description: body.description,
    });

    return NextResponse.json({ data: formatProject(result) }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { error: { message: err.message } },
        { status: 422 },
      );
    }
    if (err instanceof DomainError) {
      return NextResponse.json(
        { error: { message: err.message } },
        { status: 409 },
      );
    }
    console.error("[POST /api/projects] Unexpected error:", err);
    return NextResponse.json(
      { error: { message: "An unexpected error occurred." } },
      { status: 500 },
    );
  }
}
