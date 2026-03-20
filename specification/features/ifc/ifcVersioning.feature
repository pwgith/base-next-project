@F-027 @UC-USR-015
Feature: IFC model versioning
  As a user
  I want each mutating API operation on an IFC model to be automatically stored as a new immutable version in the database
  So that I have a complete audit trail of every change and can retrieve or restore any previous state of the model

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write ifc:delete"
    And the user has an IFC file with ID "file-001" currently at version 3

  # ───────────────────────────────────────────────
  # Version Created on Every Mutation
  # ───────────────────────────────────────────────

  @S-188 @UC-USR-015
  Scenario: Uploading a new IFC file creates version 1
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write"
    When a POST request is sent to "/api/v1/ifc/files" with the file "office-building.ifc" as multipart/form-data
    Then the response status is 201
    And the response body contains "version": 1
    And a GET to "/api/v1/ifc/files/{fileId}/versions" returns a "versions" array containing exactly 1 item with "version": 1

  @S-189 @UC-USR-015
  Scenario: Creating a new building element increments the file version
    Given the IFC file "file-001" is at version 3
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements" with body:
      """
      {
        "ifcType": "IfcWall",
        "name": "EW-South External Wall",
        "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j"
      }
      """
    Then the response status is 201
    And the response body contains "version": 4
    And a GET to "/api/v1/ifc/files/file-001" returns "currentVersion": 4

  @S-190 @UC-USR-015
  Scenario: Updating an element's properties increments the file version
    Given the IFC file "file-001" is at version 3
    And a wall exists with globalId "0VkXyZ2aB3c4D5e6F7gH8i"
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i" with body:
      """
      { "name": "EW-North Facade Wall" }
      """
    Then the response status is 200
    And the response body contains "version": 4
    And a GET to "/api/v1/ifc/files/file-001" returns "currentVersion": 4

  @S-191 @UC-USR-015
  Scenario: Deleting an element increments the file version
    Given the IFC file "file-001" is at version 3
    And a wall exists with globalId "0VkXyZ2aB3c4D5e6F7gH8i"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i"
    Then the response status is 204
    And the response header "X-IFC-Version" is "4"
    And a GET to "/api/v1/ifc/files/file-001" returns "currentVersion": 4

  @S-192 @UC-USR-015
  Scenario: A read-only GET request does not create a new version
    Given the IFC file "file-001" is at version 3
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements?type=IfcWall"
    Then the response status is 200
    And a GET to "/api/v1/ifc/files/file-001" still returns "currentVersion": 3

  # ───────────────────────────────────────────────
  # List Versions
  # ───────────────────────────────────────────────

  @S-193 @UC-USR-015
  Scenario: List all versions of an IFC file
    Given the IFC file "file-001" has versions 1, 2, and 3
    When a GET request is sent to "/api/v1/ifc/files/file-001/versions"
    Then the response status is 200
    And the response body contains a "versions" array with 3 items
    And each item contains "version", "createdAt", and "createdBy" fields
    And each item contains a "changeDescription" summarising the operation that created the version
    And the versions are ordered from newest to oldest

  # ───────────────────────────────────────────────
  # Get a Specific Version
  # ───────────────────────────────────────────────

  @S-194 @UC-USR-015
  Scenario: Get the metadata for a specific version of an IFC file
    When a GET request is sent to "/api/v1/ifc/files/file-001/versions/2"
    Then the response status is 200
    And the response body contains "version": 2
    And the response body contains a "createdAt" timestamp
    And the response body contains a "createdBy" field with the user identity that triggered the mutation
    And the response body contains a "changeDescription" field

  @S-195 @UC-USR-015
  Scenario: Download the IFC STEP snapshot at a specific historical version
    When a GET request is sent to "/api/v1/ifc/files/file-001/versions/2/download"
    Then the response status is 200
    And the response Content-Type is "application/x-step"
    And the response Content-Disposition header includes filename "file-001-v2.ifc"
    And the response body starts with "ISO-10303-21;"
    And the downloaded STEP file reflects the state of the model at version 2, not the current state

  # ───────────────────────────────────────────────
  # Restore a Version
  # ───────────────────────────────────────────────

  @S-196 @UC-USR-015
  Scenario: Restore an IFC model to a previous version — creates a new version
    Given the IFC file "file-001" is at version 5
    When a POST request is sent to "/api/v1/ifc/files/file-001/versions/2/restore"
    Then the response status is 201
    And the response body contains "version": 6
    And the response body contains "restoredFromVersion": 2
    And a GET to "/api/v1/ifc/files/file-001" returns "currentVersion": 6
    And the model at version 6 is identical to the model at version 2

  @S-197 @UC-USR-015
  Scenario: Requesting a version that does not exist returns 404
    When a GET request is sent to "/api/v1/ifc/files/file-001/versions/99"
    Then the response status is 404
    And the response body contains the error "Version 99 not found for file file-001"

  # ───────────────────────────────────────────────
  # Concurrency — Sequential Version Assignment
  # ───────────────────────────────────────────────

  @S-198 @UC-USR-015
  Scenario: Two concurrent mutations result in two sequential version numbers with no gaps
    Given the IFC file "file-001" is at version 3
    When two separate API clients each submit a PATCH to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i" simultaneously
    Then the system processes the mutations sequentially
    And the first committed mutation produces "version": 4
    And the second committed mutation produces "version": 5
    And no version numbers are skipped or duplicated
