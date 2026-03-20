/**
 * GET    /api/v1/ifc/files/[fileId]/elements/[globalId] — get element
 * PATCH  /api/v1/ifc/files/[fileId]/elements/[globalId] — update element
 * DELETE /api/v1/ifc/files/[fileId]/elements/[globalId] — delete element
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { getElement, updateElement, deleteElement } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, badRequest, internalError } from "@/lib/apiResponse";

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
    const element = await getElement(fileId, globalId);
    return ok(element);
  } catch (err) {
    if (err instanceof NotFoundError) return notFound("Element not found");
    console.error("[GET element]", err);
    return internalError();
  }
}

export async function PATCH(
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

  let body: { name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  try {
    await getProject(supabaseUserId, fileId);
    const result = await updateElement(fileId, globalId, body, supabaseUserId);
    return ok({ ...result.element, version: result.version });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound("Element not found");
    console.error("[PATCH element]", err);
    return internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string }> },
) {
  const { fileId, globalId } = await params;
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
    const newVersion = await deleteElement(fileId, globalId, supabaseUserId);
    return new NextResponse(null, {
      status: 204,
      headers: { "X-IFC-Version": String(newVersion) },
    });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound("Element not found");
    console.error("[DELETE element]", err);
    return internalError();
  }
}
