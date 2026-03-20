/**
 * PATCH  /api/v1/ifc/files/[fileId]/storeys/[storeyId] — update storey
 * DELETE /api/v1/ifc/files/[fileId]/storeys/[storeyId] — delete storey
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { updateStorey, deleteStorey } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError, DomainError } from "@/lib/errors";
import { ok, noContent, unauthorized, forbidden, notFound, conflict, badRequest, internalError } from "@/lib/apiResponse";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; storeyId: string }> },
) {
  const { fileId, storeyId } = await params;
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:write");
  } catch (err) {
    if (err instanceof ForbiddenError) return forbidden(err.message);
    if (err instanceof AuthorisationError) return unauthorized(err.message);
    return unauthorized();
  }

  let body: { name?: string; elevation?: number };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  try {
    await getProject(supabaseUserId, fileId);
    const result = await updateStorey(fileId, storeyId, body, supabaseUserId);
    return ok({ ...result.storey, version: result.version });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[PATCH storey]", err);
    return internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; storeyId: string }> },
) {
  const { fileId, storeyId } = await params;
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
    await deleteStorey(fileId, storeyId, supabaseUserId);
    return noContent();
  } catch (err) {
    if (err instanceof DomainError) return conflict(err.message);
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[DELETE storey]", err);
    return internalError();
  }
}
