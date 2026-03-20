/**
 * POST /api/projects/[projectId]/ai/execute
 * Execute a user instruction against the IFC model via AI agent.
 */

import { NextRequest } from "next/server";
import { verifyToken } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { executeInstruction } from "@/modules/ifc/aiChatService";
import { AuthorisationError, ExternalServiceError, NotFoundError } from "@/lib/errors";
import { ok, badRequest, unauthorized, notFound, badGateway, internalError } from "@/lib/apiResponse";
import type { ExecuteRequest } from "@/types/aiChat";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  let supabaseUserId: string;
  try {
    supabaseUserId = await verifyToken(request);
  } catch (err) {
    if (err instanceof AuthorisationError) return unauthorized(err.message);
    return unauthorized();
  }

  try {
    await getProject(supabaseUserId, projectId);
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(err.message);
    return internalError();
  }

  let body: ExecuteRequest;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  if (!body.instruction || typeof body.instruction !== "string" || body.instruction.trim().length === 0) {
    return badRequest("instruction must not be empty.", "VALIDATION_ERROR");
  }

  // Extract the user's JWT to pass through to IFC API calls
  const authHeader = request.headers.get("Authorization") ?? "";
  const userToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const result = await executeInstruction(
      body.instruction,
      body.chatHistory ?? [],
      { projectId, userToken, baseUrl },
    );
    return ok(result);
  } catch (err) {
    if (err instanceof ExternalServiceError) {
      return badGateway("An error occurred while processing your instruction. Please try again.", "AI_UNAVAILABLE");
    }
    console.error("[POST /ai/execute]", err);
    return internalError();
  }
}
