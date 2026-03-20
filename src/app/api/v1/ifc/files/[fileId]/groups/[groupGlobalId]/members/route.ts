/**
 * POST /api/v1/ifc/files/[fileId]/groups/[groupGlobalId]/members — add member to group
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { addGroupMember } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, unprocessableEntity, internalError } from "@/lib/apiResponse";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; groupGlobalId: string }> },
) {
  const { fileId, groupGlobalId } = await params;
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
    const result = await addGroupMember(fileId, groupGlobalId, body.memberGlobalId, supabaseUserId);
    return ok(result.group);
  } catch (err) {
    if (err instanceof ValidationError) return unprocessableEntity(err.message);
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[POST group member]", err);
    return internalError();
  }
}
