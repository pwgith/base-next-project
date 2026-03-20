/**
 * GET    /api/v1/ifc/files/[fileId] — get file metadata
 * DELETE /api/v1/ifc/files/[fileId] — delete an IFC file
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { getProject, deleteProject } from "@/modules/ifc/projectService";
import { getFileMetadata } from "@/modules/ifc/ifcModelService";
import { handleAuthError } from "@/modules/ifc/ifcAuthHelper";
import {
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";
import {
  ok,
  noContent,
  forbidden,
  notFound,
  internalError,
} from "@/lib/apiResponse";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:read");
  } catch (err) {
    return handleAuthError(err);
  }

  try {
    // Verify ownership
    const project = await getProject(supabaseUserId, fileId);
    const meta = await getFileMetadata(fileId);
    return ok({
      fileId: meta.fileId,
      name: project.project.name.endsWith(".ifc") ? project.project.name : `${project.project.name}.ifc`,
      schema: meta.schema,
      createdAt: meta.createdAt.toISOString(),
      elementCount: meta.elementCount,
      currentVersion: meta.currentVersion,
    });
  } catch (err) {
    if (err instanceof NotFoundError) return notFound("IFC file not found");
    if (err instanceof ForbiddenError) return forbidden("Access denied");
    console.error("[GET /api/v1/ifc/files/:fileId]", err);
    return internalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:delete");
  } catch (err) {
    return handleAuthError(err);
  }

  try {
    await deleteProject(supabaseUserId, fileId, true);
    return noContent();
  } catch (err) {
    if (err instanceof NotFoundError) return notFound("IFC file not found");
    console.error("[DELETE /api/v1/ifc/files/:fileId]", err);
    return internalError();
  }
}
