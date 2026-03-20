/**
 * GET /api/v1/ifc/files/[fileId]/elements/[globalId]/quantity-sets/[qsetName] — get quantity set
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { getQuantitySet } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, internalError } from "@/lib/apiResponse";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; qsetName: string }> },
) {
  const { fileId, globalId, qsetName } = await params;
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
    const qset = await getQuantitySet(fileId, globalId, qsetName);
    return ok(qset);
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[GET qset]", err);
    return internalError();
  }
}
