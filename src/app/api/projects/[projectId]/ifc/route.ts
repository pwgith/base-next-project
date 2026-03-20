/**
 * GET /api/projects/[projectId]/ifc — serve the latest IFC STEP file
 * for the authenticated user's project.
 *
 * This is a UI API endpoint: auth is read from the sb_session cookie
 * set during sign-in, not from an Authorization header.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/serverClient";
import { getProject } from "@/modules/ifc/projectService";
import { downloadFile } from "@/modules/ifc/ifcModelService";
import { NotFoundError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<NextResponse | Response> {
  const { projectId } = await params;

  // Read auth from the sb_session cookie (UI API pattern)
  const sessionCookie = request.cookies.get("sb_session");
  if (!sessionCookie?.value) {
    return NextResponse.json(
      { error: { message: "Authentication required." } },
      { status: 401 },
    );
  }

  const supabase = createServerClient();
  const { data, error: authError } = await supabase.auth.getUser(
    sessionCookie.value,
  );

  if (authError || !data.user) {
    return NextResponse.json(
      { error: { message: "Token is invalid or has expired." } },
      { status: 401 },
    );
  }

  const supabaseUserId = data.user.id;

  try {
    // Ownership check — getProject throws NotFoundError if not owned by user
    await getProject(supabaseUserId, projectId);
    const { contentType, body } = await downloadFile(projectId);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { error: { message: err.message } },
        { status: 404 },
      );
    }
    console.error("[GET /api/projects/:projectId/ifc]", err);
    return NextResponse.json(
      { error: { message: "An unexpected error occurred." } },
      { status: 500 },
    );
  }
}
