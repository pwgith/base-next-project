/**
 * POST /api/v1/ifc/files/[fileId]/elements/[globalId]/ports — create port
 * GET  /api/v1/ifc/files/[fileId]/elements/[globalId]/ports — list ports
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { createPort, listPorts } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, internalError } from "@/lib/apiResponse";

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
    const { port, version } = await createPort(fileId, globalId, body, supabaseUserId);
    return NextResponse.json(
      { data: { ...port } },
      { status: 201, headers: { "X-IFC-Version": String(version) } },
    );
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[POST ports]", err);
    return internalError();
  }
}

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
    const ports = await listPorts(fileId, globalId);
    return ok({ ports });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[GET ports]", err);
    return internalError();
  }
}
