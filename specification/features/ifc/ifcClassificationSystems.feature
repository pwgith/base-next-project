@F-036 @UC-USR-024
Feature: IFC classification system management
  As a user
  I want to create, update, and delete classification systems in an IFC file via the REST API
  So that I can register industry standards (Uniclass, OmniClass, MasterFormat) before assigning classification references to elements

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write ifc:delete"
    And the user has an IFC file with ID "file-001"

  # ───────────────────────────────────────────────
  # Create Classification System
  # ───────────────────────────────────────────────

  @S-257 @UC-USR-024
  Scenario: Create a classification system
    When a POST request is sent to "/api/v1/ifc/files/file-001/classifications" with body:
      """
      {
        "name": "Uniclass 2015",
        "source": "https://www.thenbs.com/our-tools/uniclass-2015",
        "edition": "2015 v1.31",
        "editionDate": "2024-07-01"
      }
      """
    Then the response status is 201
    And the response body contains "name": "Uniclass 2015"
    And the response body contains "source": "https://www.thenbs.com/our-tools/uniclass-2015"
    And the response body contains "edition": "2015 v1.31"
    And the response body contains a "systemId" field

  # ───────────────────────────────────────────────
  # Read Classification System
  # ───────────────────────────────────────────────

  @S-258 @UC-USR-024
  Scenario: Get a classification system by ID
    Given the IFC file references the classification system "Uniclass 2015" with systemId "cls-001"
    When a GET request is sent to "/api/v1/ifc/files/file-001/classifications/cls-001"
    Then the response status is 200
    And the response body contains "name": "Uniclass 2015"
    And the response body contains "systemId": "cls-001"
    And the response body contains "edition": "2015 v1.31"

  # ───────────────────────────────────────────────
  # Update Classification System
  # ───────────────────────────────────────────────

  @S-259 @UC-USR-024
  Scenario: Update a classification system edition
    Given the IFC file references the classification system "Uniclass 2015" with systemId "cls-001" and edition "2015 v1.30"
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/classifications/cls-001" with body:
      """
      { "edition": "2015 v1.31", "editionDate": "2024-07-01" }
      """
    Then the response status is 200
    And the response body contains "edition": "2015 v1.31"
    And the response body contains "editionDate": "2024-07-01"

  # ───────────────────────────────────────────────
  # Delete Classification System
  # ───────────────────────────────────────────────

  @S-260 @UC-USR-024
  Scenario: Delete a classification system with no element references
    Given the IFC file references the classification system "OmniClass" with systemId "cls-002"
    And no elements in the file reference classification system "cls-002"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/classifications/cls-002"
    Then the response status is 204
    And a subsequent GET to "/api/v1/ifc/files/file-001/classifications" does not include system "OmniClass"

  @S-261 @UC-USR-024
  Scenario: Reject deleting a classification system that has element references
    Given the IFC file references the classification system "Uniclass 2015" with systemId "cls-001"
    And the wall "0VkXyZ2aB3c4D5e6F7gH8i" has a classification reference under system "cls-001"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/classifications/cls-001"
    Then the response status is 409
    And the response body contains an error with message containing "classification system is referenced by elements"

  # ───────────────────────────────────────────────
  # List with Filtering
  # ───────────────────────────────────────────────

  @S-262 @UC-USR-024
  Scenario: List all classification systems in a file
    Given the IFC file references classification systems "Uniclass 2015" (systemId "cls-001") and "OmniClass" (systemId "cls-002")
    When a GET request is sent to "/api/v1/ifc/files/file-001/classifications"
    Then the response status is 200
    And the response body contains a "classifications" array with 2 items
    And the array contains an entry with "name": "Uniclass 2015"
    And the array contains an entry with "name": "OmniClass"
