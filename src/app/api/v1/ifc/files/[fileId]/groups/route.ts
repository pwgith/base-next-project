/**
 * POST /api/v1/ifc/files/[fileId]/groups — create group
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { createGroup } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { created, unauthorized, forbidden, notFound, unprocessableEntity, internalError } from "@/lib/apiResponse";

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
    const result = await createGroup(fileId, body, supabaseUserId);
    return created(result.group);
  } catch (err) {
    if (err instanceof ValidationError) return unprocessableEntity(err.message);
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[POST group]", err);
    return internalError();
  }
}
