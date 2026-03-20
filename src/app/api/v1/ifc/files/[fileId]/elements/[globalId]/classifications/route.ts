/**
 * GET  /api/v1/ifc/files/[fileId]/elements/[globalId]/classifications — list element classifications
 * POST /api/v1/ifc/files/[fileId]/elements/[globalId]/classifications — assign classification ref
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { getElementClassifications, assignClassificationReference } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { ok, created, unauthorized, forbidden, notFound, unprocessableEntity, internalError } from "@/lib/apiResponse";

export async function GET(
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
    const refs = await getElementClassifications(fileId, globalId);
    return ok({ classifications: refs });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[GET classifications]", err);
    return internalError();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string }> },
) {
  const { fileId, globalId } = await params;
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
    const result = await assignClassificationReference(fileId, globalId, body, supabaseUserId);
    return created(result.reference);
  } catch (err) {
    if (err instanceof ValidationError) return unprocessableEntity(err.message);
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[POST classification]", err);
    return internalError();
  }
}
