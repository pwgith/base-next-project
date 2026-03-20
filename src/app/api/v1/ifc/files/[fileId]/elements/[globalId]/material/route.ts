/**
 * GET    /api/v1/ifc/files/[fileId]/elements/[globalId]/material — get material assignment
 * PUT    /api/v1/ifc/files/[fileId]/elements/[globalId]/material — set material assignment
 * DELETE /api/v1/ifc/files/[fileId]/elements/[globalId]/material — remove material assignment
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { getMaterialAssignment, setMaterialAssignment, deleteMaterialAssignment } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { ok, noContent, unauthorized, forbidden, notFound, unprocessableEntity, internalError } from "@/lib/apiResponse";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string }> },
) {
  const { fileId, globalId } = await params;
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
    const assignment = await getMaterialAssignment(fileId, globalId);
    return ok(assignment);
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[GET material]", err);
    return internalError();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string }> },
) {
  const { fileId, globalId } = await params;
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
    const result = await setMaterialAssignment(fileId, globalId, body, supabaseUserId);
    return ok(result.assignment);
  } catch (err) {
    if (err instanceof ValidationError) return unprocessableEntity(err.message);
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[PUT material]", err);
    return internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string }> },
) {
  const { fileId, globalId } = await params;
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:delete");
  } catch (err) {
    if (err instanceof ForbiddenError) return forbidden(err.message);
    if (err instanceof AuthorisationError) return unauthorized(err.message);
    return unauthorized();
  }

  try {
    await getProject(supabaseUserId, fileId);
    await deleteMaterialAssignment(fileId, globalId, supabaseUserId);
    return noContent();
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[DELETE material]", err);
    return internalError();
  }
}
