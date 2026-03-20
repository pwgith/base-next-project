/**
 * POST /api/v1/ifc/files/[fileId]/elements/[globalId]/property-sets/validate
 * Validate all property sets on an element against their standard definitions.
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { validateAllPropertySets } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, internalError } from "@/lib/apiResponse";

export async function POST(
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
    const results = await validateAllPropertySets(fileId, globalId);
    return ok({ results });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[POST validate all psets]", err);
    return internalError();
  }
}
