/**
 * Shared helper for IFC API route auth error handling.
 * Returns an appropriate HTTP error response for auth failures,
 * including the WWW-Authenticate header for missing-token errors.
 */

import { NextResponse } from "next/server";
import { AuthorisationError, ForbiddenError } from "@/lib/errors";
import { unauthorized, forbidden } from "@/lib/apiResponse";

const MISSING_TOKEN_MSG = "Authorization token required";

export function handleAuthError(err: unknown): NextResponse {
  if (err instanceof ForbiddenError) {
    return forbidden(err.message);
  }
  if (err instanceof AuthorisationError) {
    if (err.message === MISSING_TOKEN_MSG) {
      return unauthorized(err.message, { "WWW-Authenticate": 'Bearer realm="ifc-api"' });
    }
    return unauthorized(err.message);
  }
  return unauthorized();
}
