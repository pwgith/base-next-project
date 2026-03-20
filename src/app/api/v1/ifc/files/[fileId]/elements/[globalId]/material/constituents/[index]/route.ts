/**
 * PATCH /api/v1/ifc/files/[fileId]/elements/[globalId]/material/constituents/[index] — update constituent
 * DELETE /api/v1/ifc/files/[fileId]/elements/[globalId]/material/constituents/[index] — remove constituent
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { updateConstituent, removeConstituent } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, internalError } from "@/lib/apiResponse";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; index: string }> },
) {
  const { fileId, globalId, index } = await params;
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
    const { constituent } = await updateConstituent(fileId, globalId, parseInt(index, 10), body, supabaseUserId);
    return ok(constituent);
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[PATCH constituent]", err);
    return internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; index: string }> },
) {
  const { fileId, globalId, index } = await params;
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
    const { assignment } = await removeConstituent(fileId, globalId, parseInt(index, 10), supabaseUserId);
    return ok(assignment);
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[DELETE constituent]", err);
    return internalError();
  }
}
