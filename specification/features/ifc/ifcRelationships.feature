@F-022 @UC-USR-015
Feature: IFC relationship management
  As a user
  I want to read and modify relationships between IFC entities via the REST API
  So that I can control spatial containment, type assignments, grouping, and system membership programmatically

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write ifc:delete"
    And the user has an IFC file with ID "file-001"
    And the file contains a wall with globalId "0VkXyZ2aB3c4D5e6F7gH8i"
    And the file contains building storeys: "Ground Floor" (globalId "3HVHnEQiv5Fe2LJwPJMC9j") and "First Floor" (globalId "4KLMnOpQrSt5U6V7W8X9YZ")

  # ───────────────────────────────────────────────
  # Spatial Containment
  # ───────────────────────────────────────────────

  @S-155 @UC-USR-015
  Scenario: Get the spatial containment for an element (which storey it belongs to)
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/spatial-containment"
    Then the response status is 200
    And the response body contains "containedIn" with "ifcType": "IfcBuildingStorey"
    And the response body contains "containedIn" with "name": "Ground Floor"
    And the response body contains "containedIn" with "globalId": "3HVHnEQiv5Fe2LJwPJMC9j"

  @S-156 @UC-USR-015
  Scenario: Move an element from one storey to another by updating its spatial containment
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" is currently contained in "Ground Floor"
    When a PUT request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/spatial-containment" with body:
      """
      { "storeyGlobalId": "4KLMnOpQrSt5U6V7W8X9YZ" }
      """
    Then the response status is 200
    And the response body contains "containedIn" with "globalId": "4KLMnOpQrSt5U6V7W8X9YZ"
    And the response body contains "containedIn" with "name": "First Floor"

  # ───────────────────────────────────────────────
  # Type Assignments
  # ───────────────────────────────────────────────

  @S-157 @UC-USR-015
  Scenario: Get the type definition assigned to an element
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" is assigned to type "IfcWallType" with globalId "9AbCdEfGhIj0KlMnOpQrSt"
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/type"
    Then the response status is 200
    And the response body contains "ifcType": "IfcWallType"
    And the response body contains "globalId": "9AbCdEfGhIj0KlMnOpQrSt"
    And the response body contains "name": "EXT-WALL-200-MASONRY"

  @S-158 @UC-USR-015
  Scenario: Assign a type definition to an element
    Given the IFC file contains an "IfcWallType" with globalId "9AbCdEfGhIj0KlMnOpQrSt" and name "EXT-WALL-200-MASONRY"
    When a PUT request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/type" with body:
      """
      { "typeGlobalId": "9AbCdEfGhIj0KlMnOpQrSt" }
      """
    Then the response status is 200
    And the response body contains "ifcType": "IfcWallType"
    And the response body contains "name": "EXT-WALL-200-MASONRY"

  # ───────────────────────────────────────────────
  # Groups (IfcGroup)
  # ───────────────────────────────────────────────

  @S-159 @UC-USR-015
  Scenario: Create a named group and assign elements to it
    When a POST request is sent to "/api/v1/ifc/files/file-001/groups" with body:
      """
      {
        "name": "Fire Compartment A",
        "description": "All elements within fire compartment A on the ground floor",
        "memberGlobalIds": ["0VkXyZ2aB3c4D5e6F7gH8i", "1aB2cD3eF4gH5iJ6kL7mN8"]
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcGroup"
    And the response body contains "name": "Fire Compartment A"
    And the response body "members" array contains 2 items
    And the response body contains a "globalId" field

  @S-160 @UC-USR-015
  Scenario: Add a further element to an existing group
    Given a group exists with globalId "6FGHijklMNop7QRSTuvwXY" named "Fire Compartment A" with 2 members
    When a POST request is sent to "/api/v1/ifc/files/file-001/groups/6FGHijklMNop7QRSTuvwXY/members" with body:
      """
      { "memberGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j" }
      """
    Then the response status is 200
    And the response body "members" array contains 3 items

  # ───────────────────────────────────────────────
  # Systems (IfcSystem — MEP, Structural)
  # ───────────────────────────────────────────────

  @S-161 @UC-USR-015
  Scenario: Create an HVAC system and assign MEP elements to it
    When a POST request is sent to "/api/v1/ifc/files/file-001/systems" with body:
      """
      {
        "name": "HVAC Supply Air System - Ground Floor",
        "predefinedType": "AIRCONDITIONING",
        "memberGlobalIds": ["7pQrStUvWxYz1A2B3C4D5E"]
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcSystem"
    And the response body contains "name": "HVAC Supply Air System - Ground Floor"
    And the response body "members" array contains 1 item

  # ───────────────────────────────────────────────
  # Remove from Group
  # ───────────────────────────────────────────────

  @S-162 @UC-USR-015
  Scenario: Remove an element from a group
    Given a group exists with globalId "6FGHijklMNop7QRSTuvwXY" containing member "0VkXyZ2aB3c4D5e6F7gH8i"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/groups/6FGHijklMNop7QRSTuvwXY/members/0VkXyZ2aB3c4D5e6F7gH8i"
    Then the response status is 204
    And a subsequent GET to "/api/v1/ifc/files/file-001/groups/6FGHijklMNop7QRSTuvwXY" no longer lists "0VkXyZ2aB3c4D5e6F7gH8i" as a member
