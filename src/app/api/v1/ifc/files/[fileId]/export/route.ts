/**
 * GET  /api/v1/ifc/files/[fileId]/export?format=ifc — export model
 * POST /api/v1/ifc/files/[fileId]/export — export with options (partial export by globalIds)
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { exportModel } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { unauthorized, forbidden, notFound, badRequest, internalError } from "@/lib/apiResponse";

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
    const { project } = await getProject(supabaseUserId, fileId);
    const format = request.nextUrl.searchParams.get("format") ?? "ifc";
    const result = await exportModel(fileId, format, undefined, project.name);
    const responseBody = typeof result.body === "string" ? result.body : new Uint8Array(result.body);
    return new Response(responseBody, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof ValidationError) return badRequest(err.message);
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[GET export]", err);
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
    supabaseUserId = await verifyTokenAndScope(request, "ifc:read");
  } catch (err) {
    if (err instanceof ForbiddenError) return forbidden(err.message);
    if (err instanceof AuthorisationError) return unauthorized(err.message);
    return unauthorized();
  }

  try {
    const { project } = await getProject(supabaseUserId, fileId);
    const format = request.nextUrl.searchParams.get("format") ?? "ifc";
    const body = await request.json();
    const globalIds: string[] | undefined = body.globalIds;
    const result = await exportModel(fileId, format, globalIds, project.name);
    const responseBody = typeof result.body === "string" ? result.body : new Uint8Array(result.body);
    return new Response(responseBody, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof ValidationError) return badRequest(err.message);
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[POST export]", err);
    return internalError();
  }
}
