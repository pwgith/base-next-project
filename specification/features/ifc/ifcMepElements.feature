@F-018 @UC-USR-015
Feature: IFC MEP element management
  As a user
  I want to create, read, update, and delete mechanical, electrical, and plumbing (MEP) elements in an IFC model via the REST API
  So that I can model building services systems programmatically

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write ifc:delete"
    And the user has an IFC file with ID "file-001"
    And the file contains a building storey with globalId "3HVHnEQiv5Fe2LJwPJMC9j" named "Ground Floor"

  # ───────────────────────────────────────────────
  # List
  # ───────────────────────────────────────────────

  @S-127 @UC-USR-015
  Scenario: List all MEP elements on a storey
    Given the ground floor contains an "IfcDuctSegment", an "IfcPipeSegment", and an "IfcLightFixture"
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements?storeyId=3HVHnEQiv5Fe2LJwPJMC9j&category=MEP"
    Then the response status is 200
    And the response body contains an "elements" array with 3 items

  # ───────────────────────────────────────────────
  # HVAC
  # ───────────────────────────────────────────────

  @S-128 @UC-USR-015
  Scenario: Create a rectangular duct segment
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements" with body:
      """
      {
        "ifcType": "IfcDuctSegment",
        "predefinedType": "RIGIDSEGMENT",
        "name": "DUCT-SUP-001",
        "description": "600x300 supply air duct, galvanised steel",
        "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j"
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcDuctSegment"
    And the response body contains "name": "DUCT-SUP-001"

  @S-129 @UC-USR-015
  Scenario: Create an air terminal (diffuser)
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements" with body:
      """
      {
        "ifcType": "IfcAirTerminal",
        "predefinedType": "DIFFUSER",
        "name": "ATA-001",
        "description": "600x600 square ceiling diffuser, supply air",
        "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j"
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcAirTerminal"
    And the response body contains "name": "ATA-001"

  # ───────────────────────────────────────────────
  # Plumbing
  # ───────────────────────────────────────────────

  @S-130 @UC-USR-015
  Scenario: Create a pipe segment
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements" with body:
      """
      {
        "ifcType": "IfcPipeSegment",
        "predefinedType": "RIGIDSEGMENT",
        "name": "PIPE-CWS-001",
        "description": "DN50 cold water supply pipe, copper",
        "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j"
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcPipeSegment"
    And the response body contains "name": "PIPE-CWS-001"

  # ───────────────────────────────────────────────
  # Electrical
  # ───────────────────────────────────────────────

  @S-131 @UC-USR-015
  Scenario: Create a light fixture
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements" with body:
      """
      {
        "ifcType": "IfcLightFixture",
        "predefinedType": "POINTSOURCE",
        "name": "LT-GF-001",
        "description": "600x600 LED recessed panel, 6000K, 4800lm",
        "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j"
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcLightFixture"
    And the response body contains "name": "LT-GF-001"

  @S-132 @UC-USR-015
  Scenario: Create an electrical appliance
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements" with body:
      """
      {
        "ifcType": "IfcElectricAppliance",
        "predefinedType": "SOCKET",
        "name": "SK-GF-001",
        "description": "Twin 13A switched socket outlet",
        "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j"
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcElectricAppliance"
    And the response body contains "name": "SK-GF-001"

  # ───────────────────────────────────────────────
  # Delete
  # ───────────────────────────────────────────────

  @S-133 @UC-USR-015
  Scenario: Delete an MEP element
    Given an MEP element exists with globalId "7pQrStUvWxYz1A2B3C4D5E"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/elements/7pQrStUvWxYz1A2B3C4D5E"
    Then the response status is 204
    And a subsequent GET to "/api/v1/ifc/files/file-001/elements/7pQrStUvWxYz1A2B3C4D5E" returns status 404
