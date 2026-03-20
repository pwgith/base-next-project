/**
 * POST /api/v1/ifc/files/[fileId]/storeys/[storeyId]/spaces — create space
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { createSpace } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { created, unauthorized, forbidden, notFound, badRequest, internalError } from "@/lib/apiResponse";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; storeyId: string }> },
) {
  const { fileId, storeyId } = await params;
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
    const result = await createSpace(fileId, storeyId, {
      name: body.name ?? "",
      longName: body.longName,
    }, supabaseUserId);
    return created({ ...result.space, version: result.version });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[POST spaces]", err);
    return internalError();
  }
}
