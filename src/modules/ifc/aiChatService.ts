/**
 * Application service — orchestrates AI relevance check and execution.
 * Server-side only.
 */

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ChatMessage, RelevanceResponse, ExecuteResponse, ToolCallDetail } from "@/types/aiChat";
import { createRelevanceCompletion, createToolCompletion } from "@/services/openAiClient";
import { dispatch, toolDefinitions, type DispatchContext } from "@/modules/ifc/aiToolDispatcher";
import { env } from "@/lib/env";

const RELEVANCE_SYSTEM_PROMPT = `You are a classification assistant. Your only task is to determine whether the user's message describes an IFC building model editing operation.

Valid operations include: adding, modifying, removing, or querying building elements (walls, slabs, doors, windows, beams, columns, roofs, stairs, railings), storeys, spaces/rooms, materials, property sets, geometry, placement, classifications, or any other IFC model data.

Follow-up messages that refer to a previous valid instruction (e.g. "make it taller", "add another one") are also valid.

Messages that are NOT valid include: general knowledge questions, weather, jokes, code assistance, anything unrelated to IFC model editing.

Respond ONLY with a JSON object: { "relevant": true } or { "relevant": false, "reason": "<one sentence explanation>" }. No other text.`;

const EXECUTION_SYSTEM_PROMPT = `You are an IFC building model editing assistant. You modify a building information model by calling the provided tools.

Rules:
- Use the provided tools to make changes to the IFC model. Do not describe changes without making them.
- Before creating elements, use getSpatialStructure to discover existing storey IDs.
- Be precise with IFC types: use IfcWall, IfcSlab, IfcDoor, IfcWindow, IfcBeam, IfcColumn, IfcRoof, IfcStair, etc.
- If the user's instruction is ambiguous and you cannot determine the correct action, ask a clarifying question instead of guessing.
- After making changes, summarise what you did in plain language.
- If a tool call fails, report the failure and explain what went wrong.
- Do not invent globalIds — always look them up first using listElements or getSpatialStructure.

IMPORTANT — Geometry and placement are REQUIRED for elements to appear in the 3D viewer:
- After every createElement call, you MUST immediately call setElementPlacement and setElementGeometry on the returned globalId.
- Without both of these calls the element exists in the database but is completely invisible in the 3D model — the user will not see it.
- For windows and doors: use the host wall's position and orientation to derive the correct placement; set width and extrusionDepth (= height) to realistic values (e.g. window: width 0.9 m, extrusionDepth 1.2 m, depth 0.1 m).
- For walls: typical extrusionDepth is the storey height (e.g. 2.8 m); width is the wall length; depth is the wall thickness (e.g. 0.2 m).
- Never consider createElement alone as completing the task of adding a visible element.`;

const MAX_HISTORY_MESSAGES = 10;

function chatHistoryToMessages(history: ChatMessage[]): ChatCompletionMessageParam[] {
  return history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

export async function checkRelevance(
  instruction: string,
  chatHistory: ChatMessage[],
): Promise<RelevanceResponse> {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: RELEVANCE_SYSTEM_PROMPT },
    ...chatHistoryToMessages(chatHistory),
    { role: "user", content: instruction },
  ];

  return createRelevanceCompletion({
    model: env.aiRelevanceModel,
    messages,
  });
}

export async function executeInstruction(
  instruction: string,
  chatHistory: ChatMessage[],
  ctx: DispatchContext,
): Promise<ExecuteResponse> {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: EXECUTION_SYSTEM_PROMPT },
    ...chatHistoryToMessages(chatHistory),
    { role: "user", content: instruction },
  ];

  const maxIterations = env.aiMaxToolIterations;
  let latestVersion: number | undefined;
  let hadError = false;
  const toolCallDetails: ToolCallDetail[] = [];

  for (let i = 0; i < maxIterations; i++) {
    const response = await createToolCompletion({
      model: env.aiExecutionModel,
      messages,
      tools: toolDefinitions,
    });

    const choice = response.choices[0];
    if (!choice) break;

    const assistantMessage = choice.message;
    messages.push(assistantMessage);

    // No tool calls — final reply
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return {
        reply: assistantMessage.content ?? "Done.",
        newVersion: latestVersion,
        partialFailure: hadError && latestVersion !== undefined,
        toolCalls: toolCallDetails,
      };
    }

    // Dispatch each tool call
    for (const toolCall of assistantMessage.tool_calls) {
      if (!("function" in toolCall)) continue;

      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      const result = await dispatch(
        toolCall.id,
        toolCall.function.name,
        args,
        ctx,
      );

      toolCallDetails.push({
        method: result.method ?? "UNKNOWN",
        path: result.path ?? "",
        requestPayload: result.requestPayload ?? null,
        statusCode: result.statusCode ?? 0,
        responseBody: result.error ? { error: result.error } : result.result,
        durationMs: result.durationMs ?? 0,
        error: !!result.error,
      });

      if (result.error) {
        hadError = true;
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: result.error }),
        });
      } else {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result.result),
        });

        // Extract version from successful tool results
        const data = result.result as Record<string, unknown> | null;
        if (data && typeof data === "object" && "data" in data) {
          const inner = data.data as Record<string, unknown>;
          if (inner && typeof inner.version === "number") {
            latestVersion = inner.version;
          }
        }
      }
    }
  }

  // Iteration cap reached
  const lastAssistant = messages
    .filter((m) => m.role === "assistant" && "content" in m && m.content)
    .pop();
  const reply = (lastAssistant && "content" in lastAssistant ? lastAssistant.content : null)
    ?? "I've reached the maximum number of steps. The model may be partially updated — please check the viewer.";

  return {
    reply: reply as string,
    newVersion: latestVersion,
    partialFailure: hadError || true,
    toolCalls: toolCallDetails,
  };
}
