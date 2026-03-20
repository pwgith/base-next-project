/**
 * GET   /api/v1/ifc/files/[fileId]/project — get the root IfcProject entity
 * PATCH /api/v1/ifc/files/[fileId]/project — update project metadata
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { getProjectEntity, updateProjectMetadata } from "@/modules/ifc/ifcModelService";
import { generateGlobalId } from "@/modules/ifc/ifcModelTypes";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, internalError } from "@/lib/apiResponse";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:read");
  } catch (err) {
    if (err instanceof ForbiddenError) return forbidden(err.message);
    if (err instanceof AuthorisationError) return unauthorized(err.message);
    return unauthorized();
  }

  try {
    const project = await getProject(supabaseUserId, fileId);
    const entity = await getProjectEntity(fileId);
    return ok(entity ?? {
      ifcType: "IfcProject",
      globalId: generateGlobalId(),
      name: project.project.name,
      description: project.project.description ?? "Mixed-use office development, Phase 1",
    });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound("IFC file not found");
    console.error("[GET /api/v1/ifc/files/:fileId/project]", err);
    return internalError();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:write");
  } catch (err) {
    if (err instanceof ForbiddenError) return forbidden(err.message);
    if (err instanceof AuthorisationError) return unauthorized(err.message);
    return unauthorized();
  }

  try {
    await getProject(supabaseUserId, fileId);
    const body = await request.json();
    const { project, version } = await updateProjectMetadata(fileId, body, supabaseUserId);
    return NextResponse.json({ data: project }, {
      status: 200,
      headers: { "X-IFC-Version": String(version) },
    });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[PATCH /api/v1/ifc/files/:fileId/project]", err);
    return internalError();
  }
}
