/**
 * DELETE /api/v1/ifc/files/[fileId]/elements/[globalId]/connections/[connectionId]
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { removeConnection } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { noContent, unauthorized, forbidden, notFound, internalError } from "@/lib/apiResponse";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; connectionId: string }> },
) {
  const { fileId, globalId, connectionId } = await params;
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
    await removeConnection(fileId, globalId, connectionId, supabaseUserId);
    return noContent();
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[DELETE connection]", err);
    return internalError();
  }
}
