@F-015 @UC-USR-015
Feature: IFC file management
  As a user
  I want to upload, list, retrieve metadata for, download, and delete my IFC files via the REST API
  So that I can manage my BIM models programmatically without a UI

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write ifc:delete"

  # ───────────────────────────────────────────────
  # Upload
  # ───────────────────────────────────────────────

  @S-100 @UC-USR-015
  Scenario: Upload a valid IFC4 STEP file
    When a POST request is sent to "/api/v1/ifc/files" with the file "office-building.ifc" as multipart/form-data
    Then the response status is 201
    And the response body contains a "fileId" field
    And the response body contains "name": "office-building.ifc"
    And the response body contains "schema": "IFC4"

  @S-101 @UC-USR-015
  Scenario: Upload a file that is not a valid IFC STEP file is rejected
    When a POST request is sent to "/api/v1/ifc/files" with the file "drawing.pdf" as multipart/form-data
    Then the response status is 422
    And the response body contains the error "File must be a valid IFC STEP (.ifc) file"

  # ───────────────────────────────────────────────
  # List
  # ───────────────────────────────────────────────

  @S-102 @UC-USR-015
  Scenario: List all IFC files owned by the authenticated user
    Given the user has previously uploaded IFC files named "office-building.ifc" with ID "file-001" and "warehouse.ifc" with ID "file-002"
    When a GET request is sent to "/api/v1/ifc/files"
    Then the response status is 200
    And the response body contains a "files" array with 2 items
    And the array contains an entry with "fileId": "file-001" and "name": "office-building.ifc"
    And the array contains an entry with "fileId": "file-002" and "name": "warehouse.ifc"

  # ───────────────────────────────────────────────
  # Get Metadata
  # ───────────────────────────────────────────────

  @S-103 @UC-USR-015
  Scenario: Get metadata for an IFC file by its ID
    Given the user has an IFC file with ID "file-001" named "office-building.ifc" using schema "IFC4"
    When a GET request is sent to "/api/v1/ifc/files/file-001"
    Then the response status is 200
    And the response body contains "fileId": "file-001"
    And the response body contains "name": "office-building.ifc"
    And the response body contains "schema": "IFC4"
    And the response body contains a "createdAt" timestamp
    And the response body contains an "elementCount" integer

  # ───────────────────────────────────────────────
  # Download
  # ───────────────────────────────────────────────

  @S-104 @UC-USR-015
  Scenario: Download an IFC file as a STEP-encoded binary
    Given the user has an IFC file with ID "file-001"
    When a GET request is sent to "/api/v1/ifc/files/file-001/download"
    Then the response status is 200
    And the response Content-Type is "application/x-step"
    And the response body starts with "ISO-10303-21;"

  # ───────────────────────────────────────────────
  # Delete
  # ───────────────────────────────────────────────

  @S-105 @UC-USR-015
  Scenario: Delete an IFC file permanently
    Given the user has an IFC file with ID "file-001"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001"
    Then the response status is 204
    And a subsequent GET to "/api/v1/ifc/files/file-001" returns status 404

  # ───────────────────────────────────────────────
  # Exception Flows
  # ───────────────────────────────────────────────

  @S-106 @UC-USR-015
  Scenario: Request for a non-existent IFC file returns 404
    When a GET request is sent to "/api/v1/ifc/files/file-does-not-exist"
    Then the response status is 404
    And the response body contains the error "IFC file not found"

  @S-107 @UC-USR-015
  Scenario: Accessing an IFC file owned by another user returns 403
    Given another user owns an IFC file with ID "file-other-user"
    When a GET request is sent to "/api/v1/ifc/files/file-other-user"
    Then the response status is 403
    And the response body contains the error "Access denied"
