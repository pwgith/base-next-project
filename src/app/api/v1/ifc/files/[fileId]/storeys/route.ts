/**
 * POST   /api/v1/ifc/files/[fileId]/storeys — create storey
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { createStorey } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { created, unauthorized, forbidden, notFound, badRequest, internalError } from "@/lib/apiResponse";

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

  let body: { name?: string; elevation?: number };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  try {
    await getProject(supabaseUserId, fileId);
    const result = await createStorey(fileId, {
      name: body.name ?? "",
      elevation: body.elevation ?? 0,
    }, supabaseUserId);
    return created({
      ...result.storey,
      version: result.version,
    });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound("IFC file not found");
    console.error("[POST storeys]", err);
    return internalError();
  }
}
