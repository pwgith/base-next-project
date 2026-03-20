/**
 * POST /api/v1/ifc/files/[fileId]/elements/[globalId]/property-sets/[psetName]/validate
 * Validate a property set against standard or custom template.
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { validatePropertySet } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, unauthorized, forbidden, notFound, internalError } from "@/lib/apiResponse";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; globalId: string; psetName: string }> },
) {
  const { fileId, globalId, psetName } = await params;
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
    let customTemplate: { properties: { name: string; type: string; required?: boolean }[] } | undefined;
    try {
      const body = await request.json();
      if (body?.template) customTemplate = body.template;
    } catch {
      // No body is valid — uses standard schema
    }
    const result = await validatePropertySet(fileId, globalId, psetName, customTemplate);
    return ok(result);
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[POST validate pset]", err);
    return internalError();
  }
}
