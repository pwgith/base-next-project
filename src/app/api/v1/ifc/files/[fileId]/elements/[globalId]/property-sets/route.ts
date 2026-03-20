/**
 * GET  /api/v1/ifc/files/[fileId]/elements/[globalId]/property-sets — list property sets
 * POST /api/v1/ifc/files/[fileId]/elements/[globalId]/property-sets — create property set
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { getPropertySets, createPropertySet } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, created, unauthorized, forbidden, notFound, badRequest, internalError } from "@/lib/apiResponse";

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
    const psets = await getPropertySets(fileId, globalId);
    return ok({ propertySets: psets });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[GET property-sets]", err);
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

  let body: { name?: string; properties?: { name: string; type: string; value: unknown }[] };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  try {
    await getProject(supabaseUserId, fileId);
    const result = await createPropertySet(fileId, globalId, {
      name: body.name ?? "",
      properties: body.properties ?? [],
    }, supabaseUserId);
    return created(result.propertySet);
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[POST property-sets]", err);
    return internalError();
  }
}
