@F-021 @UC-USR-015
Feature: IFC geometry and placement management
  As a user
  I want to read and modify the geometry representation and 3D placement of IFC elements via the REST API
  So that I can position, orient, and retrieve the shape data of BIM elements programmatically

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write"
    And the user has an IFC file with ID "file-001"
    And the file contains a wall with globalId "0VkXyZ2aB3c4D5e6F7gH8i"

  # ───────────────────────────────────────────────
  # Geometry Representation
  # ───────────────────────────────────────────────

  @S-149 @UC-USR-015
  Scenario: Get the geometry representation of an element
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/geometry"
    Then the response status is 200
    And the response body contains a "representations" array
    And each representation contains a "representationType" field such as "SweptSolid" or "Brep"
    And each representation contains a "items" array describing the geometric primitives

  @S-150 @UC-USR-015
  Scenario: Get the 3D placement (location and orientation) of an element
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/placement"
    Then the response status is 200
    And the response body contains a "location" object with "x", "y", and "z" coordinates in metres
    And the response body contains an "axis" object representing the element's extrusion direction
    And the response body contains a "refDirection" object representing the element's reference direction

  # ───────────────────────────────────────────────
  # Update Placement
  # ───────────────────────────────────────────────

  @S-151 @UC-USR-015
  Scenario: Move an element to a new 3D position
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/placement" with body:
      """
      {
        "location": { "x": 5.0, "y": 12.3, "z": 0.0 }
      }
      """
    Then the response status is 200
    And the response body "location" contains "x": 5.0 and "y": 12.3 and "z": 0.0

  @S-152 @UC-USR-015
  Scenario: Rotate an element by updating its axis and reference direction
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/placement" with body:
      """
      {
        "axis":         { "x": 0.0, "y": 0.0, "z": 1.0 },
        "refDirection": { "x": 0.0, "y": 1.0, "z": 0.0 }
      }
      """
    Then the response status is 200
    And the response body "axis" contains "x": 0.0 and "y": 0.0 and "z": 1.0
    And the response body "refDirection" contains "x": 0.0 and "y": 1.0 and "z": 0.0

  # ───────────────────────────────────────────────
  # Spatial Queries by Geometry
  # ───────────────────────────────────────────────

  @S-153 @UC-USR-015
  Scenario: Query elements whose placement falls within a 3D bounding box
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements?bbox=0,0,0,20,15,4"
    Then the response status is 200
    And the response body contains an "elements" array
    And every element in the array has a placement location within the bounds x[0–20], y[0–15], z[0–4]

  # ───────────────────────────────────────────────
  # Coordinate Reference System
  # ───────────────────────────────────────────────

  @S-154 @UC-USR-015
  Scenario: Get the coordinate reference system (CRS) of the project
    When a GET request is sent to "/api/v1/ifc/files/file-001/coordinate-reference-system"
    Then the response status is 200
    And the response body contains a "name" field such as "EPSG:27700 - British National Grid"
    And the response body contains "eastings", "northings", and "orthogonalHeight" values representing the map conversion origin
    And the response body contains "xAxisAbscissa" and "xAxisOrdinate" representing the true north rotation
