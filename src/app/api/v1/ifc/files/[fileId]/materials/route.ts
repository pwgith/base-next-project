/**
 * GET  /api/v1/ifc/files/[fileId]/materials — list materials
 * POST /api/v1/ifc/files/[fileId]/materials — create material
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { listMaterials, createMaterial } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { ok, created, unauthorized, forbidden, notFound, unprocessableEntity, internalError } from "@/lib/apiResponse";

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
    await getProject(supabaseUserId, fileId);
    const materials = await listMaterials(fileId);
    return ok({ materials });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[GET materials]", err);
    return internalError();
  }
}

export async function POST(
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
    const result = await createMaterial(fileId, body, supabaseUserId);
    return created(result.material);
  } catch (err) {
    if (err instanceof ValidationError) return unprocessableEntity(err.message);
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[POST material]", err);
    return internalError();
  }
}
