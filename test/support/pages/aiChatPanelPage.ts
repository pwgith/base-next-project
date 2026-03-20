import { Page, Locator } from "playwright";
import type { ToolCallDetail } from "@/types/aiChat";

/**
 * Page Object for the AI Chat Panel within the IFC Workspace page.
 * Encapsulates Playwright locators for the chat UI.
 */
export class AiChatPanelPage {
  private readonly page: Page;

  // --- Locators (defined once) ---
  readonly chatPanel: Locator;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly clearButton: Locator;
  readonly assistantTitle: Locator;
  readonly statusChecking: Locator;
  readonly statusExecuting: Locator;
  readonly emptyStateHint: Locator;

  constructor(page: Page) {
    this.page = page;
    this.chatPanel = page.locator(".border-l.border-slate-200").first();
    this.chatInput = page.getByPlaceholder("Type an instruction…");
    this.sendButton = page.locator("button").filter({ has: page.locator('svg path[d*="M6 12L3.269"]') });
    this.clearButton = page.getByRole("button", { name: "Clear" });
    this.assistantTitle = page.getByText("AI Assistant");
    this.statusChecking = page.getByText("Checking relevance…");
    this.statusExecuting = page.getByText("Executing…");
    this.emptyStateHint = page.getByText("Describe a change to your IFC model");
  }

  /** Wait for the chat panel to be visible. */
  async waitForVisible(): Promise<void> {
    await this.assistantTitle.waitFor({ state: "visible", timeout: 30_000 });
  }

  /** Type text into the chat input. */
  async typeInstruction(text: string): Promise<void> {
    await this.chatInput.fill(text);
  }

  /** Click the send button. */
  async clickSend(): Promise<void> {
    await this.sendButton.click();
  }

  /** Submit an instruction by typing and clicking send. */
  async submitInstruction(text: string): Promise<void> {
    await this.chatInput.fill(text);
    await this.sendButton.click();
  }

  /** Wait for a response from the assistant (any new assistant message). */
  async waitForAssistantResponse(timeout = 60_000): Promise<void> {
    // Wait for status indicators to appear then disappear, or for an assistant message
    // First wait briefly in case status appears
    const statusOrMessage = this.page.locator(
      ".rounded-2xl.rounded-bl-md, .text-xs.text-slate-500, .text-xs.text-blue-600",
    );
    await statusOrMessage.first().waitFor({ state: "visible", timeout }).catch(() => {});
    // Then wait for status indicators to vanish (response complete)
    await this.statusChecking.waitFor({ state: "hidden", timeout }).catch(() => {});
    await this.statusExecuting.waitFor({ state: "hidden", timeout }).catch(() => {});
    // Small wait for the final message to render
    await this.page.waitForTimeout(500);
  }

  /** Returns all user message texts in the chat. */
  async getUserMessages(): Promise<string[]> {
    const bubbles = this.page.locator(".bg-blue-600.text-white.rounded-2xl");
    const count = await bubbles.count();
    const msgs: string[] = [];
    for (let i = 0; i < count; i++) {
      msgs.push((await bubbles.nth(i).textContent()) ?? "");
    }
    return msgs;
  }

  /** Returns all assistant message texts in the chat. */
  async getAssistantMessages(): Promise<string[]> {
    const bubbles = this.page.locator(".rounded-2xl.rounded-bl-md");
    const count = await bubbles.count();
    const msgs: string[] = [];
    for (let i = 0; i < count; i++) {
      msgs.push((await bubbles.nth(i).textContent()) ?? "");
    }
    return msgs;
  }

  /** Returns the last assistant message text. */
  async getLastAssistantMessage(): Promise<string> {
    const bubbles = this.page.locator(".rounded-2xl.rounded-bl-md");
    const count = await bubbles.count();
    if (count === 0) return "";
    return (await bubbles.nth(count - 1).textContent()) ?? "";
  }

  /** Returns the CSS class of the last assistant message (for variant detection). */
  async getLastAssistantMessageVariant(): Promise<string> {
    const bubbles = this.page.locator(".rounded-2xl.rounded-bl-md");
    const count = await bubbles.count();
    if (count === 0) return "";
    const classes = (await bubbles.nth(count - 1).getAttribute("class")) ?? "";
    if (classes.includes("bg-emerald-50")) return "success";
    if (classes.includes("bg-amber-50")) return "warning";
    if (classes.includes("bg-red-50")) return "error";
    return "neutral";
  }

  /** Returns true if the chat input is enabled (ready for input). */
  async isInputEnabled(): Promise<boolean> {
    return !(await this.chatInput.isDisabled());
  }

  /** Returns true if the "Checking relevance…" indicator is visible. */
  async isCheckingRelevanceVisible(): Promise<boolean> {
    return this.statusChecking.isVisible();
  }

  /** Returns true if the "Executing…" indicator is visible. */
  async isExecutingVisible(): Promise<boolean> {
    return this.statusExecuting.isVisible();
  }

  /** Returns the input placeholder text. */
  async getInputPlaceholder(): Promise<string> {
    return (await this.chatInput.getAttribute("placeholder")) ?? "";
  }

  /** Click Clear to reset the chat. */
  async clearChat(): Promise<void> {
    await this.clearButton.click();
  }

  /** Returns the count of assistant messages in the chat. */
  async getAssistantMessageCount(): Promise<number> {
    return this.page.locator(".rounded-2xl.rounded-bl-md").count();
  }

  /** Returns the count of user messages in the chat. */
  async getUserMessageCount(): Promise<number> {
    return this.page.locator(".bg-blue-600.text-white.rounded-2xl").count();
  }

  /**
   * Mock the relevance endpoint to return a specific response.
   * Must be called before submitting the instruction.
   */
  async mockRelevanceEndpoint(
    response: { relevant: boolean; reason?: string },
    statusCode = 200,
  ): Promise<void> {
    await this.page.route("**/api/projects/*/ai/relevance", (route) =>
      route.fulfill({
        status: statusCode,
        contentType: "application/json",
        body: JSON.stringify({ data: response }),
      }),
    );
  }

  /**
   * Mock the execute endpoint to return a specific response.
   */
  async mockExecuteEndpoint(
    response: { reply: string; newVersion?: number; partialFailure?: boolean; toolCalls?: ToolCallDetail[] | null },
    statusCode = 200,
  ): Promise<void> {
    await this.page.route("**/api/projects/*/ai/execute", (route) =>
      route.fulfill({
        status: statusCode,
        contentType: "application/json",
        body: JSON.stringify({ data: response }),
      }),
    );
  }

  /**
   * Mock the relevance endpoint to return a 502 error.
   */
  async mockRelevanceUnavailable(): Promise<void> {
    await this.page.route("**/api/projects/*/ai/relevance", (route) =>
      route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "AI_UNAVAILABLE",
            message: "Unable to reach the AI service. Please try again.",
          },
        }),
      }),
    );
  }

  /**
   * Mock the execute endpoint to return a 502 error.
   */
  async mockExecuteUnavailable(): Promise<void> {
    await this.page.route("**/api/projects/*/ai/execute", (route) =>
      route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "AI_UNAVAILABLE",
            message: "An error occurred while processing your instruction. Please try again.",
          },
        }),
      }),
    );
  }

  /** Clear all AI endpoint mocks. */
  async clearAiMocks(): Promise<void> {
    await this.page.unroute("**/api/projects/*/ai/relevance").catch(() => {});
    await this.page.unroute("**/api/projects/*/ai/execute").catch(() => {});
  }

  // ─── Tool Call Inspection ─────────────────────────────────────────────────

  /** Returns true if the "Show tool calls" toggle is visible on the last assistant message. */
  async isToolCallToggleVisible(): Promise<boolean> {
    const bubbles = this.page.locator(".rounded-2xl.rounded-bl-md");
    const count = await bubbles.count();
    if (count === 0) return false;
    const lastBubble = bubbles.nth(count - 1);
    return lastBubble.getByTestId("toggle-tool-calls").isVisible();
  }

  /** Click the "Show tool calls" / "Hide tool calls" toggle on the last assistant message. */
  async toggleToolCalls(): Promise<void> {
    const bubbles = this.page.locator(".rounded-2xl.rounded-bl-md");
    const count = await bubbles.count();
    if (count === 0) throw new Error("No assistant messages found");
    const lastBubble = bubbles.nth(count - 1);
    await lastBubble.getByTestId("toggle-tool-calls").click();
  }

  /** Returns true if the tool-calls detail section is visible on the last assistant message. */
  async isToolCallSectionVisible(): Promise<boolean> {
    const bubbles = this.page.locator(".rounded-2xl.rounded-bl-md");
    const count = await bubbles.count();
    if (count === 0) return false;
    const lastBubble = bubbles.nth(count - 1);
    return lastBubble.getByTestId("tool-calls-section").isVisible();
  }

  /** Returns the number of tool call items displayed in the detail section. */
  async getToolCallCount(): Promise<number> {
    const bubbles = this.page.locator(".rounded-2xl.rounded-bl-md");
    const count = await bubbles.count();
    if (count === 0) return 0;
    const lastBubble = bubbles.nth(count - 1);
    return lastBubble.getByTestId("tool-call-item").count();
  }

  /** Returns the HTTP method of the nth tool call (0-based index). */
  async getToolCallMethod(index: number): Promise<string> {
    const items = this.page.getByTestId("tool-call-item");
    return (await items.nth(index).getByTestId("tool-call-method").textContent()) ?? "";
  }

  /** Returns the path of the nth tool call (0-based index). */
  async getToolCallPath(index: number): Promise<string> {
    const items = this.page.getByTestId("tool-call-item");
    return (await items.nth(index).getByTestId("tool-call-path").textContent()) ?? "";
  }

  /** Returns the status code of the nth tool call (0-based index). */
  async getToolCallStatusCode(index: number): Promise<string> {
    const items = this.page.getByTestId("tool-call-item");
    return (await items.nth(index).getByTestId("tool-call-status").textContent()) ?? "";
  }

  /** Returns the duration of the nth tool call (0-based index). */
  async getToolCallDuration(index: number): Promise<string> {
    const items = this.page.getByTestId("tool-call-item");
    return (await items.nth(index).getByTestId("tool-call-duration").textContent()) ?? "";
  }

  /** Returns the data-error attribute of the nth tool call (0-based index). */
  async isToolCallError(index: number): Promise<boolean> {
    const items = this.page.getByTestId("tool-call-item");
    return (await items.nth(index).getAttribute("data-error")) === "true";
  }

  /** Returns true if the request payload section exists and is expandable for the nth tool call. */
  async hasToolCallRequestPayload(index: number): Promise<boolean> {
    const items = this.page.getByTestId("tool-call-item");
    const item = items.nth(index);
    const payloadEl = item.getByTestId("tool-call-request-payload");
    return (await payloadEl.count()) > 0;
  }

  /** Returns true if the response body section exists for the nth tool call. */
  async hasToolCallResponseBody(index: number): Promise<boolean> {
    const items = this.page.getByTestId("tool-call-item");
    const item = items.nth(index);
    const bodyEl = item.getByTestId("tool-call-response-body");
    return (await bodyEl.count()) > 0;
  }

  /** Returns the text content of the tool-calls section (for "No tool calls" message). */
  async getToolCallSectionText(): Promise<string> {
    const bubbles = this.page.locator(".rounded-2xl.rounded-bl-md");
    const count = await bubbles.count();
    if (count === 0) return "";
    const lastBubble = bubbles.nth(count - 1);
    return (await lastBubble.getByTestId("tool-calls-section").textContent()) ?? "";
  }

  /** Returns the request payload text of the nth tool call. */
  async getToolCallRequestPayloadText(index: number): Promise<string> {
    const items = this.page.getByTestId("tool-call-item");
    const item = items.nth(index);
    // Open the details element first
    await item.locator("details").first().locator("summary").click();
    return (await item.getByTestId("tool-call-request-payload").textContent()) ?? "";
  }

  /** Returns the response body text of the nth tool call. */
  async getToolCallResponseBodyText(index: number): Promise<string> {
    const items = this.page.getByTestId("tool-call-item");
    const item = items.nth(index);
    // Open the response details element
    await item.locator("details").last().locator("summary").click();
    return (await item.getByTestId("tool-call-response-body").textContent()) ?? "";
  }
}
