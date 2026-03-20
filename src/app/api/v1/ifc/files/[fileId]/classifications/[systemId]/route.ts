/**
 * GET    /api/v1/ifc/files/[fileId]/classifications/[systemId] — get classification system
 * PATCH  /api/v1/ifc/files/[fileId]/classifications/[systemId] — update classification system
 * DELETE /api/v1/ifc/files/[fileId]/classifications/[systemId] — delete classification system
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import {
  getClassificationSystem,
  updateClassificationSystem,
  deleteClassificationSystem,
} from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError, DomainError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, noContent, conflict, internalError } from "@/lib/apiResponse";

type Params = { fileId: string; systemId: string };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { fileId, systemId } = await params;
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
    const system = await getClassificationSystem(fileId, systemId);
    return ok(system);
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[GET classification system]", err);
    return internalError();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { fileId, systemId } = await params;
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
    const { system, version } = await updateClassificationSystem(fileId, systemId, body, supabaseUserId);
    return NextResponse.json({ data: system }, {
      status: 200,
      headers: { "X-IFC-Version": String(version) },
    });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[PATCH classification system]", err);
    return internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { fileId, systemId } = await params;
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:delete");
  } catch (err) {
    if (err instanceof ForbiddenError) return forbidden(err.message);
    if (err instanceof AuthorisationError) return unauthorized(err.message);
    return unauthorized();
  }

  try {
    await getProject(supabaseUserId, fileId);
    await deleteClassificationSystem(fileId, systemId, supabaseUserId);
    return noContent();
  } catch (err) {
    if (err instanceof DomainError) return conflict(err.message);
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[DELETE classification system]", err);
    return internalError();
  }
}
