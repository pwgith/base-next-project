@F-016 @UC-USR-015
Feature: IFC spatial structure management
  As a user
  I want to read and modify the spatial structure of an IFC model via the REST API
  So that I can organise my building model into projects, sites, buildings, storeys, and spaces programmatically

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write ifc:delete"
    And the user has an IFC file with ID "file-001" containing an "IfcProject" named "Office Development"

  # ───────────────────────────────────────────────
  # Read
  # ───────────────────────────────────────────────

  @S-108 @UC-USR-015
  Scenario: Get the full spatial hierarchy of an IFC model
    When a GET request is sent to "/api/v1/ifc/files/file-001/spatial-structure"
    Then the response status is 200
    And the response body contains a "project" node with "name": "Office Development"
    And the project node contains a "sites" array
    And each site contains a "buildings" array
    And each building contains a "storeys" array
    And each storey contains a "spaces" array

  @S-109 @UC-USR-015
  Scenario: Get the root IfcProject entity of an IFC file
    When a GET request is sent to "/api/v1/ifc/files/file-001/project"
    Then the response status is 200
    And the response body contains "ifcType": "IfcProject"
    And the response body contains "name": "Office Development"
    And the response body contains "description": "Mixed-use office development, Phase 1"
    And the response body contains a "globalId" matching the pattern of a 22-character IFC GlobalId

  # ───────────────────────────────────────────────
  # Storeys
  # ───────────────────────────────────────────────

  @S-110 @UC-USR-015
  Scenario: Create a new building storey
    When a POST request is sent to "/api/v1/ifc/files/file-001/storeys" with body:
      """
      { "name": "Level 03", "elevation": 9.0 }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcBuildingStorey"
    And the response body contains "name": "Level 03"
    And the response body contains "elevation": 9.0
    And the response body contains a "globalId" field

  @S-111 @UC-USR-015
  Scenario: Update a building storey's name and elevation
    Given a building storey exists with globalId "2YByTx5Kv4wO3rJpL8uN1z" and name "Roof"
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/storeys/2YByTx5Kv4wO3rJpL8uN1z" with body:
      """
      { "name": "Plant Room", "elevation": 18.5 }
      """
    Then the response status is 200
    And the response body contains "name": "Plant Room"
    And the response body contains "elevation": 18.5

  @S-112 @UC-USR-015
  Scenario: Delete an empty building storey
    Given a building storey exists with globalId "2YByTx5Kv4wO3rJpL8uN1z" and it contains no elements or spaces
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/storeys/2YByTx5Kv4wO3rJpL8uN1z"
    Then the response status is 204

  @S-113 @UC-USR-015
  Scenario: Attempting to delete a storey that still contains elements returns 409
    Given a building storey exists with globalId "3HVHnEQiv5Fe2LJwPJMC9j" that contains 12 building elements
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/storeys/3HVHnEQiv5Fe2LJwPJMC9j"
    Then the response status is 409
    And the response body contains the error "Storey still contains elements; relocate or delete them before removing the storey"

  # ───────────────────────────────────────────────
  # Spaces
  # ───────────────────────────────────────────────

  @S-114 @UC-USR-015
  Scenario: Create a space within a building storey
    Given a building storey exists with globalId "3HVHnEQiv5Fe2LJwPJMC9j" named "Ground Floor"
    When a POST request is sent to "/api/v1/ifc/files/file-001/storeys/3HVHnEQiv5Fe2LJwPJMC9j/spaces" with body:
      """
      { "name": "Reception", "longName": "Main Reception Area" }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcSpace"
    And the response body contains "name": "Reception"
    And the response body contains "longName": "Main Reception Area"
    And the response body contains a "globalId" field

  @S-115 @UC-USR-015
  Scenario: Update a space name and long name
    Given a space exists with globalId "1aB2cD3eF4gH5iJ6kL7mN8" and name "Reception"
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/spaces/1aB2cD3eF4gH5iJ6kL7mN8" with body:
      """
      { "name": "Lobby", "longName": "Main Lobby and Waiting Area" }
      """
    Then the response status is 200
    And the response body contains "name": "Lobby"
    And the response body contains "longName": "Main Lobby and Waiting Area"
