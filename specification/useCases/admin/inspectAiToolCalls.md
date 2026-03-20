# Inspect AI Tool Calls

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-ADM-002                     |
| **Actor**        | Admin                          |
| **Priority**     | Medium                         |
| **Status**       | Draft                          |
| **Created**      | 2026-03-19                     |
| **Last Updated** | 2026-03-19                     |

## Summary

A developer inspects the individual tool calls (API commands) that the AI execution agent issued while fulfilling a chat instruction, so they can determine whether a problem was caused by the AI selecting the wrong operations or by the underlying API calls returning incorrect results.

## Preconditions

- The developer is signed in and has access to a project workspace with the AI chat panel open (see [UC-USR-026 AI Chat Panel for IFC Model Editing](../user/aiChatPanel.md)).
- The AI execution agent has processed at least one instruction in the current chat session.

## Trigger

The developer wants to diagnose unexpected behaviour following an AI chat instruction and expands the tool-call detail for a completed AI response in the chat panel.

## Main Flow (Happy Path)

1. The developer submits a natural-language instruction via the AI chat panel and the system processes it through the normal AI chat flow (see [UC-USR-026 AI Chat Panel for IFC Model Editing](../user/aiChatPanel.md)).
2. The AI execution agent completes the instruction and the system appends the result message to the chat history.
3. The system displays a "Show tool calls" toggle or disclosure control alongside the AI response message.
4. The developer activates the "Show tool calls" control.
5. The system expands an inline detail section beneath the AI response that lists every tool call the execution agent made, in the order they were executed.
6. For each tool call the system displays:
   - The API endpoint called (HTTP method and path).
   - The request payload sent by the agent.
   - The HTTP status code returned by the API.
   - The response body returned by the API.
   - The duration of the call.
7. The developer reviews the tool-call sequence to identify whether the AI chose the correct operations and whether each API call returned the expected result.
8. The developer collapses the detail section by deactivating the toggle, returning the chat message to its normal compact form.

## Alternative Flows

### Multiple Tool Calls With Partial Failure

- **Branches from**: Step 5 of Main Flow
- The instruction resulted in multiple tool calls and one or more failed.
- Failed tool calls are visually distinguished (e.g., highlighted with an error indicator) so the developer can immediately identify which call caused the problem.
- The developer can inspect both successful and failed calls to understand the full execution sequence.

### No Tool Calls Made

- **Branches from**: Step 3 of Main Flow
- The AI response did not involve any tool calls (e.g., the instruction was rejected by the relevance check or the agent returned a clarification question without calling any API).
- The "Show tool calls" control is either absent or displays a message such as "No tool calls were made for this response".

## Exception Flows

### Tool-Call Detail Unavailable

- **Triggered at**: Step 5 of Main Flow
- The system is unable to retrieve the tool-call log for a given response (e.g., the detail was not captured or has expired from the session).
- The system displays an inline message stating that tool-call details are not available for this response.

## Postconditions

- The developer has reviewed the full sequence of API calls made by the AI agent for a given instruction.
- No changes have been made to the IFC model or chat state — this is a read-only inspection action.

## Business Rules

- Tool-call detail is captured and retained for every AI execution response within the current chat session.
- Tool-call inspection is a read-only operation and must not trigger any additional API calls or model mutations.
- Sensitive data (e.g., authentication tokens) must be redacted from the displayed request and response payloads.

## UI Reference

[./design/ui/inspectAiToolCalls.html](../../../design/ui/inspectAiToolCalls.html) — standalone HTML mockup showing the AI chat panel with the tool-call inspection feature. Demonstrates:

- A "Show tool calls" toggle on each AI response that invoked API calls.
- Expanded detail sections showing HTTP method, endpoint, request payload, status code, response body, and duration for each call.
- Partial-failure state with the failed call visually highlighted by a red indicator and left border.
- Rejected instruction with no toggle (no API calls were made).
- Clarification response where the toggle expands to show "No tool calls were made for this response".
- Redacted `Authorization` headers in displayed payloads.

Open the file directly in a browser and use the demo toolbar at the bottom to switch between states.

## Features

Trace to Gherkin feature files that implement this use case (maintained as features are created):

| Feature ID | Scenario IDs                                                  | Description                     |
|------------|---------------------------------------------------------------|---------------------------------|
| F-041      | S-282, S-283, S-284, S-285, S-286, S-287, S-288, S-289, S-290, S-291, S-292 | Inspect AI tool calls |

## Notes

- This use case is primarily a developer/debugging aid. It may be restricted to development or staging environments, or gated behind a feature flag, depending on the project's deployment model.
- The tool-call detail captures the same information that would appear in server-side logs but presents it directly in the UI so the developer can correlate it with the chat conversation without switching to a separate log viewer.
- Future consideration: add the ability to copy individual tool-call details or the full sequence to the clipboard for pasting into bug reports.
- Future consideration: provide a "replay" action that re-executes a single tool call in isolation for further debugging.
