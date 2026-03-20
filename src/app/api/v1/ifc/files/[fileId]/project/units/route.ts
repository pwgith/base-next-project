/**
 * GET   /api/v1/ifc/files/[fileId]/project/units — get project unit assignments
 * PATCH /api/v1/ifc/files/[fileId]/project/units — update project unit assignments
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { getProjectUnits, updateProjectUnits } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, internalError, unprocessableEntity } from "@/lib/apiResponse";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
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
    const units = await getProjectUnits(fileId);
    return ok({ units });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[GET project units]", err);
    return internalError();
  }
}

export async function PATCH(
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
    if (!Array.isArray(body.units)) throw new ValidationError("units array is required");
    const { units, version } = await updateProjectUnits(fileId, body.units, supabaseUserId);
    return NextResponse.json({ data: { units } }, {
      status: 200,
      headers: { "X-IFC-Version": String(version) },
    });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    if (err instanceof ValidationError) return unprocessableEntity(err.message);
    console.error("[PATCH project units]", err);
    return internalError();
  }
}
