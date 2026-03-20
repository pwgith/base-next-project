# AI Chat Panel for IFC Model Editing

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-026                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-19                     |
| **Last Updated** | 2026-03-19                     |

## Summary

An authenticated user types a natural-language instruction into an AI chat panel displayed alongside the IFC model viewer. The system validates the instruction for model relevance, then — if relevant — executes it via an AI agent that calls the IFC REST API through an MCP (Model Context Protocol) bridge, causing the model to be updated and automatically re-rendered in the viewer.

## Preconditions

- The user is signed in with a valid session (see [UC-USR-004 Login](./login.md)).
- The user has an open project with an IFC model loaded in the viewer (see [UC-USR-017 View IFC Model in Browser](./viewIfcModelInBrowser.md)).
- The AI chat panel is visible alongside the 3D viewer in the project workspace.

## Trigger

The user types an instruction into the AI chat panel input field and submits it (e.g., presses Enter or clicks the Send button).

## Main Flow (Happy Path)

1. The user types a natural-language instruction into the chat input field and submits it (e.g., "Add a 3-metre internal wall between axes B and C on the ground floor").
2. The system appends the user's message to the chat history and displays a "Checking relevance…" status indicator.
3. The system sends the instruction to an AI relevance-check service, which determines whether the instruction describes a meaningful IFC model operation (e.g., adding, removing, or modifying building elements, properties, materials, spatial structure, or relationships).
4. The relevance check confirms the instruction is model-relevant.
5. The system updates the status indicator to "Executing…" and sends the validated instruction to an AI execution agent.
6. The execution agent interprets the instruction and calls one or more IFC REST API endpoints via the MCP bridge (subject to all authentication, authorisation, and versioning rules defined in [UC-USR-015 Manipulate IFC File via REST API](./manipulateIfcFileViaApi.md)).
7. The REST API applies the requested changes to the IFC model and saves a new version.
8. The system receives confirmation from the execution agent and appends a success reply to the chat history (e.g., "Done — wall added between axes B and C. The model has been updated to version 7.").
9. The viewer automatically detects that a new model version is available and re-renders the updated model without requiring manual user action. The camera position is preserved across the re-render.
10. The status indicator is cleared and the chat input is ready for the next instruction.

## Alternative Flows

### Instruction Contains Multiple Operations

- **Branches from**: Step 5 of Main Flow
- The user's instruction implies more than one distinct IFC API operation (e.g., "Add a wall, then add two windows to it").
- The execution agent breaks the instruction into sequential API calls and executes them in order.
- On success, the chat reply summarises all operations performed and the resulting new model version.
- On partial failure, the system reports which operations succeeded and which failed, and the model is left in the state reached by the last successful operation.

### User Refines a Previous Instruction

- **Branches from**: Step 1 of Main Flow
- The user types a follow-up instruction that references the outcome of a prior turn (e.g., "Actually, make that wall 4 metres instead").
- The system includes recent chat history as context for both the relevance check and the execution agent.
- The flow continues from Step 2 with the refined instruction.

## Exception Flows

### Instruction Is Not Model-Relevant

- **Triggered at**: Step 3 of Main Flow
- The relevance-check AI determines that the instruction does not describe a valid IFC model operation (e.g., "What is the weather today?" or "Tell me a joke").
- The system does not invoke the execution agent or call any IFC API.
- The system appends a reply to the chat history explaining that the instruction was not recognised as a model-editing command and suggesting the user rephrase (e.g., "That instruction doesn't appear to relate to the IFC model. Please describe a change you'd like to make to the building elements, materials, properties, or spatial structure.").
- The chat input is restored and ready for a new instruction.

### Relevance Check Service Unavailable

- **Triggered at**: Step 3 of Main Flow
- The relevance-check AI service returns an error or times out.
- The system appends an error message to the chat history (e.g., "Unable to validate your instruction right now. Please try again.").
- No IFC API calls are made.

### Execution Agent Cannot Interpret the Instruction

- **Triggered at**: Step 6 of Main Flow
- The instruction passed the relevance check but the execution agent cannot translate it into specific API calls (e.g., the instruction is ambiguous or references elements that do not exist in the model).
- The agent returns an error or clarification request.
- The system appends the agent's response to the chat history (e.g., "I wasn't able to find an element matching 'axis B'. Could you be more specific, or check the element names in the viewer?").
- No IFC model changes are applied.

### IFC API Call Fails

- **Triggered at**: Step 6 of Main Flow
- One or more IFC REST API calls made by the execution agent return an error (e.g., `400 Bad Request`, `409 Conflict`, or a network failure).
- The execution agent stops processing and reports the failure back to the system.
- The system appends an error reply to the chat history describing what failed and, where possible, suggests a corrective action.
- Any changes applied before the failure remain in the model (no automatic rollback); the user is informed of the partial state.

### Model Re-Render Fails

- **Triggered at**: Step 9 of Main Flow
- The viewer fails to fetch or parse the new model version from the server.
- The system displays an inline error in the viewer (see exception flows in [UC-USR-017 View IFC Model in Browser](./viewIfcModelInBrowser.md)) and adds a note to the chat history indicating that the model was updated but the viewer could not reload automatically.
- The user is offered a manual retry option.

## Postconditions

- The IFC model reflects the changes described in the user's instruction (if the instruction was relevant and the execution succeeded).
- A new version of the model has been saved (via the IFC REST API versioning mechanism).
- The chat history records the full exchange — the user's instruction, the relevance outcome, and the execution result or error — for the duration of the session.
- The viewer displays the updated model.

## Business Rules

- **Relevance gating**: Every user instruction must pass the AI relevance check before any IFC API call is made. The system must never execute an instruction that has been marked as not model-relevant.
- **No side effects on rejection**: When an instruction is rejected by the relevance check, no API calls, model changes, or version increments occur.
- **Authentication and authorisation**: All IFC REST API calls made by the execution agent are performed using the user's own credentials and are subject to the same access controls as direct API calls (see [UC-USR-015 Manipulate IFC File via REST API](./manipulateIfcFileViaApi.md)).
- **Versioning**: Each successful mutation executed by the agent increments the model version, maintaining a complete audit trail.
- **Rate limiting**: The AI chat panel is subject to the same API rate limits as other application features. If the user submits instructions faster than the system can process them, subsequent instructions are queued or rejected with an appropriate message.
- **Context window**: The relevance check and execution agent receive recent chat history as context, bounded by a reasonable context window. Very long chat sessions may lose older context.

## UI Reference

`./design/ui/aiChatPanel.html` — standalone HTML mockup showing the project workspace with the 3D IFC viewer alongside the AI chat panel. Open the file directly in a browser to review the layout and all interaction states (checking relevance, executing, rejection, API error, viewer reload error).

The chat panel includes:
- A scrollable conversation history area showing alternating user and system message bubbles.
- A text input field at the bottom of the panel with a Send button.
- An inline status indicator (e.g., "Checking relevance…", "Executing…") displayed beneath the most recent user message while processing is in progress.

## Features

Trace to Gherkin feature files that implement this use case (maintained as features are created):

| Feature ID | Scenario IDs                                                    | Description                                        |
|------------|-----------------------------------------------------------------|----------------------------------------------------|
| F-040      | S-272, S-273, S-274, S-275, S-276, S-277, S-278, S-279, S-280, S-281 | AI chat panel — natural-language IFC model editing |

## Notes

- The MCP (Model Context Protocol) bridge acts as the interface between the AI execution agent and the IFC REST API — the agent issues structured tool calls via MCP, which are translated into authenticated REST API requests.
- Future consideration: allow users to undo the last AI-applied change via a dedicated "Undo" action in the chat panel, which would revert to the previous model version.
- Future consideration: display a diff or summary of IFC elements changed after each successful operation.
- The relevance-check step is intentionally a lightweight, fast AI call (e.g., a small language model or a tightly prompted call with strict output format) to minimise latency before execution begins.
