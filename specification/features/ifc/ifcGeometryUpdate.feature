@F-031 @UC-USR-019
Feature: IFC geometry update
  As a user
  I want to update the geometric representation of IFC elements via the REST API
  So that I can modify the shape and dimensions of BIM elements programmatically

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write"
    And the user has an IFC file with ID "file-001"
    And the file contains a wall with globalId "0VkXyZ2aB3c4D5e6F7gH8i"

  # ───────────────────────────────────────────────
  # Update Geometry via PATCH (partial update)
  # ───────────────────────────────────────────────

  @S-222 @UC-USR-019
  Scenario: Update the extrusion depth of a SweptSolid representation
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has a SweptSolid geometry with extrusion depth 2.8
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/geometry" with body:
      """
      {
        "representations": [
          {
            "representationType": "SweptSolid",
            "items": [
              {
                "type": "IfcExtrudedAreaSolid",
                "depth": 3.2
              }
            ]
          }
        ]
      }
      """
    Then the response status is 200
    And the response body "representations" array contains 1 item
    And the first representation has "representationType": "SweptSolid"
    And the first item has "depth": 3.2

  @S-223 @UC-USR-019
  Scenario: Update the profile of an extruded area solid
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has a SweptSolid geometry with an IfcRectangleProfileDef of xDim 0.2 and yDim 5.0
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/geometry" with body:
      """
      {
        "representations": [
          {
            "representationType": "SweptSolid",
            "items": [
              {
                "type": "IfcExtrudedAreaSolid",
                "profile": {
                  "type": "IfcRectangleProfileDef",
                  "xDim": 0.3,
                  "yDim": 6.0
                }
              }
            ]
          }
        ]
      }
      """
    Then the response status is 200
    And the first item "profile" has "xDim": 0.3 and "yDim": 6.0

  # ───────────────────────────────────────────────
  # Replace Geometry via PUT (full replacement)
  # ───────────────────────────────────────────────

  @S-224 @UC-USR-019
  Scenario: Replace entire geometry with a Brep representation
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has a SweptSolid geometry
    When a PUT request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/geometry" with body:
      """
      {
        "representations": [
          {
            "representationType": "Brep",
            "items": [
              {
                "type": "IfcFacetedBrep",
                "faces": [
                  { "bounds": [{"x": 0, "y": 0, "z": 0}, {"x": 5, "y": 0, "z": 0}, {"x": 5, "y": 0.2, "z": 0}, {"x": 0, "y": 0.2, "z": 0}] },
                  { "bounds": [{"x": 0, "y": 0, "z": 3}, {"x": 5, "y": 0, "z": 3}, {"x": 5, "y": 0.2, "z": 3}, {"x": 0, "y": 0.2, "z": 3}] }
                ]
              }
            ]
          }
        ]
      }
      """
    Then the response status is 200
    And the response body "representations" array contains 1 item
    And the first representation has "representationType": "Brep"

  # ───────────────────────────────────────────────
  # Error Handling
  # ───────────────────────────────────────────────

  @S-225 @UC-USR-019
  Scenario: Reject geometry update with unsupported representation type
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/geometry" with body:
      """
      {
        "representations": [
          {
            "representationType": "InvalidType",
            "items": []
          }
        ]
      }
      """
    Then the response status is 422
    And the response body contains an error with message containing "representationType"

  @S-226 @UC-USR-019
  Scenario: Reject geometry update for a non-existent element
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/elements/NONEXISTENT_GLOBALID_22/geometry" with body:
      """
      {
        "representations": [
          {
            "representationType": "SweptSolid",
            "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 3.0 }]
          }
        ]
      }
      """
    Then the response status is 404

  # ───────────────────────────────────────────────
  # Versioning
  # ───────────────────────────────────────────────

  @S-227 @UC-USR-019
  Scenario: Geometry update creates a new version snapshot
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has a SweptSolid geometry with extrusion depth 2.8
    And the IFC file "file-001" is at version 3
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/geometry" with body:
      """
      {
        "representations": [
          {
            "representationType": "SweptSolid",
            "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 3.5 }]
          }
        ]
      }
      """
    Then the response status is 200
    And the response header "X-IFC-Version" is "4"
