@F-017 @UC-USR-015
Feature: IFC building element management
  As a user
  I want to create, read, update, and delete physical building elements in an IFC model via the REST API
  So that I can model the built fabric of a building programmatically

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write ifc:delete"
    And the user has an IFC file with ID "file-001"
    And the file contains a building storey with globalId "3HVHnEQiv5Fe2LJwPJMC9j" named "Ground Floor"

  # ───────────────────────────────────────────────
  # List and Get
  # ───────────────────────────────────────────────

  @S-116 @UC-USR-015
  Scenario: List all IfcWall elements on a specific storey
    Given the ground floor contains 4 walls identified by the IFC type "IfcWall"
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements?storeyId=3HVHnEQiv5Fe2LJwPJMC9j&type=IfcWall"
    Then the response status is 200
    And the response body contains an "elements" array with 4 items
    And each item has an "ifcType" of "IfcWall"

  @S-117 @UC-USR-015
  Scenario: Get a single wall element by its GlobalId
    Given the IFC file contains a wall with globalId "0VkXyZ2aB3c4D5e6F7gH8i" and name "EW-North External Wall"
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i"
    Then the response status is 200
    And the response body contains "ifcType": "IfcWall"
    And the response body contains "globalId": "0VkXyZ2aB3c4D5e6F7gH8i"
    And the response body contains "name": "EW-North External Wall"

  # ───────────────────────────────────────────────
  # Walls
  # ───────────────────────────────────────────────

  @S-118 @UC-USR-015
  Scenario: Create a new standard wall on a storey
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements" with body:
      """
      {
        "ifcType": "IfcWall",
        "name": "EW-South External Wall",
        "description": "200mm rendered masonry external wall",
        "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j"
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcWall"
    And the response body contains "name": "EW-South External Wall"
    And the response body contains a "globalId" field

  @S-119 @UC-USR-015
  Scenario: Update a wall's name and description
    Given a wall exists with globalId "0VkXyZ2aB3c4D5e6F7gH8i" and name "EW-North External Wall"
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i" with body:
      """
      { "name": "EW-North Facade Wall", "description": "250mm insulated external wall panel" }
      """
    Then the response status is 200
    And the response body contains "name": "EW-North Facade Wall"
    And the response body contains "description": "250mm insulated external wall panel"

  @S-120 @UC-USR-015
  Scenario: Delete a building element
    Given a wall exists with globalId "0VkXyZ2aB3c4D5e6F7gH8i"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i"
    Then the response status is 204
    And a subsequent GET to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i" returns status 404

  # ───────────────────────────────────────────────
  # Slabs (Floors and Roofs)
  # ───────────────────────────────────────────────

  @S-121 @UC-USR-015
  Scenario: Create a floor slab on the ground floor
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements" with body:
      """
      {
        "ifcType": "IfcSlab",
        "predefinedType": "FLOOR",
        "name": "GF-Slab-001",
        "description": "150mm reinforced concrete ground floor slab",
        "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j"
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcSlab"
    And the response body contains "predefinedType": "FLOOR"
    And the response body contains "name": "GF-Slab-001"

  # ───────────────────────────────────────────────
  # Structural Elements
  # ───────────────────────────────────────────────

  @S-122 @UC-USR-015
  Scenario: Create a structural column
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements" with body:
      """
      {
        "ifcType": "IfcColumn",
        "predefinedType": "COLUMN",
        "name": "COL-A1",
        "description": "300x300 reinforced concrete column",
        "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j"
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcColumn"
    And the response body contains "name": "COL-A1"

  @S-123 @UC-USR-015
  Scenario: Create a structural beam
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements" with body:
      """
      {
        "ifcType": "IfcBeam",
        "predefinedType": "BEAM",
        "name": "BM-A1-A2",
        "description": "610x229x125 UB steel beam",
        "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j"
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcBeam"
    And the response body contains "name": "BM-A1-A2"

  # ───────────────────────────────────────────────
  # Openings
  # ───────────────────────────────────────────────

  @S-124 @UC-USR-015
  Scenario: Create a door element within a wall
    Given a wall exists with globalId "0VkXyZ2aB3c4D5e6F7gH8i"
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements" with body:
      """
      {
        "ifcType": "IfcDoor",
        "predefinedType": "DOOR",
        "name": "DR-001",
        "description": "Single leaf external door 900x2100",
        "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j",
        "hostGlobalId": "0VkXyZ2aB3c4D5e6F7gH8i"
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcDoor"
    And the response body contains "name": "DR-001"

  @S-125 @UC-USR-015
  Scenario: Create a window element within a wall
    Given a wall exists with globalId "0VkXyZ2aB3c4D5e6F7gH8i"
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements" with body:
      """
      {
        "ifcType": "IfcWindow",
        "predefinedType": "WINDOW",
        "name": "WN-101",
        "description": "Double-glazed aluminium casement window 1200x1050",
        "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j",
        "hostGlobalId": "0VkXyZ2aB3c4D5e6F7gH8i"
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcWindow"
    And the response body contains "name": "WN-101"

  # ───────────────────────────────────────────────
  # Stairs
  # ───────────────────────────────────────────────

  @S-126 @UC-USR-015
  Scenario: Create a stair element spanning from ground floor to first floor
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements" with body:
      """
      {
        "ifcType": "IfcStair",
        "predefinedType": "STRAIGHT_RUN_STAIR",
        "name": "ST-01",
        "description": "Main escape stair, GF to 1F",
        "storeyGlobalId": "3HVHnEQiv5Fe2LJwPJMC9j"
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcStair"
    And the response body contains "name": "ST-01"
