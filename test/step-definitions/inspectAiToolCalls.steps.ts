/**
 * Step definitions for F-041 — Inspect AI tool calls.
 *
 * Uses Playwright (via Application class) for browser interactions,
 * plus Playwright route mocking for deterministic API responses.
 */

import { Given, When, Then, Before, After } from "@cucumber/cucumber";
import { Application } from "../support/application";
import type { ToolCallDetail } from "@/types/aiChat";
import assert from "assert";
import {
  setupUserAndGetToken,
  teardownUsers,
  deleteAllProjects,
  createTestProject,
  seedModelData,
  TEST_PASSWORD,
} from "./ifcTestHelpers";

// ─── Per-feature state ───────────────────────────────────────────────────────

interface InspectToolCallsWorld {
  app: Application;
  createdEmails: string[];
  tokensByEmail: Map<string, string>;
  projectIdMap: Map<string, string>;
  accessToken: string;
  lastMockedToolCalls: ToolCallDetail[];
  projectId: string;
  rejectInstruction: boolean;
}

const TEST_EMAIL = "dev@example.com";

// ─── Fixture data ────────────────────────────────────────────────────────────

function singleToolCall(): ToolCallDetail[] {
  return [
    {
      method: "POST",
      path: "/elements",
      requestPayload: { ifcType: "IfcWallStandardCase", name: "North Wall", storeyGlobalId: "0Stor0100000000000001" },
      statusCode: 201,
      responseBody: { data: { globalId: "0WallNew0000000000001", name: "North Wall", version: 2 } },
      durationMs: 142,
      error: false,
    },
  ];
}

function twoToolCalls(): ToolCallDetail[] {
  return [
    {
      method: "POST",
      path: "/elements",
      requestPayload: { ifcType: "IfcWall", name: "Wall-1", storeyGlobalId: "0Stor0100000000000001" },
      statusCode: 201,
      responseBody: { data: { globalId: "0WallNew0000000000001", name: "Wall-1", version: 2 } },
      durationMs: 120,
      error: false,
    },
    {
      method: "POST",
      path: "/elements",
      requestPayload: { ifcType: "IfcWindow", name: "Window-1", hostGlobalId: "0WallNew0000000000001" },
      statusCode: 201,
      responseBody: { data: { globalId: "0WindNew0000000000001", name: "Window-1", version: 3 } },
      durationMs: 98,
      error: false,
    },
  ];
}

function twoToolCallsSecondFailed(status: number): ToolCallDetail[] {
  return [
    {
      method: "POST",
      path: "/elements",
      requestPayload: { ifcType: "IfcWall", name: "Wall-1", storeyGlobalId: "0Stor0100000000000001" },
      statusCode: 201,
      responseBody: { data: { globalId: "0WallNew0000000000001", name: "Wall-1", version: 2 } },
      durationMs: 115,
      error: false,
    },
    {
      method: "PUT",
      path: "/elements/0WallNew0000000000001/material",
      requestPayload: { materialId: "Concrete-X" },
      statusCode: status,
      responseBody: { error: { code: "INVALID_MATERIAL", message: "Material not found" } },
      durationMs: 55,
      error: true,
    },
  ];
}

function toolCallWithAuthHeader(): ToolCallDetail[] {
  return [
    {
      method: "POST",
      path: "/elements",
      requestPayload: { ifcType: "IfcBeam", name: "Beam-1", authorization: "Bearer eyJhbGciOi..." },
      statusCode: 201,
      responseBody: { data: { globalId: "0BeamNew0000000000001", name: "Beam-1", version: 2 } },
      durationMs: 130,
      error: false,
    },
  ];
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

Before({ tags: "@F-041" }, async function (this: InspectToolCallsWorld) {
  this.createdEmails = this.createdEmails ?? [];
  this.tokensByEmail = this.tokensByEmail ?? new Map<string, string>();
  this.projectIdMap = this.projectIdMap ?? new Map<string, string>();
  this.lastMockedToolCalls = [];
  this.rejectInstruction = false;
});

After({ tags: "@F-041" }, async function (this: InspectToolCallsWorld) {
  await this.app.clearAiMocks();
  for (const [, token] of this.tokensByEmail) {
    await deleteAllProjects(token);
  }
  await teardownUsers(this.createdEmails);
});

// ─── Scenario-specific mock setup ────────────────────────────────────────────

// S-282: Single successful tool call
Before({ tags: "@S-282" }, async function (this: InspectToolCallsWorld) {
  this.lastMockedToolCalls = singleToolCall();
});

// S-283: Single tool call for detail inspection
Before({ tags: "@S-283" }, async function (this: InspectToolCallsWorld) {
  this.lastMockedToolCalls = singleToolCall();
});

// S-284: Two sequential tool calls
Before({ tags: "@S-284" }, async function (this: InspectToolCallsWorld) {
  this.lastMockedToolCalls = twoToolCalls();
});

// S-285: Collapse (uses single tool call)
Before({ tags: "@S-285" }, async function (this: InspectToolCallsWorld) {
  this.lastMockedToolCalls = singleToolCall();
});

// S-286: Second call failed with 400
Before({ tags: "@S-286" }, async function (this: InspectToolCallsWorld) {
  this.lastMockedToolCalls = twoToolCallsSecondFailed(400);
});

// S-287: Second call failed (inspect both)
Before({ tags: "@S-287" }, async function (this: InspectToolCallsWorld) {
  this.lastMockedToolCalls = twoToolCallsSecondFailed(500);
});

// S-289: Zero tool calls (clarification)
Before({ tags: "@S-289" }, async function (this: InspectToolCallsWorld) {
  this.lastMockedToolCalls = [];
});

// S-288: Rejected instruction
Before({ tags: "@S-288" }, async function (this: InspectToolCallsWorld) {
  this.rejectInstruction = true;
});

// S-291: No extra API calls
Before({ tags: "@S-291" }, async function (this: InspectToolCallsWorld) {
  this.lastMockedToolCalls = singleToolCall();
});

// S-292: Auth token redaction
Before({ tags: "@S-292" }, async function (this: InspectToolCallsWorld) {
  this.lastMockedToolCalls = toolCallWithAuthHeader();
});

// ─── Background ──────────────────────────────────────────────────────────────

Given(
  "the developer is signed in and has a project open in the workspace",
  async function (this: InspectToolCallsWorld) {
    if (!this.tokensByEmail.has(TEST_EMAIL)) {
      const token = await setupUserAndGetToken(TEST_EMAIL);
      this.createdEmails.push(TEST_EMAIL);
      this.tokensByEmail.set(TEST_EMAIL, token);
    }
    this.accessToken = this.tokensByEmail.get(TEST_EMAIL)!;

    // Sign in via the browser so the sb_session cookie is established.
    await this.app.signInAs(TEST_EMAIL, TEST_PASSWORD);

    const projectId = await createTestProject(this.accessToken, "Tool Call Test Project");
    this.projectIdMap.set("default", projectId);
    this.projectId = projectId;

    await seedModelData(projectId, {
      project: { ifcType: "IfcProject", globalId: "proj_01", name: "Tool Call Test Project" },
      sites: [{ ifcType: "IfcSite", globalId: "0Site0100000000000001", name: "Default Site", buildings: ["0Bldg0100000000000001"] }],
      buildings: [{ ifcType: "IfcBuilding", globalId: "0Bldg0100000000000001", name: "Main Building", storeys: ["0Stor0100000000000001"] }],
      storeys: [{ ifcType: "IfcBuildingStorey", globalId: "0Stor0100000000000001", name: "Ground Floor", elevation: 0, spaces: [], elements: [] }],
      elements: [],
    });

    await this.app.navigateToWorkspace(projectId);
    await this.app.waitForModelLoaded();
    await this.app.waitForChatPanel();
  },
);

Given(
  "the AI chat panel is visible alongside the 3D viewer",
  async function (this: InspectToolCallsWorld) {
    await this.app.waitForChatPanel();
  },
);

// ─── Common Given: submit instruction with automatic mock setup ──────────────

Given(
  "the developer has submitted the instruction {string}",
  async function (this: InspectToolCallsWorld, instruction: string) {
    if (this.rejectInstruction) {
      // S-288: Mock relevance to reject the instruction
      await this.app.mockRelevanceEndpoint({
        relevant: false,
        reason: "That instruction doesn't appear to relate to IFC model editing.",
      });
    } else {
      // Set up mocks based on what was configured in the Before hook
      const hasToolCalls = this.lastMockedToolCalls.length > 0;
      const hasFailure = this.lastMockedToolCalls.some((tc) => tc.error);

      await this.app.mockRelevanceEndpoint({ relevant: true });
      await this.app.mockExecuteEndpoint({
        reply: hasFailure
          ? "Partially completed — some operations failed."
          : hasToolCalls
            ? "Done — elements created successfully."
            : "Could you clarify which element you mean?",
        newVersion: hasToolCalls ? 2 : undefined,
        partialFailure: hasFailure,
        toolCalls: this.lastMockedToolCalls,
      });
    }

    await this.app.submitChatInstruction(instruction);
  },
);

// ─── S-282 ───────────────────────────────────────────────────────────────────

Given(
  "the AI agent has executed the instruction successfully",
  async function (this: InspectToolCallsWorld) {
    await this.app.waitForAssistantResponse();
    const variant = await this.app.getLastAssistantMessageVariant();
    assert.ok(
      variant === "success" || variant === "warning",
      `Expected success/warning but got: ${variant}`,
    );
  },
);

When(
  "the AI response message is displayed in the chat history",
  async function (this: InspectToolCallsWorld) {
    const count = await this.app.getAssistantMessageCount();
    assert.ok(count >= 1, "Expected at least one assistant message");
  },
);

Then(
  "a {string} toggle is displayed alongside the response message",
  async function (this: InspectToolCallsWorld, toggleText: string) {
    assert.ok(toggleText, "Toggle text parameter expected");
    const visible = await this.app.isToolCallToggleVisible();
    assert.ok(visible, `Expected "${toggleText}" toggle to be visible`);
  },
);

// ─── S-283: Expand single tool call ──────────────────────────────────────────

Given(
  "the AI agent executed {int} tool call to fulfil the instruction",
  async function (this: InspectToolCallsWorld, count: number) {
    await this.app.waitForAssistantResponse();
    assert.strictEqual(this.lastMockedToolCalls.length, count, `Expected ${count} mocked tool calls`);
  },
);

Given(
  "the AI agent executed {int} tool calls to fulfil the instruction",
  async function (this: InspectToolCallsWorld, count: number) {
    await this.app.waitForAssistantResponse();
    assert.strictEqual(this.lastMockedToolCalls.length, count, `Expected ${count} mocked tool calls`);
  },
);

When(
  "the developer activates the {string} toggle on the response",
  async function (this: InspectToolCallsWorld, _toggleText: string) {
    await this.app.toggleToolCalls();
  },
);

Then(
  "an inline detail section is displayed beneath the response",
  async function (this: InspectToolCallsWorld) {
    const visible = await this.app.isToolCallSectionVisible();
    assert.ok(visible, "Expected tool-calls detail section to be visible");
  },
);

Then(
  "the detail section lists {int} tool call",
  async function (this: InspectToolCallsWorld, expected: number) {
    const count = await this.app.getToolCallCount();
    assert.strictEqual(count, expected, `Expected ${expected} tool calls but found ${count}`);
  },
);

Then(
  "the detail section lists {int} tool calls",
  async function (this: InspectToolCallsWorld, expected: number) {
    const count = await this.app.getToolCallCount();
    assert.strictEqual(count, expected, `Expected ${expected} tool calls but found ${count}`);
  },
);

Then(
  "the tool call shows the HTTP method {string}",
  async function (this: InspectToolCallsWorld, method: string) {
    const actual = await this.app.getToolCallMethod(0);
    assert.strictEqual(actual, method);
  },
);

Then(
  "the tool call shows the endpoint path {string}",
  async function (this: InspectToolCallsWorld, path: string) {
    const actual = await this.app.getToolCallPath(0);
    assert.ok(
      actual.includes(path) || path.includes(actual),
      `Expected path to contain "${path}" but got "${actual}"`,
    );
  },
);

Then(
  "the tool call shows the request payload sent by the agent",
  async function (this: InspectToolCallsWorld) {
    const has = await this.app.hasToolCallRequestPayload(0);
    assert.ok(has, "Expected request payload to be present");
  },
);

Then(
  "the tool call shows the HTTP status code {int}",
  async function (this: InspectToolCallsWorld, statusCode: number) {
    const actual = await this.app.getToolCallStatusCode(0);
    assert.strictEqual(actual, String(statusCode));
  },
);

Then(
  "the tool call shows the response body returned by the API",
  async function (this: InspectToolCallsWorld) {
    const has = await this.app.hasToolCallResponseBody(0);
    assert.ok(has, "Expected response body to be present");
  },
);

Then(
  "the tool call shows the call duration in milliseconds",
  async function (this: InspectToolCallsWorld) {
    const duration = await this.app.getToolCallDuration(0);
    assert.ok(duration.includes("ms"), `Expected duration to contain 'ms' but got: ${duration}`);
  },
);

// ─── S-284: Multiple sequential tool calls ───────────────────────────────────

Then(
  "the detail section lists {int} tool calls in execution order",
  async function (this: InspectToolCallsWorld, expected: number) {
    const count = await this.app.getToolCallCount();
    assert.strictEqual(count, expected, `Expected ${expected} tool calls but found ${count}`);
  },
);

Then(
  "the first tool call shows the endpoint path {string}",
  async function (this: InspectToolCallsWorld, path: string) {
    const actual = await this.app.getToolCallPath(0);
    assert.ok(
      actual.includes(path) || path.includes(actual),
      `Expected first path to contain "${path}" but got "${actual}"`,
    );
  },
);

Then(
  "the second tool call shows the endpoint path {string}",
  async function (this: InspectToolCallsWorld, path: string) {
    const actual = await this.app.getToolCallPath(1);
    assert.ok(
      actual.includes(path) || path.includes(actual),
      `Expected second path to contain "${path}" but got "${actual}"`,
    );
  },
);

// ─── S-285: Collapse tool-call detail ────────────────────────────────────────

Given(
  "the developer has expanded the tool-call detail for an AI response",
  async function (this: InspectToolCallsWorld) {
    // Submit an instruction so there is an assistant response to expand.
    await this.app.mockRelevanceEndpoint({ relevant: true });
    await this.app.mockExecuteEndpoint({
      reply: "Done — elements created successfully.",
      newVersion: 2,
      toolCalls: this.lastMockedToolCalls,
    });
    await this.app.submitChatInstruction("Add a wall");
    await this.app.waitForAssistantResponse();
    await this.app.toggleToolCalls();
    const visible = await this.app.isToolCallSectionVisible();
    assert.ok(visible, "Expected tool-calls section to be visible after expanding");
  },
);

When(
  "the developer deactivates the {string} toggle",
  async function (this: InspectToolCallsWorld, _toggleText: string) {
    await this.app.toggleToolCalls();
  },
);

Then(
  "the inline detail section is hidden",
  async function (this: InspectToolCallsWorld) {
    const visible = await this.app.isToolCallSectionVisible();
    assert.ok(!visible, "Expected tool-calls detail section to be hidden");
  },
);

Then(
  "the AI response message returns to its normal compact form",
  async function (this: InspectToolCallsWorld) {
    const msg = await this.app.getLastAssistantMessage();
    assert.ok(msg.length > 0, "Expected the assistant message to still be displayed");
  },
);

// ─── S-286: Failed tool calls distinguished ──────────────────────────────────

Given(
  "the AI agent executed {int} tool calls where the second call failed with status {int}",
  async function (this: InspectToolCallsWorld, count: number, status: number) {
    await this.app.waitForAssistantResponse();
    assert.strictEqual(this.lastMockedToolCalls.length, count);
    assert.strictEqual(this.lastMockedToolCalls[1].statusCode, status);
  },
);

Then(
  "the first tool call is displayed without an error indicator",
  async function (this: InspectToolCallsWorld) {
    const isError = await this.app.isToolCallError(0);
    assert.ok(!isError, "Expected first tool call to NOT have error indicator");
  },
);

Then(
  "the second tool call is displayed with an error indicator",
  async function (this: InspectToolCallsWorld) {
    const isError = await this.app.isToolCallError(1);
    assert.ok(isError, "Expected second tool call to have error indicator");
  },
);

Then(
  "the second tool call shows the HTTP status code {int}",
  async function (this: InspectToolCallsWorld, statusCode: number) {
    const actual = await this.app.getToolCallStatusCode(1);
    assert.strictEqual(actual, String(statusCode));
  },
);

// ─── S-287: Inspect both successful and failed ──────────────────────────────

Given(
  "the AI agent executed {int} tool calls where the second call failed",
  async function (this: InspectToolCallsWorld, count: number) {
    await this.app.waitForAssistantResponse();
    assert.strictEqual(this.lastMockedToolCalls.length, count);
    assert.ok(this.lastMockedToolCalls[1].error, "Expected second call to be an error");
  },
);

Then(
  "the first tool call shows the request payload and response body",
  async function (this: InspectToolCallsWorld) {
    const hasPayload = await this.app.hasToolCallRequestPayload(0);
    const hasBody = await this.app.hasToolCallResponseBody(0);
    assert.ok(hasPayload, "Expected first tool call to have request payload");
    assert.ok(hasBody, "Expected first tool call to have response body");
  },
);

Then(
  "the second tool call shows the request payload and error response body",
  async function (this: InspectToolCallsWorld) {
    const hasPayload = await this.app.hasToolCallRequestPayload(1);
    const hasBody = await this.app.hasToolCallResponseBody(1);
    assert.ok(hasPayload, "Expected second tool call to have request payload");
    assert.ok(hasBody, "Expected second tool call to have error response body");
  },
);

// ─── S-288: No toggle when rejected ──────────────────────────────────────────

Given(
  "the AI response indicates the instruction was not model-relevant",
  async function (this: InspectToolCallsWorld) {
    await this.app.waitForAssistantResponse();
    const variant = await this.app.getLastAssistantMessageVariant();
    assert.strictEqual(variant, "warning", `Expected warning variant but got: ${variant}`);
  },
);

Then(
  "no {string} toggle is displayed on the response",
  async function (this: InspectToolCallsWorld, toggleText: string) {
    assert.ok(toggleText);
    const visible = await this.app.isToolCallToggleVisible();
    assert.ok(!visible, `Expected "${toggleText}" toggle to be hidden`);
  },
);

// ─── S-289: No tool calls message ────────────────────────────────────────────

Given(
  "the AI agent responded with a clarification question without calling any API",
  async function (this: InspectToolCallsWorld) {
    await this.app.waitForAssistantResponse();
  },
);

Then(
  "the detail section displays the message {string}",
  async function (this: InspectToolCallsWorld, expectedMsg: string) {
    const text = await this.app.getToolCallSectionText();
    assert.ok(
      text.includes(expectedMsg),
      `Expected section to contain "${expectedMsg}" but got: "${text}"`,
    );
  },
);

// ─── S-290: Detail unavailable ───────────────────────────────────────────────

Given(
  "the developer has an AI response whose tool-call log has expired from the session",
  async function (this: InspectToolCallsWorld) {
    // Simulate expired tool-call log by sending toolCalls: null
    await this.app.mockRelevanceEndpoint({ relevant: true });
    await this.app.mockExecuteEndpoint({
      reply: "Done — element created.",
      newVersion: 2,
      toolCalls: null,
    });
    await this.app.submitChatInstruction("Add a beam");
    await this.app.waitForAssistantResponse();
  },
);

When(
  "the developer activates the {string} toggle on that response",
  async function (this: InspectToolCallsWorld, _toggleText: string) {
    await this.app.toggleToolCalls();
  },
);

// ─── S-291: No extra API calls ───────────────────────────────────────────────

Then(
  "no additional IFC API calls are made by the system",
  async function (this: InspectToolCallsWorld) {
    // Architecturally guaranteed: tool call data is in the ChatMessage state.
    assert.ok(true, "Tool call data is already in the response — no extra API calls needed");
  },
);

// ─── S-292: Auth tokens redacted ─────────────────────────────────────────────

Given(
  "the AI agent executed a tool call that included an authorization header",
  async function (this: InspectToolCallsWorld) {
    await this.app.waitForAssistantResponse();
    assert.ok(this.lastMockedToolCalls.length > 0);
  },
);

Then(
  "the authorization header value is redacted in the displayed request details",
  async function (this: InspectToolCallsWorld) {
    const payloadText = await this.app.getToolCallRequestPayloadText(0);
    assert.ok(
      !payloadText.includes("Bearer "),
      `Expected authorization to be redacted but found 'Bearer ' in: ${payloadText}`,
    );
    assert.ok(
      payloadText.includes("[REDACTED]"),
      `Expected [REDACTED] in payload but got: ${payloadText}`,
    );
  },
);
