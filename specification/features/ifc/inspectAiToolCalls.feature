@F-041 @UC-ADM-002
Feature: Inspect AI tool calls
  As a developer
  I want to see the individual API calls the AI agent made to fulfil a chat instruction
  So that I can determine whether an issue was caused by the AI selecting the wrong operations or by the API returning incorrect results

  Background:
    Given the developer is signed in and has a project open in the workspace
    And the AI chat panel is visible alongside the 3D viewer

  # ── Main Flow ────────────────────────────────────────────────

  @S-282 @UC-ADM-002
  Scenario: Show tool calls toggle appears after AI executes an instruction
    Given the developer has submitted the instruction "Add a 3-metre wall on grid line A"
    And the AI agent has executed the instruction successfully
    When the AI response message is displayed in the chat history
    Then a "Show tool calls" toggle is displayed alongside the response message

  @S-283 @UC-ADM-002
  Scenario: Expand tool-call detail for a single API call
    Given the developer has submitted the instruction "Create a new IfcWallStandardCase"
    And the AI agent executed 1 tool call to fulfil the instruction
    When the developer activates the "Show tool calls" toggle on the response
    Then an inline detail section is displayed beneath the response
    And the detail section lists 1 tool call
    And the tool call shows the HTTP method "POST"
    And the tool call shows the endpoint path "/api/projects/proj_01/ifc/elements"
    And the tool call shows the request payload sent by the agent
    And the tool call shows the HTTP status code 201
    And the tool call shows the response body returned by the API
    And the tool call shows the call duration in milliseconds

  @S-284 @UC-ADM-002
  Scenario: Expand tool-call detail for multiple sequential API calls
    Given the developer has submitted the instruction "Add a wall and then add a window to it"
    And the AI agent executed 2 tool calls to fulfil the instruction
    When the developer activates the "Show tool calls" toggle on the response
    Then the detail section lists 2 tool calls in execution order
    And the first tool call shows the endpoint path "/api/projects/proj_01/ifc/elements"
    And the second tool call shows the endpoint path "/api/projects/proj_01/ifc/elements"

  @S-285 @UC-ADM-002
  Scenario: Collapse tool-call detail
    Given the developer has expanded the tool-call detail for an AI response
    When the developer deactivates the "Show tool calls" toggle
    Then the inline detail section is hidden
    And the AI response message returns to its normal compact form

  # ── Alternative Flow: Partial Failure ────────────────────────

  @S-286 @UC-ADM-002
  Scenario: Failed tool calls are visually distinguished from successful ones
    Given the developer has submitted the instruction "Add a wall and assign material 'Concrete-X'"
    And the AI agent executed 2 tool calls where the second call failed with status 400
    When the developer activates the "Show tool calls" toggle on the response
    Then the detail section lists 2 tool calls
    And the first tool call is displayed without an error indicator
    And the second tool call is displayed with an error indicator
    And the second tool call shows the HTTP status code 400

  @S-287 @UC-ADM-002
  Scenario: Developer can inspect both successful and failed calls in a partial failure
    Given the developer has submitted the instruction "Add a slab and set its fire rating"
    And the AI agent executed 2 tool calls where the second call failed
    When the developer activates the "Show tool calls" toggle on the response
    Then the first tool call shows the request payload and response body
    And the second tool call shows the request payload and error response body

  # ── Alternative Flow: No Tool Calls ──────────────────────────

  @S-288 @UC-ADM-002
  Scenario: No toggle shown when instruction was rejected by relevance check
    Given the developer has submitted the instruction "What is the weather today?"
    And the AI response indicates the instruction was not model-relevant
    When the AI response message is displayed in the chat history
    Then no "Show tool calls" toggle is displayed on the response

  @S-289 @UC-ADM-002
  Scenario: Message shown when agent responded without making any tool calls
    Given the developer has submitted the instruction "Which wall did you just add?"
    And the AI agent responded with a clarification question without calling any API
    When the developer activates the "Show tool calls" toggle on the response
    Then the detail section displays the message "No tool calls were made for this response"

  # ── Exception Flow: Detail Unavailable ───────────────────────

  @S-290 @UC-ADM-002
  Scenario: Tool-call detail unavailable for an older response
    Given the developer has an AI response whose tool-call log has expired from the session
    When the developer activates the "Show tool calls" toggle on that response
    Then the detail section displays the message "Tool-call details are not available for this response"

  # ── Business Rules ───────────────────────────────────────────

  @S-291 @UC-ADM-002
  Scenario: Inspecting tool calls does not trigger additional API calls
    Given the developer has submitted the instruction "Add a column at grid intersection B-2"
    And the AI agent has executed the instruction successfully
    When the developer activates the "Show tool calls" toggle on the response
    Then no additional IFC API calls are made by the system

  @S-292 @UC-ADM-002
  Scenario: Authentication tokens are redacted from displayed payloads
    Given the developer has submitted the instruction "Add an IfcBeam element"
    And the AI agent executed a tool call that included an authorization header
    When the developer activates the "Show tool calls" toggle on the response
    Then the authorization header value is redacted in the displayed request details
