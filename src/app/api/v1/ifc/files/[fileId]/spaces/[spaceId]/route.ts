/**
 * PATCH /api/v1/ifc/files/[fileId]/spaces/[spaceId] — update space
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { updateSpace } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, badRequest, internalError } from "@/lib/apiResponse";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; spaceId: string }> },
) {
  const { fileId, spaceId } = await params;
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:write");
  } catch (err) {
    if (err instanceof ForbiddenError) return forbidden(err.message);
    if (err instanceof AuthorisationError) return unauthorized(err.message);
    return unauthorized();
  }

  let body: { name?: string; longName?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  try {
    await getProject(supabaseUserId, fileId);
    const result = await updateSpace(fileId, spaceId, body, supabaseUserId);
    return ok({ ...result.space, version: result.version });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[PATCH space]", err);
    return internalError();
  }
}
