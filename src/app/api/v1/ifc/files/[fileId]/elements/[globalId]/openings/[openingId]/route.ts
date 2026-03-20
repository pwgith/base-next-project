/**
 * DELETE /api/v1/ifc/files/[fileId]/elements/[globalId]/openings/[openingId]
 * Remove an opening (and any filling) from a host element.
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { removeOpening } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { noContent, unauthorized, forbidden, notFound, internalError } from "@/lib/apiResponse";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; openingId: string }> },
) {
  const { fileId, globalId, openingId } = await params;
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
    await removeOpening(fileId, globalId, openingId, supabaseUserId);
    return noContent();
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[DELETE opening]", err);
    return internalError();
  }
}
