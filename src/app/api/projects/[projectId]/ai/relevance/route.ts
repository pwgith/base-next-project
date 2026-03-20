/**
 * POST /api/projects/[projectId]/ai/relevance
 * Check whether a user instruction is relevant to IFC model editing.
 */

import { NextRequest } from "next/server";
import { verifyToken } from "@/modules/auth/authService";
import { getProject } from "@/modules/ifc/projectService";
import { checkRelevance } from "@/modules/ifc/aiChatService";
import { AuthorisationError, ExternalServiceError, NotFoundError } from "@/lib/errors";
import { ok, badRequest, unauthorized, notFound, badGateway, internalError } from "@/lib/apiResponse";
import type { RelevanceRequest } from "@/types/aiChat";

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

  let body: RelevanceRequest;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  if (!body.instruction || typeof body.instruction !== "string" || body.instruction.trim().length === 0) {
    return badRequest("instruction must not be empty.", "VALIDATION_ERROR");
  }

  try {
    const result = await checkRelevance(body.instruction, body.chatHistory ?? []);
    return ok(result);
  } catch (err) {
    if (err instanceof ExternalServiceError) {
      return badGateway("Unable to reach the AI service. Please try again.", "AI_UNAVAILABLE");
    }
    console.error("[POST /ai/relevance]", err);
    return internalError();
  }
}
