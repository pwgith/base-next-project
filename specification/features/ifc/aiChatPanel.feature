@F-040 @UC-USR-026
Feature: AI chat panel — natural-language IFC model editing
  As a user
  I want to type natural-language instructions into an AI chat panel
  So that the system can update my IFC model automatically without me writing API calls

  Background:
    Given the user is signed in as "alice@example.com"
    And the user has a project named "Riverside House" with an IFC model loaded in the viewer

  # ───────────────────────────────────────────────
  # Main Flow — Happy Path
  # ───────────────────────────────────────────────

  @S-272 @UC-USR-026
  Scenario: Submitting a relevant instruction updates the model and triggers a re-render
    When the user types "Add a 3-metre internal wall between axes B and C on the ground floor" in the chat panel and submits
    Then the system displays a "Checking relevance…" status indicator beneath the message
    And the relevance check determines the instruction is model-relevant
    And the system displays an "Executing…" status indicator
    And the execution agent calls the IFC REST API to add the wall
    And the IFC model is updated to a new version
    And the chat panel displays "Done — wall added between axes B and C. The model has been updated to version 7."
    And the viewer re-renders the updated model without the user taking action
    And the camera position is preserved after the re-render
    And the status indicator is cleared and the chat input is ready

  @S-273 @UC-USR-026
  Scenario: Chat history records the full exchange after a successful instruction
    When the user types "Add a skylight window to the roof slab" in the chat panel and submits
    And the instruction is executed successfully
    Then the chat history shows the user message "Add a skylight window to the roof slab"
    And the chat history shows the system confirmation reply
    And both messages remain visible when the user scrolls the chat panel

  # ───────────────────────────────────────────────
  # Alternative Flows
  # ───────────────────────────────────────────────

  @S-274 @UC-USR-026
  Scenario: An instruction containing multiple operations is executed sequentially
    When the user types "Add a wall between axes D and E on the first floor, then add two windows to it" in the chat panel and submits
    And the relevance check determines the instruction is model-relevant
    Then the execution agent calls the IFC REST API twice — once to create the wall and once to add the windows
    And the chat panel displays a confirmation summarising both operations and the resulting model version

  @S-275 @UC-USR-026
  Scenario: A follow-up instruction references the outcome of a previous turn
    Given the user has already submitted "Add a 3-metre wall between axes B and C" and received a confirmation
    When the user types "Actually, make that wall 4 metres instead" in the chat panel and submits
    Then the relevance check uses the recent chat history as context
    And the execution agent updates the wall length to 4 metres via the IFC REST API
    And the chat panel displays a confirmation of the updated wall length

  # ───────────────────────────────────────────────
  # Exception Flows
  # ───────────────────────────────────────────────

  @S-276 @UC-USR-026
  Scenario: An instruction that is not model-relevant is rejected without making any API calls
    When the user types "What is the weather in London today?" in the chat panel and submits
    Then the relevance check determines the instruction is NOT model-relevant
    And no IFC REST API calls are made
    And the chat panel displays "That instruction doesn't appear to relate to the IFC model. Please describe a change you'd like to make to the building elements, materials, properties, or spatial structure."
    And the IFC model version is unchanged
    And the chat input is ready for a new instruction

  @S-277 @UC-USR-026
  Scenario: An off-topic conversational message is also rejected at the relevance gate
    When the user types "Tell me a joke" in the chat panel and submits
    Then the relevance check determines the instruction is NOT model-relevant
    And no IFC REST API calls are made
    And the chat panel displays a rejection message explaining the instruction was not recognised as a model-editing command
    And the IFC model version is unchanged

  @S-278 @UC-USR-026
  Scenario: The relevance check service being unavailable prevents execution without changing the model
    Given the AI relevance check service is unavailable
    When the user types "Remove the structural column at grid intersection A1" in the chat panel and submits
    Then the system does not call the IFC REST API
    And the chat panel displays "Unable to validate your instruction right now. Please try again."
    And the IFC model version is unchanged

  @S-279 @UC-USR-026
  Scenario: The execution agent cannot translate an ambiguous instruction into API calls
    When the user types "Fix the thing on the second floor" in the chat panel and submits
    And the relevance check determines the instruction is model-relevant
    Then the execution agent cannot identify the target element
    And the chat panel displays a clarification request such as "I wasn't able to identify which element you mean by 'the thing'. Could you provide the element name or GlobalId?"
    And the IFC model is not changed

  @S-280 @UC-USR-026
  Scenario: An IFC API error during execution is reported in the chat without rolling back earlier steps
    When the user types "Add a wall between axes F and G and then add a door to it" in the chat panel and submits
    And the relevance check determines the instruction is model-relevant
    And the execution agent successfully creates the wall via the IFC REST API
    And the execution agent's API call to add the door returns a 400 Bad Request error
    Then the chat panel reports that the wall was added but the door could not be created
    And the model retains the newly added wall
    And the model version reflects the partial change

  @S-281 @UC-USR-026
  Scenario: A viewer re-render failure after a successful API update is reported in the chat
    Given the IFC REST API has successfully applied the instruction and saved a new model version
    When the viewer fails to fetch the new model version from the server
    Then the viewer displays an inline error stating the model could not be reloaded
    And the chat panel appends a note: "The model was updated but the viewer could not reload automatically. Use the reload button to try again."
    And a manual reload option is available in the viewer toolbar
