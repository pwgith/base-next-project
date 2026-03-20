/**
 * PATCH /api/v1/ifc/files/[fileId]/elements/[globalId]/material/layers/[layerIndex] — update layer
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { updateMaterialLayer } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, unprocessableEntity, internalError } from "@/lib/apiResponse";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; layerIndex: string }> },
) {
  const { fileId, globalId, layerIndex } = await params;
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
    const result = await updateMaterialLayer(fileId, globalId, parseInt(layerIndex, 10), body, supabaseUserId);
    return ok(result.layer);
  } catch (err) {
    if (err instanceof ValidationError) return unprocessableEntity(err.message);
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[PATCH material layer]", err);
    return internalError();
  }
}
