@F-033 @UC-USR-021
Feature: IFC opening relationships (voiding and filling)
  As a user
  I want to manage void and fill relationships between IFC elements via the REST API
  So that I can model wall openings and their filling elements (doors, windows) programmatically

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write ifc:delete"
    And the user has an IFC file with ID "file-001"
    And the file contains a wall with globalId "0VkXyZ2aB3c4D5e6F7gH8i" named "EW-North External Wall"

  # ───────────────────────────────────────────────
  # Create Openings
  # ───────────────────────────────────────────────

  @S-234 @UC-USR-021
  Scenario: Create an opening in a wall
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/openings" with body:
      """
      {
        "name": "Door Opening - North Wall",
        "placement": { "x": 2.0, "y": 0.0, "z": 0.0 },
        "dimensions": { "width": 0.9, "height": 2.1 }
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcOpeningElement"
    And the response body contains "name": "Door Opening - North Wall"
    And the response body contains a "globalId" field
    And the response body contains "hostElementGlobalId": "0VkXyZ2aB3c4D5e6F7gH8i"

  @S-235 @UC-USR-021
  Scenario: List all openings in a wall
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has openings "Door Opening - North Wall" (globalId "1aBcDeFgHiJ2kLmNoPqRsT") and "Window Opening - North Wall" (globalId "2cDeFgHiJkL3mNoPqRsTuV")
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/openings"
    Then the response status is 200
    And the response body contains an "openings" array with 2 items
    And the array contains an entry with "name": "Door Opening - North Wall"
    And the array contains an entry with "name": "Window Opening - North Wall"

  # ───────────────────────────────────────────────
  # Fill Openings
  # ───────────────────────────────────────────────

  @S-236 @UC-USR-021
  Scenario: Fill an opening with a door element
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has an opening with globalId "1aBcDeFgHiJ2kLmNoPqRsT"
    And the file contains a door with globalId "3eFgHiJkLmN4oPqRsTuVwX" named "D01 - Fire Door"
    When a PUT request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/openings/1aBcDeFgHiJ2kLmNoPqRsT/filling" with body:
      """
      { "fillingGlobalId": "3eFgHiJkLmN4oPqRsTuVwX" }
      """
    Then the response status is 200
    And the response body contains "fillingElement" with "globalId": "3eFgHiJkLmN4oPqRsTuVwX"
    And the response body contains "fillingElement" with "name": "D01 - Fire Door"

  @S-237 @UC-USR-021
  Scenario: Fill an opening with a window element
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has an opening with globalId "2cDeFgHiJkL3mNoPqRsTuV"
    And the file contains a window with globalId "4gHiJkLmNoP5qRsTuVwXyZ" named "W03 - Double Glazed"
    When a PUT request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/openings/2cDeFgHiJkL3mNoPqRsTuV/filling" with body:
      """
      { "fillingGlobalId": "4gHiJkLmNoP5qRsTuVwXyZ" }
      """
    Then the response status is 200
    And the response body contains "fillingElement" with "globalId": "4gHiJkLmNoP5qRsTuVwXyZ"
    And the response body contains "fillingElement" with "name": "W03 - Double Glazed"

  # ───────────────────────────────────────────────
  # Read and Remove Fillings
  # ───────────────────────────────────────────────

  @S-238 @UC-USR-021
  Scenario: Get the filling element for an opening
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has an opening with globalId "1aBcDeFgHiJ2kLmNoPqRsT" filled by door "3eFgHiJkLmN4oPqRsTuVwX"
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/openings/1aBcDeFgHiJ2kLmNoPqRsT/filling"
    Then the response status is 200
    And the response body contains "fillingElement" with "globalId": "3eFgHiJkLmN4oPqRsTuVwX"
    And the response body contains "fillingElement" with "ifcType": "IfcDoor"

  @S-239 @UC-USR-021
  Scenario: Remove a filling element from an opening
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has an opening with globalId "1aBcDeFgHiJ2kLmNoPqRsT" filled by door "3eFgHiJkLmN4oPqRsTuVwX"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/openings/1aBcDeFgHiJ2kLmNoPqRsT/filling"
    Then the response status is 204
    And a subsequent GET to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/openings/1aBcDeFgHiJ2kLmNoPqRsT/filling" returns status 404

  # ───────────────────────────────────────────────
  # Remove Openings
  # ───────────────────────────────────────────────

  @S-240 @UC-USR-021
  Scenario: Remove a void from a wall (also removes any filling)
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has an opening with globalId "1aBcDeFgHiJ2kLmNoPqRsT" filled by door "3eFgHiJkLmN4oPqRsTuVwX"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/openings/1aBcDeFgHiJ2kLmNoPqRsT"
    Then the response status is 204
    And a subsequent GET to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/openings" does not include opening "1aBcDeFgHiJ2kLmNoPqRsT"

  # ───────────────────────────────────────────────
  # Error Handling
  # ───────────────────────────────────────────────

  @S-241 @UC-USR-021
  Scenario: Reject filling an opening that is already filled
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has an opening with globalId "1aBcDeFgHiJ2kLmNoPqRsT" filled by door "3eFgHiJkLmN4oPqRsTuVwX"
    And the file contains a window with globalId "5iJkLmNoPqR6sTuVwXyZaB"
    When a PUT request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/openings/1aBcDeFgHiJ2kLmNoPqRsT/filling" with body:
      """
      { "fillingGlobalId": "5iJkLmNoPqR6sTuVwXyZaB" }
      """
    Then the response status is 409
    And the response body contains an error with message containing "already filled"
