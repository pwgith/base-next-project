/** A single turn in the chat history sent to and from API routes. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  variant?: "neutral" | "success" | "warning" | "error";
  toolCalls?: ToolCallDetail[] | null;
}

/** POST /api/projects/:id/ai/relevance — request body. */
export interface RelevanceRequest {
  instruction: string;
  chatHistory: ChatMessage[];
}

/** POST /api/projects/:id/ai/relevance — response body (inside `data`). */
export interface RelevanceResponse {
  relevant: boolean;
  reason?: string;
}

/** POST /api/projects/:id/ai/execute — request body. */
export interface ExecuteRequest {
  instruction: string;
  chatHistory: ChatMessage[];
}

/** Detail of a single tool call made by the AI agent during execution. */
export interface ToolCallDetail {
  method: string;
  path: string;
  requestPayload: unknown;
  statusCode: number;
  responseBody: unknown;
  durationMs: number;
  error: boolean;
}

/** POST /api/projects/:id/ai/execute — response body (inside `data`). */
export interface ExecuteResponse {
  reply: string;
  newVersion?: number;
  partialFailure?: boolean;
  toolCalls?: ToolCallDetail[] | null;
}

/** Internal — describes a single tool call the agent wants to make. */
export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** Internal — result of dispatching one tool call. */
export interface ToolCallResult {
  toolCallId: string;
  result: unknown;
  error?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  requestPayload?: unknown;
  durationMs?: number;
}
