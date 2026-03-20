@F-026 @UC-USR-015
Feature: IFC API OAuth token authentication and authorisation
  As a user
  I want every IFC REST API endpoint to enforce OAuth 2.0 token validation
  So that only authenticated users with the correct scope can access or modify IFC resources

  # ───────────────────────────────────────────────
  # No Token
  # ───────────────────────────────────────────────

  @S-182 @UC-USR-015
  Scenario: Request with no Authorization header is rejected with 401
    When a GET request is sent to "/api/v1/ifc/files/file-001" without an Authorization header
    Then the response status is 401
    And the response contains a "WWW-Authenticate" header with value 'Bearer realm="ifc-api"'
    And the response body contains the error "Authorization token required"

  # ───────────────────────────────────────────────
  # Invalid Tokens
  # ───────────────────────────────────────────────

  @S-183 @UC-USR-015
  Scenario: Request with an expired OAuth token is rejected with 401
    When a GET request is sent to "/api/v1/ifc/files/file-001" with an expired Bearer token
    Then the response status is 401
    And the response body contains the error "Token has expired"

  @S-184 @UC-USR-015
  Scenario: Request with a malformed token string is rejected with 401
    When a GET request is sent to "/api/v1/ifc/files/file-001" with Authorization header "Bearer not-a-valid-jwt"
    Then the response status is 401
    And the response body contains the error "Token is invalid"

  # ───────────────────────────────────────────────
  # Insufficient Scope
  # ───────────────────────────────────────────────

  @S-185 @UC-USR-015
  Scenario: Write request using a read-only token is rejected with 403
    Given the user holds a valid OAuth token with scope "ifc:read" only
    When a POST request is sent to "/api/v1/ifc/files" with a valid IFC STEP file
    Then the response status is 403
    And the response body contains the error "Insufficient scope; required: ifc:write"

  @S-186 @UC-USR-015
  Scenario: Delete request using a read-only token is rejected with 403
    Given the user holds a valid OAuth token with scope "ifc:read" only
    And the user has an IFC file with ID "file-001"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001"
    Then the response status is 403
    And the response body contains the error "Insufficient scope; required: ifc:delete"

  # ───────────────────────────────────────────────
  # Valid Token — Happy Path
  # ───────────────────────────────────────────────

  @S-187 @UC-USR-015
  Scenario: Request with a valid token and correct scope succeeds
    Given the user holds a valid OAuth token with scope "ifc:read"
    And the user has an IFC file with ID "file-001"
    When a GET request is sent to "/api/v1/ifc/files/file-001"
    Then the response status is 200
    And the response body contains "fileId": "file-001"
