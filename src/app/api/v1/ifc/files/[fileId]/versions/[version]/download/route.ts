/**
 * GET /api/v1/ifc/files/[fileId]/versions/[version]/download — download snapshot at version
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { exportVersionSnapshot } from "@/modules/ifc/ifcModelService";
import { AuthorisationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { unauthorized, forbidden, notFound, internalError } from "@/lib/apiResponse";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; version: string }> },
) {
  const { fileId, version } = await params;
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
    const result = await exportVersionSnapshot(fileId, parseInt(version, 10), project.name);
    return new Response(result.body, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    console.error("[GET version download]", err);
    return internalError();
  }
}
