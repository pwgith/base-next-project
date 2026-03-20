@F-020 @UC-USR-015
Feature: IFC material management
  As a user
  I want to define materials and assign them to IFC elements via the REST API
  So that I can specify the material composition of building elements programmatically

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write ifc:delete"
    And the user has an IFC file with ID "file-001"
    And the file contains a wall with globalId "0VkXyZ2aB3c4D5e6F7gH8i" named "EW-North External Wall"

  # ───────────────────────────────────────────────
  # List and Create Materials
  # ───────────────────────────────────────────────

  @S-142 @UC-USR-015
  Scenario: List all materials defined in an IFC file
    Given the IFC file contains materials "Concrete - C30/37", "Structural Steel - S275", and "Brick - Engineering"
    When a GET request is sent to "/api/v1/ifc/files/file-001/materials"
    Then the response status is 200
    And the response body contains a "materials" array with 3 items
    And the array contains an entry with "name": "Concrete - C30/37"
    And the array contains an entry with "name": "Structural Steel - S275"
    And the array contains an entry with "name": "Brick - Engineering"

  @S-143 @UC-USR-015
  Scenario: Create a new material definition
    When a POST request is sent to "/api/v1/ifc/files/file-001/materials" with body:
      """
      { "name": "Gypsum Plasterboard - 12.5mm", "category": "Lining" }
      """
    Then the response status is 201
    And the response body contains "name": "Gypsum Plasterboard - 12.5mm"
    And the response body contains "category": "Lining"
    And the response body contains a "materialId" field

  # ───────────────────────────────────────────────
  # Single Material Assignment
  # ───────────────────────────────────────────────

  @S-144 @UC-USR-015
  Scenario: Assign a single material to an element
    Given the material "Concrete - C30/37" exists with materialId "mat-001"
    When a PUT request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/material" with body:
      """
      { "materialId": "mat-001" }
      """
    Then the response status is 200
    And the response body contains "assignmentType": "IfcMaterial"
    And the response body contains "name": "Concrete - C30/37"

  @S-145 @UC-USR-015
  Scenario: Get the material assignment for an element
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" is assigned a material layer set
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/material"
    Then the response status is 200
    And the response body contains an "assignmentType" field
    And the response body contains a "layers" or "material" field depending on the assignment type

  # ───────────────────────────────────────────────
  # Material Layer Sets (Composite Walls, Slabs)
  # ───────────────────────────────────────────────

  @S-146 @UC-USR-015
  Scenario: Define a material layer set for a composite wall
    When a PUT request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/material" with body:
      """
      {
        "assignmentType": "IfcMaterialLayerSetUsage",
        "layers": [
          { "materialName": "Brick - Engineering", "thickness": 0.1025 },
          { "materialName": "Mineral Wool Insulation", "thickness": 0.075 },
          { "materialName": "Concrete Block - Dense", "thickness": 0.1 },
          { "materialName": "Gypsum Plasterboard - 12.5mm", "thickness": 0.0125 }
        ]
      }
      """
    Then the response status is 200
    And the response body contains "assignmentType": "IfcMaterialLayerSetUsage"
    And the response body "layers" array contains 4 items
    And the first layer has "materialName": "Brick - Engineering" and "thickness": 0.1025

  @S-147 @UC-USR-015
  Scenario: Update the thickness of a material layer
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has a material layer set with a layer "Mineral Wool Insulation" at thickness 0.075
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/material/layers/1" with body:
      """
      { "thickness": 0.1 }
      """
    Then the response status is 200
    And the response body contains "thickness": 0.1

  # ───────────────────────────────────────────────
  # Remove Assignment
  # ───────────────────────────────────────────────

  @S-148 @UC-USR-015
  Scenario: Remove the material assignment from an element
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has a material assignment
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/material"
    Then the response status is 204
    And a subsequent GET to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/material" returns status 404
