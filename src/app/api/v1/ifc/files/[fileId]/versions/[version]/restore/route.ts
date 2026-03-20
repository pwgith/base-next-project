/**
 * POST /api/v1/ifc/files/[fileId]/versions/[version]/restore — restore version
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { restoreVersion } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, created, unauthorized, forbidden, notFound, internalError } from "@/lib/apiResponse";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; version: string }> },
) {
  const { fileId, version } = await params;
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
    const result = await restoreVersion(fileId, parseInt(version, 10), supabaseUserId);
    return created(result);
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[POST restore version]", err);
    return internalError();
  }
}
