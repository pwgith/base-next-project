"use client";

import { useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/browserClient";
import type { ChatMessage, RelevanceResponse, ExecuteResponse } from "@/types/aiChat";

export type PanelStatus = "idle" | "checking" | "executing" | "error";

interface UseAiChatReturn {
  messages: ChatMessage[];
  panelStatus: PanelStatus;
  sendInstruction: (instruction: string) => Promise<void>;
  clearChat: () => void;
}

export function useAiChat(
  projectId: string,
  onNewVersion?: (version: number) => void,
): UseAiChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [panelStatus, setPanelStatus] = useState<PanelStatus>("idle");

  const getToken = useCallback(async (): Promise<string> => {
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");
    return session.access_token;
  }, []);

  const sendInstruction = useCallback(async (instruction: string) => {
    const trimmed = instruction.trim();
    if (!trimmed) return;

    // Append user message
    const userMessage: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);

    setPanelStatus("checking");

    let token: string;
    try {
      token = await getToken();
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "You must be signed in to use the AI assistant.", variant: "error" },
      ]);
      setPanelStatus("idle");
      return;
    }

    // Build chat history for context (last 10 messages before the new one)
    const chatHistory = messages.slice(-10);

    // 1. Relevance check
    let relevance: RelevanceResponse;
    try {
      const res = await fetch(`/api/projects/${projectId}/ai/relevance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ instruction: trimmed, chatHistory }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message ?? "Unable to validate your instruction right now. Please try again.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorMsg, variant: "error" },
        ]);
        setPanelStatus("idle");
        return;
      }

      const json = await res.json();
      relevance = json.data as RelevanceResponse;
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Unable to validate your instruction right now. Please try again.", variant: "error" },
      ]);
      setPanelStatus("idle");
      return;
    }

    if (!relevance.relevant) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: relevance.reason ?? "That instruction doesn't appear to relate to IFC model editing. Please describe a building model change.",
          variant: "warning",
        },
      ]);
      setPanelStatus("idle");
      return;
    }

    // 2. Execute instruction
    setPanelStatus("executing");

    try {
      const res = await fetch(`/api/projects/${projectId}/ai/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ instruction: trimmed, chatHistory }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message ?? "An error occurred while processing your instruction. Please try again.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorMsg, variant: "error" },
        ]);
        setPanelStatus("idle");
        return;
      }

      const json = await res.json();
      const result = json.data as ExecuteResponse;

      const variant = result.partialFailure ? "warning" : "success";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply, variant, toolCalls: result.toolCalls },
      ]);

      if (result.newVersion !== undefined && onNewVersion) {
        onNewVersion(result.newVersion);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "An error occurred while processing your instruction. Please try again.", variant: "error" },
      ]);
    }

    setPanelStatus("idle");
  }, [messages, projectId, getToken, onNewVersion]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setPanelStatus("idle");
  }, []);

  return { messages, panelStatus, sendInstruction, clearChat };
}
