@F-023 @UC-USR-015
Feature: IFC classification management
  As a user
  I want to assign and manage classification references on IFC elements via the REST API
  So that I can link building elements to industry coding systems such as Uniclass or OmniClass programmatically

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write ifc:delete"
    And the user has an IFC file with ID "file-001"
    And the IFC file references the classification system "Uniclass 2015" with systemId "cls-001"
    And the file contains a wall with globalId "0VkXyZ2aB3c4D5e6F7gH8i"

  # ───────────────────────────────────────────────
  # List Classifications
  # ───────────────────────────────────────────────

  @S-163 @UC-USR-015
  Scenario: List all classification systems referenced in an IFC file
    When a GET request is sent to "/api/v1/ifc/files/file-001/classifications"
    Then the response status is 200
    And the response body contains a "classifications" array
    And the array contains an entry with "name": "Uniclass 2015" and "source": "https://www.thenbs.com/our-tools/uniclass-2015"

  # ───────────────────────────────────────────────
  # Element Classification References
  # ───────────────────────────────────────────────

  @S-164 @UC-USR-015
  Scenario: Get classification references assigned to an element
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" is assigned classification reference "Ss_15_10_30_14 - External walls" under "Uniclass 2015"
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/classifications"
    Then the response status is 200
    And the response body contains a "classifications" array with 1 item
    And the item contains "notation": "Ss_15_10_30_14"
    And the item contains "name": "External walls"
    And the item contains "systemId": "cls-001"

  @S-165 @UC-USR-015
  Scenario: Assign a classification reference to an element
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/classifications" with body:
      """
      {
        "systemId": "cls-001",
        "notation": "Ss_15_10_30_14",
        "name": "External walls"
      }
      """
    Then the response status is 201
    And the response body contains "notation": "Ss_15_10_30_14"
    And the response body contains "name": "External walls"
    And the response body contains a "referenceId" field

  @S-166 @UC-USR-015
  Scenario: Update the notation and name of an existing classification reference
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has classification reference with referenceId "ref-001" and notation "Ss_15_10_30_14"
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/classifications/ref-001" with body:
      """
      { "notation": "Ss_15_10_30_70", "name": "Internal walls" }
      """
    Then the response status is 200
    And the response body contains "notation": "Ss_15_10_30_70"
    And the response body contains "name": "Internal walls"

  @S-167 @UC-USR-015
  Scenario: Remove a classification reference from an element
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has classification reference with referenceId "ref-001"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/classifications/ref-001"
    Then the response status is 204
    And a subsequent GET to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/classifications" does not include "ref-001"
