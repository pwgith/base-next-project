/**
 * POST /api/v1/ifc/files/[fileId]/materials/[materialId]/assignments
 * Bulk assign a material to multiple elements.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { bulkAssignMaterial } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, internalError } from "@/lib/apiResponse";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; materialId: string }> },
) {
  const { fileId, materialId } = await params;
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
    const result = await bulkAssignMaterial(fileId, materialId, body.elementGlobalIds, supabaseUserId);
    if (result.partial) {
      return NextResponse.json(
        { data: { succeeded: result.succeeded, failed: result.failed } },
        { status: 207, headers: { "X-IFC-Version": String(result.version) } },
      );
    }
    return ok({ assignedCount: result.assignedCount, materialName: result.materialName });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[POST bulk assign]", err);
    return internalError();
  }
}
