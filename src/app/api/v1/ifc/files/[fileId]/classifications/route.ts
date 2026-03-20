/**
 * GET  /api/v1/ifc/files/[fileId]/classifications — list classification systems
 * POST /api/v1/ifc/files/[fileId]/classifications — create classification system
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { listClassifications, createClassificationSystem } from "@/modules/ifc/ifcModelService";
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
    const classifications = await listClassifications(fileId);
    return ok({ classifications });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[GET classifications]", err);
    return internalError();
  }
}

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
    if (!body.name) throw new ValidationError("name is required");
    const { system, version } = await createClassificationSystem(fileId, body, supabaseUserId);
    return NextResponse.json({ data: system }, {
      status: 201,
      headers: { "X-IFC-Version": String(version) },
    });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    if (err instanceof ValidationError) return unprocessableEntity(err.message);
    console.error("[POST classifications]", err);
    return internalError();
  }
}
