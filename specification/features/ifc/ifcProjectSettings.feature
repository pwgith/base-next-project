@F-037 @UC-USR-025
Feature: IFC project settings management
  As a user
  I want to update the project-level settings of an IFC file via the REST API
  So that I can modify unit definitions and project metadata without re-uploading the entire file

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write"
    And the user has an IFC file with ID "file-001"
    And the IFC file has a project entity with name "Residential Development - Phase 1"

  # ───────────────────────────────────────────────
  # Read Unit Assignments
  # ───────────────────────────────────────────────

  @S-263 @UC-USR-025
  Scenario: Get the current project unit assignments
    Given the project uses length unit "MILLIMETRE", area unit "SQUARE_METRE", and angle unit "DEGREE"
    When a GET request is sent to "/api/v1/ifc/files/file-001/project/units"
    Then the response status is 200
    And the response body contains a "units" array
    And the array contains an entry with "unitType": "LENGTHUNIT" and "name": "METRE" and "prefix": "MILLI"
    And the array contains an entry with "unitType": "AREAUNIT" and "name": "SQUARE_METRE"
    And the array contains an entry with "unitType": "PLANEANGLEUNIT" and "name": "DEGREE"

  # ───────────────────────────────────────────────
  # Update Unit Assignments
  # ───────────────────────────────────────────────

  @S-264 @UC-USR-025
  Scenario: Change the length unit from millimetres to metres
    Given the project currently uses length unit "MILLIMETRE"
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/project/units" with body:
      """
      {
        "units": [
          { "unitType": "LENGTHUNIT", "name": "METRE" }
        ]
      }
      """
    Then the response status is 200
    And the response body "units" array contains an entry with "unitType": "LENGTHUNIT" and "name": "METRE"
    And the entry does not contain a "prefix" field

  @S-265 @UC-USR-025
  Scenario: Update area and volume units together
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/project/units" with body:
      """
      {
        "units": [
          { "unitType": "AREAUNIT", "name": "SQUARE_METRE" },
          { "unitType": "VOLUMEUNIT", "name": "CUBIC_METRE" }
        ]
      }
      """
    Then the response status is 200
    And the response body "units" array contains an entry with "unitType": "AREAUNIT" and "name": "SQUARE_METRE"
    And the response body "units" array contains an entry with "unitType": "VOLUMEUNIT" and "name": "CUBIC_METRE"

  # ───────────────────────────────────────────────
  # Error Handling
  # ───────────────────────────────────────────────

  @S-266 @UC-USR-025
  Scenario: Reject an invalid unit definition
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/project/units" with body:
      """
      {
        "units": [
          { "unitType": "LENGTHUNIT", "name": "INVALID_UNIT" }
        ]
      }
      """
    Then the response status is 422
    And the response body contains an error with message containing "invalid unit name"

  # ───────────────────────────────────────────────
  # Update Project Metadata
  # ───────────────────────────────────────────────

  @S-267 @UC-USR-025
  Scenario: Update the project description and phase
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/project" with body:
      """
      {
        "description": "Mixed-use residential and commercial development in East London",
        "phase": "RIBA Stage 4 - Technical Design"
      }
      """
    Then the response status is 200
    And the response body contains "description": "Mixed-use residential and commercial development in East London"
    And the response body contains "phase": "RIBA Stage 4 - Technical Design"

  @S-268 @UC-USR-025
  Scenario: Update the true north direction
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/project" with body:
      """
      {
        "trueNorth": { "x": 0.0, "y": 1.0 }
      }
      """
    Then the response status is 200
    And the response body contains "trueNorth" with "x": 0.0 and "y": 1.0
