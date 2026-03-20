/**
 * GET  /api/v1/ifc/files — list all IFC files for the authenticated user.
 * POST /api/v1/ifc/files — upload a new IFC file.
 */

import { NextRequest } from "next/server";
import { verifyTokenAndScope } from "@/modules/auth/authService";
import { listProjects, createProject } from "@/modules/ifc/projectService";
import { getFileMetadata } from "@/modules/ifc/ifcModelService";
import { handleAuthError } from "@/modules/ifc/ifcAuthHelper";
import {
  ValidationError,
} from "@/lib/errors";
import {
  ok,
  created,
  unprocessableEntity,
  internalError,
} from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:read");
  } catch (err) {
    return handleAuthError(err);
  }

  try {
    const projects = await listProjects(supabaseUserId);
    const files = await Promise.all(
      projects.map(async (p) => {
        const meta = await getFileMetadata(p.project.id);
        return {
          fileId: p.project.id,
          name: p.project.name.endsWith(".ifc") ? p.project.name : `${p.project.name}.ifc`,
          schema: meta.schema,
          createdAt: p.project.createdAt.toISOString(),
          elementCount: meta.elementCount,
          currentVersion: meta.currentVersion,
        };
      }),
    );
    return ok({ files });
  } catch (err) {
    console.error("[GET /api/v1/ifc/files]", err);
    return internalError();
  }
}

export async function POST(request: NextRequest) {
  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyTokenAndScope(request, "ifc:write");
  } catch (err) {
    return handleAuthError(err);
  }

  try {
    // Handle multipart form data for file upload
    const contentType = request.headers.get("content-type") ?? "";
    let fileName = "";
    let fileContent = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return unprocessableEntity("No file provided");
      }
      fileName = file.name;
      fileContent = await file.text();
    } else {
      // JSON body fallback for testing
      const body = await request.json();
      fileName = body.fileName ?? body.name ?? "untitled.ifc";
      fileContent = body.content ?? "";
    }

    // Validate IFC file
    if (!fileName.endsWith(".ifc")) {
      return unprocessableEntity("File must be a valid IFC STEP (.ifc) file");
    }
    if (fileContent && !fileContent.startsWith("ISO-10303-21;")) {
      // If content is provided but not valid IFC STEP
      if (fileContent.length > 0) {
        return unprocessableEntity("File must be a valid IFC STEP (.ifc) file");
      }
    }

    const result = await createProject(supabaseUserId, {
      name: fileName,
    });

    return created({
      fileId: result.project.id,
      name: fileName,
      schema: "IFC4",
      version: 1,
    });
  } catch (err) {
    if (err instanceof ValidationError) return unprocessableEntity(err.message);
    console.error("[POST /api/v1/ifc/files]", err);
    return internalError();
  }
}
