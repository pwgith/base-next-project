/**
 * Thin wrapper around the OpenAI Chat Completions API.
 * Server-side only — never import from client components.
 */

import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { env } from "@/lib/env";
import { ExternalServiceError } from "@/lib/errors";

const TIMEOUT_MS = 30_000;

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: env.aiApiKey,
      baseURL: env.aiApiUrl,
      timeout: TIMEOUT_MS,
    });
  }
  return client;
}

/** Options for a relevance-check (JSON mode, no tools). */
export interface RelevanceCompletionOptions {
  model: string;
  messages: ChatCompletionMessageParam[];
}

/** Options for an execution call (with tools). */
export interface ExecutionCompletionOptions {
  model: string;
  messages: ChatCompletionMessageParam[];
  tools: ChatCompletionTool[];
}

/**
 * Single non-streaming chat completion for relevance classification.
 * Returns the parsed JSON content of the first choice.
 */
export async function createRelevanceCompletion(
  options: RelevanceCompletionOptions,
): Promise<{ relevant: boolean; reason?: string }> {
  try {
    const response = await getClient().chat.completions.create({
      model: options.model,
      messages: options.messages,
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content) as { relevant: boolean; reason?: string };
  } catch (err) {
    throw mapError(err);
  }
}

/**
 * Chat completion with tool calling support.
 * Returns the raw response for the service layer to handle the tool loop.
 */
export async function createToolCompletion(
  options: ExecutionCompletionOptions,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  try {
    return await getClient().chat.completions.create({
      model: options.model,
      messages: options.messages,
      tools: options.tools,
    });
  } catch (err) {
    throw mapError(err);
  }
}

function mapError(err: unknown): ExternalServiceError {
  if (err instanceof OpenAI.APIError) {
    return new ExternalServiceError(
      `OpenAI API error (${err.status}): ${err.message}`,
    );
  }
  if (err instanceof Error && err.name === "AbortError") {
    return new ExternalServiceError("OpenAI request timed out.");
  }
  return new ExternalServiceError("Unable to reach the AI service.");
}
