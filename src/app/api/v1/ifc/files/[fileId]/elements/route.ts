/**
 * GET  /api/v1/ifc/files/[fileId]/elements — list/filter elements
 * POST /api/v1/ifc/files/[fileId]/elements — create element
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { listElements, createElement } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, created, unauthorized, forbidden, notFound, badRequest, internalError } from "@/lib/apiResponse";

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
    const url = new URL(request.url);
    const filters = {
      storeyId: url.searchParams.get("storeyId") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      name: url.searchParams.get("name") ?? undefined,
      pset: url.searchParams.get("pset") ?? undefined,
      property: url.searchParams.get("property") ?? undefined,
      value: url.searchParams.get("value") ?? undefined,
      bbox: url.searchParams.get("bbox") ?? undefined,
      limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
      offset: url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : undefined,
    };
    const result = await listElements(fileId, filters);
    return ok({
      elements: result.elements,
      total: result.total,
      ...(filters.limit !== undefined ? { limit: filters.limit } : {}),
      ...(filters.offset !== undefined ? { offset: filters.offset } : {}),
    });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound("IFC file not found");
    console.error("[GET elements]", err);
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

  let body: {
    ifcType?: string;
    name?: string;
    description?: string;
    predefinedType?: string;
    storeyGlobalId?: string;
    hostGlobalId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  try {
    await getProject(supabaseUserId, fileId);
    const result = await createElement(fileId, {
      ifcType: body.ifcType ?? "IfcBuildingElement",
      name: body.name ?? "",
      description: body.description,
      predefinedType: body.predefinedType,
      storeyGlobalId: body.storeyGlobalId ?? "",
      hostGlobalId: body.hostGlobalId,
    }, supabaseUserId);
    return created({
      ...result.element,
      version: result.version,
    });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[POST elements]", err);
    return internalError();
  }
}
