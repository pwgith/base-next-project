/**
 * GET /api/v1/ifc/property-set-schemas — list available standard property set schemas
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getStandardPsetSchemas } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError } from "@/lib/errors";
import { ok, unauthorized, forbidden, internalError } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  try {
    await verifyTokenAndScope(request, "ifc:read");
  } catch (err) {
    if (err instanceof ForbiddenError) return forbidden(err.message);
    if (err instanceof AuthorisationError) return unauthorized(err.message);
    return unauthorized();
  }

  try {
    const schemas = getStandardPsetSchemas();
    return ok({ schemas });
  } catch (err) {
    console.error("[GET pset schemas]", err);
    return internalError();
  }
}
