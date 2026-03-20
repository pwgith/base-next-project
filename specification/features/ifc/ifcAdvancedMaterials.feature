@F-035 @UC-USR-023
Feature: IFC advanced material compositions
  As a user
  I want to assign materials in bulk and define constituent sets and profile sets via the REST API
  So that I can efficiently manage material data for complex composite and structural elements

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write"
    And the user has an IFC file with ID "file-001"
    And the IFC file contains materials "Concrete - C30/37" (materialId "mat-001"), "Glass - Float 6mm" (materialId "mat-002"), "Aluminium - 6063-T5" (materialId "mat-003"), and "Steel - S355" (materialId "mat-004")

  # ───────────────────────────────────────────────
  # Bulk Material Assignment
  # ───────────────────────────────────────────────

  @S-249 @UC-USR-023
  Scenario: Assign a material to multiple elements in one request
    Given the file contains walls with globalIds "0VkXyZ2aB3c4D5e6F7gH8i", "1aBcDeFgHiJ2kLmNoPqRsT", and "2bCdEfGhIjK3lMnOpQrStU"
    When a POST request is sent to "/api/v1/ifc/files/file-001/materials/mat-001/assignments" with body:
      """
      {
        "elementGlobalIds": [
          "0VkXyZ2aB3c4D5e6F7gH8i",
          "1aBcDeFgHiJ2kLmNoPqRsT",
          "2bCdEfGhIjK3lMnOpQrStU"
        ]
      }
      """
    Then the response status is 200
    And the response body contains "assignedCount": 3
    And the response body contains "materialName": "Concrete - C30/37"

  @S-250 @UC-USR-023
  Scenario: Bulk assignment returns partial success when some elements do not exist
    Given the file contains a wall with globalId "0VkXyZ2aB3c4D5e6F7gH8i"
    When a POST request is sent to "/api/v1/ifc/files/file-001/materials/mat-001/assignments" with body:
      """
      {
        "elementGlobalIds": [
          "0VkXyZ2aB3c4D5e6F7gH8i",
          "NONEXISTENT_GLOBALID_22"
        ]
      }
      """
    Then the response status is 207
    And the response body "succeeded" array contains "0VkXyZ2aB3c4D5e6F7gH8i"
    And the response body "failed" array contains an entry with "globalId": "NONEXISTENT_GLOBALID_22" and "reason": "element not found"

  # ───────────────────────────────────────────────
  # Material Constituent Sets
  # ───────────────────────────────────────────────

  @S-251 @UC-USR-023
  Scenario: Define a material constituent set for a curtain wall
    Given the file contains a curtain wall with globalId "3cDeFgHiJkL4mNoPqRsTuV"
    When a PUT request is sent to "/api/v1/ifc/files/file-001/elements/3cDeFgHiJkL4mNoPqRsTuV/material" with body:
      """
      {
        "assignmentType": "IfcMaterialConstituentSet",
        "name": "Curtain Wall Assembly",
        "constituents": [
          { "materialName": "Glass - Float 6mm", "name": "Glazing Panel", "fraction": 0.75, "category": "Glazing" },
          { "materialName": "Aluminium - 6063-T5", "name": "Frame", "fraction": 0.25, "category": "Framing" }
        ]
      }
      """
    Then the response status is 200
    And the response body contains "assignmentType": "IfcMaterialConstituentSet"
    And the response body contains "name": "Curtain Wall Assembly"
    And the response body "constituents" array contains 2 items
    And the first constituent has "materialName": "Glass - Float 6mm" and "fraction": 0.75

  @S-252 @UC-USR-023
  Scenario: Get the material constituent set for an element
    Given the curtain wall "3cDeFgHiJkL4mNoPqRsTuV" has a material constituent set with constituents "Glazing Panel" and "Frame"
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/3cDeFgHiJkL4mNoPqRsTuV/material"
    Then the response status is 200
    And the response body contains "assignmentType": "IfcMaterialConstituentSet"
    And the response body "constituents" array contains an entry with "name": "Glazing Panel"
    And the response body "constituents" array contains an entry with "name": "Frame"

  # ───────────────────────────────────────────────
  # Material Profile Sets
  # ───────────────────────────────────────────────

  @S-253 @UC-USR-023
  Scenario: Define a material profile set for a structural beam
    Given the file contains a beam with globalId "4dEfGhIjKlM5nOpQrStUvW"
    When a PUT request is sent to "/api/v1/ifc/files/file-001/elements/4dEfGhIjKlM5nOpQrStUvW/material" with body:
      """
      {
        "assignmentType": "IfcMaterialProfileSet",
        "name": "UB 305x165x40",
        "profiles": [
          {
            "materialName": "Steel - S355",
            "name": "Main Profile",
            "profile": {
              "type": "IfcIShapeProfileDef",
              "overallWidth": 0.165,
              "overallDepth": 0.303,
              "webThickness": 0.006,
              "flangeThickness": 0.0102
            }
          }
        ]
      }
      """
    Then the response status is 200
    And the response body contains "assignmentType": "IfcMaterialProfileSet"
    And the response body contains "name": "UB 305x165x40"
    And the response body "profiles" array contains 1 item
    And the first profile has "materialName": "Steel - S355"

  @S-254 @UC-USR-023
  Scenario: Get the material profile set for a beam element
    Given the beam "4dEfGhIjKlM5nOpQrStUvW" has a material profile set with profile "Main Profile"
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/4dEfGhIjKlM5nOpQrStUvW/material"
    Then the response status is 200
    And the response body contains "assignmentType": "IfcMaterialProfileSet"
    And the response body "profiles" array contains an entry with "name": "Main Profile"
    And the profile contains a "profile" object with "type": "IfcIShapeProfileDef"

  # ───────────────────────────────────────────────
  # Update and Remove Constituents
  # ───────────────────────────────────────────────

  @S-255 @UC-USR-023
  Scenario: Update a constituent in a constituent set
    Given the curtain wall "3cDeFgHiJkL4mNoPqRsTuV" has a material constituent set with constituent "Glazing Panel" at fraction 0.75
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/elements/3cDeFgHiJkL4mNoPqRsTuV/material/constituents/0" with body:
      """
      { "fraction": 0.80 }
      """
    Then the response status is 200
    And the response body contains "fraction": 0.8
    And the response body contains "name": "Glazing Panel"

  @S-256 @UC-USR-023
  Scenario: Remove a constituent from a constituent set
    Given the curtain wall "3cDeFgHiJkL4mNoPqRsTuV" has a material constituent set with 2 constituents
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/elements/3cDeFgHiJkL4mNoPqRsTuV/material/constituents/1"
    Then the response status is 200
    And the response body "constituents" array contains 1 item
