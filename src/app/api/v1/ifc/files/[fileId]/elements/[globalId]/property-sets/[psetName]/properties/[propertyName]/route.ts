/**
 * PATCH  /api/v1/ifc/files/[fileId]/elements/[globalId]/property-sets/[psetName]/properties/[propertyName] — update
 * DELETE /api/v1/ifc/files/[fileId]/elements/[globalId]/property-sets/[psetName]/properties/[propertyName] — delete
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { updateProperty, deleteProperty } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { ok, noContent, unauthorized, forbidden, notFound, unprocessableEntity, internalError } from "@/lib/apiResponse";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; psetName: string; propertyName: string }> },
) {
  const { fileId, globalId, psetName, propertyName } = await params;
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
    const result = await updateProperty(fileId, globalId, psetName, propertyName, body, supabaseUserId);
    return ok(result.property);
  } catch (err) {
    if (err instanceof ValidationError) return unprocessableEntity(err.message);
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[PATCH property]", err);
    return internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; psetName: string; propertyName: string }> },
) {
  const { fileId, globalId, psetName, propertyName } = await params;
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
    await deleteProperty(fileId, globalId, psetName, propertyName, supabaseUserId);
    return noContent();
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[DELETE property]", err);
    return internalError();
  }
}
