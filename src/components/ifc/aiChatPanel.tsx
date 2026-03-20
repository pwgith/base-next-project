"use client";

import { useState, useRef, useEffect } from "react";
import { useAiChat } from "@/hooks/useAiChat";
import type { ChatMessage, ToolCallDetail } from "@/types/aiChat";

interface AiChatPanelProps {
  projectId: string;
  onNewVersion?: (version: number) => void;
}

export function AiChatPanel({ projectId, onNewVersion }: AiChatPanelProps) {
  const { messages, panelStatus, sendInstruction, clearChat } = useAiChat(projectId, onNewVersion);
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = panelStatus === "checking" || panelStatus === "executing";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, panelStatus]);

  function handleSubmit() {
    if (isBusy || !inputValue.trim()) return;
    sendInstruction(inputValue);
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 border-l border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <span className="font-semibold text-sm">AI Assistant</span>
        </div>
        <button
          onClick={clearChat}
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors px-2 py-1 rounded hover:bg-slate-100"
          disabled={isBusy}
        >
          Clear
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-sm text-slate-400 text-center mt-8">
            Describe a change to your IFC model, e.g. &quot;Add a wall called North Wall to the ground floor&quot;
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Status indicator */}
        {panelStatus === "checking" && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Spinner />
            Checking relevance…
          </div>
        )}
        {panelStatus === "executing" && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Spinner />
            Executing…
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 px-4 py-3 shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isBusy ? "Processing…" : "Type an instruction…"}
            disabled={isBusy}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSubmit}
            disabled={isBusy || !inputValue.trim()}
            className="shrink-0 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [showToolCalls, setShowToolCalls] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 text-white px-3 py-2 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const variantStyles: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-800",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border border-amber-200",
    error: "bg-red-50 text-red-800 border border-red-200",
  };

  const style = variantStyles[message.variant ?? "neutral"] ?? variantStyles.neutral;
  const showToggle = message.toolCalls !== undefined;

  return (
    <div className="flex justify-start">
      <div className={`max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2 text-sm whitespace-pre-wrap ${style}`}>
        {message.content}
        {showToggle && (
          <div className="mt-2 pt-2 border-t border-current/10">
            <button
              onClick={() => setShowToolCalls(!showToolCalls)}
              className="text-xs font-medium underline decoration-dotted cursor-pointer hover:opacity-80"
              data-testid="toggle-tool-calls"
            >
              {showToolCalls ? "Hide tool calls" : "Show tool calls"}
            </button>
            {showToolCalls && (
              message.toolCalls === null
                ? <div className="mt-2 text-xs italic opacity-70" data-testid="tool-calls-section">Tool-call details are not available for this response</div>
                : <ToolCallDetails toolCalls={message.toolCalls!} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function redactPayload(value: unknown): unknown {
  if (typeof value === "string") {
    if (/^(bearer\s)/i.test(value)) return "[REDACTED]";
    return value;
  }
  if (Array.isArray(value)) return value.map(redactPayload);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/^authorization$/i.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redactPayload(v);
      }
    }
    return out;
  }
  return value;
}

function ToolCallDetails({ toolCalls }: { toolCalls: ToolCallDetail[] }) {
  if (toolCalls.length === 0) {
    return (
      <div className="mt-2 text-xs italic opacity-70" data-testid="tool-calls-section">
        No tool calls were made for this response
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2" data-testid="tool-calls-section">
      {toolCalls.map((tc, i) => (
        <div
          key={i}
          className={`rounded border p-2 text-xs font-mono ${tc.error ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}
          data-testid="tool-call-item"
          data-error={tc.error ? "true" : "false"}
        >
          <div className="flex items-center gap-2 font-semibold">
            <span data-testid="tool-call-method">{tc.method}</span>
            <span className="truncate" data-testid="tool-call-path">{tc.path}</span>
            <span
              className={`ml-auto ${tc.error ? "text-red-600" : "text-emerald-600"}`}
              data-testid="tool-call-status"
            >
              {tc.statusCode}
            </span>
            <span className="text-slate-400" data-testid="tool-call-duration">{tc.durationMs}ms</span>
          </div>
          {tc.requestPayload != null && (
            <details className="mt-1">
              <summary className="cursor-pointer text-slate-500">Request payload</summary>
              <pre className="mt-1 overflow-auto max-h-32 text-[10px] leading-tight" data-testid="tool-call-request-payload">
                {JSON.stringify(redactPayload(tc.requestPayload), null, 2)}
              </pre>
            </details>
          )}
          <details className="mt-1">
            <summary className="cursor-pointer text-slate-500">Response body</summary>
            <pre className="mt-1 overflow-auto max-h-32 text-[10px] leading-tight" data-testid="tool-call-response-body">
              {JSON.stringify(redactPayload(tc.responseBody), null, 2)}
            </pre>
          </details>
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
