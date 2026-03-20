/**
 * PUT    /api/v1/ifc/files/[fileId]/elements/[globalId]/openings/[openingId]/filling — set filling
 * GET    /api/v1/ifc/files/[fileId]/elements/[globalId]/openings/[openingId]/filling — get filling
 * DELETE /api/v1/ifc/files/[fileId]/elements/[globalId]/openings/[openingId]/filling — remove filling
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { setFilling, getFilling, removeFilling } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError, DomainError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, noContent, conflict, internalError } from "@/lib/apiResponse";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; openingId: string }> },
) {
  const { fileId, globalId, openingId } = await params;
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
    const { fillingElement, version } = await setFilling(fileId, globalId, openingId, body.fillingGlobalId, supabaseUserId);
    return NextResponse.json(
      { data: { fillingElement } },
      { status: 200, headers: { "X-IFC-Version": String(version) } },
    );
  } catch (err) {
    if (err instanceof DomainError) return conflict(err.message);
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[PUT filling]", err);
    return internalError();
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; openingId: string }> },
) {
  const { fileId, globalId, openingId } = await params;
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
    const result = await getFilling(fileId, globalId, openingId);
    return ok(result);
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[GET filling]", err);
    return internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; openingId: string }> },
) {
  const { fileId, globalId, openingId } = await params;
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
    await removeFilling(fileId, globalId, openingId, supabaseUserId);
    return noContent();
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[DELETE filling]", err);
    return internalError();
  }
}
