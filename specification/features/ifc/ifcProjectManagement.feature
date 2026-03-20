@F-028 @UC-USR-016
Feature: IFC project management
  As a user
  I want to create and manage named projects, each with its own independently versioned IFC model
  So that I can work on multiple building models simultaneously without one project's changes affecting another

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write ifc:delete"

  # ───────────────────────────────────────────────
  # Create Project
  # ───────────────────────────────────────────────

  @S-199 @UC-USR-016
  Scenario: Create a new project initialises an empty IFC model at version 1
    When a POST request is sent to "/api/v1/projects" with body:
      """
      { "name": "Office Building", "description": "Six-storey mixed-use office development, Manchester" }
      """
    Then the response status is 201
    And the response body contains a "projectId" field
    And the response body contains "name": "Office Building"
    And the response body contains "description": "Six-storey mixed-use office development, Manchester"
    And the response body contains "currentIfcVersion": 1
    And the response body contains a "createdAt" timestamp
    And the response body contains a "lastUpdatedAt" timestamp equal to "createdAt"
    And a GET to "/api/v1/projects/{projectId}/ifc/project" returns an empty IfcProject entity

  @S-200 @UC-USR-016
  Scenario: Creating a project with a duplicate name for the same user returns 409
    Given the user already owns a project named "Office Building"
    When a POST request is sent to "/api/v1/projects" with body:
      """
      { "name": "Office Building" }
      """
    Then the response status is 409
    And the response body contains the error "A project named 'Office Building' already exists in your workspace"

  @S-201 @UC-USR-016
  Scenario: Two different users may have projects with the same name independently
    Given user "alice@example.com" already owns a project named "Warehouse Extension"
    And the current user is "bob@example.com"
    When a POST request is sent to "/api/v1/projects" with body:
      """
      { "name": "Warehouse Extension" }
      """
    Then the response status is 201
    And the response body contains "name": "Warehouse Extension"

  @S-202 @UC-USR-016
  Scenario: Creating a project with a blank name returns 422
    When a POST request is sent to "/api/v1/projects" with body:
      """
      { "name": "" }
      """
    Then the response status is 422
    And the response body contains the error "Project name is required"

  # ───────────────────────────────────────────────
  # List Projects
  # ───────────────────────────────────────────────

  @S-203 @UC-USR-016
  Scenario: List all projects owned by the authenticated user
    Given the user owns projects "Office Building" (projectId "proj-001") and "Warehouse Extension" (projectId "proj-002")
    When a GET request is sent to "/api/v1/projects"
    Then the response status is 200
    And the response body contains a "projects" array with 2 items
    And the array contains an entry with "projectId": "proj-001" and "name": "Office Building"
    And the array contains an entry with "projectId": "proj-002" and "name": "Warehouse Extension"
    And each entry contains "currentIfcVersion", "createdAt", "lastUpdatedAt", and "description" fields
    And the projects are ordered by "lastUpdatedAt" descending

  # ───────────────────────────────────────────────
  # Get a Single Project
  # ───────────────────────────────────────────────

  @S-204 @UC-USR-016
  Scenario: Get project metadata by project ID
    Given the user owns a project with projectId "proj-001" named "Office Building" at IFC version 7
    When a GET request is sent to "/api/v1/projects/proj-001"
    Then the response status is 200
    And the response body contains "projectId": "proj-001"
    And the response body contains "name": "Office Building"
    And the response body contains "currentIfcVersion": 7
    And the response body contains a "createdAt" timestamp
    And the response body contains a "lastUpdatedAt" timestamp

  @S-205 @UC-USR-016
  Scenario: Accessing another user's project returns 404
    Given another user owns a project with projectId "proj-other"
    When a GET request is sent to "/api/v1/projects/proj-other"
    Then the response status is 404
    And the response body contains the error "Project not found"

  # ───────────────────────────────────────────────
  # Update Project Metadata
  # ───────────────────────────────────────────────

  @S-206 @UC-USR-016
  Scenario: Update a project name and description — lastUpdatedAt is set to the time of the change
    Given the user owns a project with projectId "proj-001" named "Office Building" created at "2026-03-10T09:00:00Z" with "lastUpdatedAt": "2026-03-10T09:00:00Z" at IFC version 5
    When a PATCH request is sent to "/api/v1/projects/proj-001" with body:
      """
      { "name": "Office Building — Phase 1", "description": "Updated to reflect Phase 1 scope only" }
      """
    Then the response status is 200
    And the response body contains "name": "Office Building — Phase 1"
    And the response body contains "description": "Updated to reflect Phase 1 scope only"
    And the response body contains "currentIfcVersion": 5
    And the response body contains "createdAt": "2026-03-10T09:00:00Z"
    And the response body "lastUpdatedAt" is later than "2026-03-10T09:00:00Z"

  # ───────────────────────────────────────────────
  # Independent Versioning Between Projects
  # ───────────────────────────────────────────────

  @S-207 @UC-USR-016
  Scenario: IFC mutations on one project do not affect the version of another project
    Given the user owns project "proj-001" named "Office Building" at IFC version 3
    And the user owns project "proj-002" named "Warehouse Extension" at IFC version 1
    When a POST request is sent to "/api/v1/projects/proj-001/ifc/elements" with body:
      """
      { "ifcType": "IfcWall", "name": "EW-North External Wall", "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j" }
      """
    Then the response status is 201
    And the response body contains "version": 4
    And a GET to "/api/v1/projects/proj-001" returns "currentIfcVersion": 4
    And a GET to "/api/v1/projects/proj-002" returns "currentIfcVersion": 1

  @S-208 @UC-USR-016
  Scenario: Each project maintains its own IFC version history independently
    Given the user owns project "proj-001" that has IFC versions 1, 2, and 3
    And the user owns project "proj-002" that has IFC versions 1 and 2
    When a GET request is sent to "/api/v1/projects/proj-001/ifc/versions"
    Then the response status is 200
    And the response body "versions" array contains 3 items
    When a GET request is sent to "/api/v1/projects/proj-002/ifc/versions"
    Then the response status is 200
    And the response body "versions" array contains 2 items

  # ───────────────────────────────────────────────
  # Delete Project
  # ───────────────────────────────────────────────

  @S-209 @UC-USR-016
  Scenario: Deleting a project that has IFC data without the confirm flag returns 409
    Given the user owns a project with projectId "proj-001" at IFC version 4
    When a DELETE request is sent to "/api/v1/projects/proj-001"
    Then the response status is 409
    And the response body contains the error "Project contains IFC data; add ?confirm=true to the request to permanently delete it"

  @S-210 @UC-USR-016
  Scenario: Deleting a project with confirm=true removes the project and all its IFC version history
    Given the user owns a project with projectId "proj-001" at IFC version 4
    When a DELETE request is sent to "/api/v1/projects/proj-001?confirm=true"
    Then the response status is 204
    And a subsequent GET to "/api/v1/projects/proj-001" returns status 404
    And a subsequent GET to "/api/v1/projects/proj-001/ifc/versions" returns status 404
