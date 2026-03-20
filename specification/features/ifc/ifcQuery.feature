@F-024 @UC-USR-015
Feature: IFC query and search
  As a user
  I want to query and filter IFC elements using various criteria via the REST API
  So that I can retrieve targeted subsets of BIM data without loading the entire model

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read"
    And the user has an IFC file with ID "file-001" containing a mixed building model

  # ───────────────────────────────────────────────
  # Filter by IFC Type
  # ───────────────────────────────────────────────

  @S-168 @UC-USR-015
  Scenario: Filter all elements of a specific IFC type
    Given the IFC file contains 14 walls of type "IfcWall" and 6 elements of other types
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements?type=IfcWall"
    Then the response status is 200
    And the response body "elements" array contains 14 items
    And every item has "ifcType": "IfcWall"

  # ───────────────────────────────────────────────
  # Filter by Name
  # ───────────────────────────────────────────────

  @S-169 @UC-USR-015
  Scenario: Filter elements by partial name match
    Given the IFC file contains elements named "EW-North External Wall", "EW-South External Wall", and "IW-01 Internal Wall"
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements?name=External+Wall"
    Then the response status is 200
    And the response body "elements" array contains 2 items
    And the array contains an entry with "name": "EW-North External Wall"
    And the array contains an entry with "name": "EW-South External Wall"

  # ───────────────────────────────────────────────
  # Filter by Property Value
  # ───────────────────────────────────────────────

  @S-170 @UC-USR-015
  Scenario: Filter elements by a property set value
    Given the IFC file contains 6 walls where "IsExternal" is true in "Pset_WallCommon" and 8 walls where it is false
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements?pset=Pset_WallCommon&property=IsExternal&value=true"
    Then the response status is 200
    And the response body "elements" array contains 6 items
    And every item has property "IsExternal" with value true in property set "Pset_WallCommon"

  # ───────────────────────────────────────────────
  # Get by GlobalId
  # ───────────────────────────────────────────────

  @S-171 @UC-USR-015
  Scenario: Get a single element by its IFC GlobalId
    Given the IFC file contains a wall with globalId "0VkXyZ2aB3c4D5e6F7gH8i"
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i"
    Then the response status is 200
    And the response body contains "globalId": "0VkXyZ2aB3c4D5e6F7gH8i"

  # ───────────────────────────────────────────────
  # Combined Filters
  # ───────────────────────────────────────────────

  @S-172 @UC-USR-015
  Scenario: Filter elements by storey and IFC type combined
    Given the ground floor (globalId "3HVHnEQiv5Fe2LJwPJMC9j") contains 4 walls and 2 slabs
    And the first floor (globalId "4KLMnOpQrSt5U6V7W8X9YZ") contains 3 walls and 1 slab
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements?storeyId=3HVHnEQiv5Fe2LJwPJMC9j&type=IfcWall"
    Then the response status is 200
    And the response body "elements" array contains 4 items
    And every item has "ifcType": "IfcWall"

  # ───────────────────────────────────────────────
  # Inventory and Metadata
  # ───────────────────────────────────────────────

  @S-173 @UC-USR-015
  Scenario: List all IFC entity types present in a file with their counts
    When a GET request is sent to "/api/v1/ifc/files/file-001/element-types"
    Then the response status is 200
    And the response body contains a "types" array
    And each entry contains a "ifcType" field and a "count" integer
    And the array contains an entry with "ifcType": "IfcWall"
    And the array contains an entry with "ifcType": "IfcDoor"

  # ───────────────────────────────────────────────
  # Pagination
  # ───────────────────────────────────────────────

  @S-174 @UC-USR-015
  Scenario: Paginate element list results using limit and offset
    Given the IFC file contains 50 elements of type "IfcWall"
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements?type=IfcWall&limit=10&offset=20"
    Then the response status is 200
    And the response body "elements" array contains 10 items
    And the response body contains "total": 50
    And the response body contains "limit": 10
    And the response body contains "offset": 20

  # ───────────────────────────────────────────────
  # Summary Statistics
  # ───────────────────────────────────────────────

  @S-175 @UC-USR-015
  Scenario: Get element counts grouped by IFC type and storey
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/summary?groupBy=type,storey"
    Then the response status is 200
    And the response body contains a "groups" array
    And each group entry contains "ifcType", "storeyName", and "count" fields
