/**
 * GET    /api/v1/ifc/files/[fileId]/elements/[globalId]/property-sets/[psetName] — get pset
 * DELETE /api/v1/ifc/files/[fileId]/elements/[globalId]/property-sets/[psetName] — delete pset
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { getPropertySet, deletePropertySet } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, noContent, unauthorized, forbidden, notFound, internalError } from "@/lib/apiResponse";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; psetName: string }> },
) {
  const { fileId, globalId, psetName } = await params;
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
    const pset = await getPropertySet(fileId, globalId, psetName);
    return ok(pset);
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[GET pset]", err);
    return internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; psetName: string }> },
) {
  const { fileId, globalId, psetName } = await params;
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
    await deletePropertySet(fileId, globalId, psetName, supabaseUserId);
    return noContent();
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[DELETE pset]", err);
    return internalError();
  }
}
