@F-019 @UC-USR-015
Feature: IFC property set and quantity management
  As a user
  I want to read and modify property sets and quantity sets on IFC elements via the REST API
  So that I can attach and maintain structured non-geometric data on BIM elements programmatically

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write ifc:delete"
    And the user has an IFC file with ID "file-001"
    And the file contains a wall with globalId "0VkXyZ2aB3c4D5e6F7gH8i" named "EW-North External Wall"

  # ───────────────────────────────────────────────
  # Read Property Sets
  # ───────────────────────────────────────────────

  @S-134 @UC-USR-015
  Scenario: Get all property sets attached to an element
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has property sets "Pset_WallCommon" and "Pset_ManufacturerTypeInformation"
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets"
    Then the response status is 200
    And the response body contains a "propertySets" array with 2 items
    And the array contains an entry with "name": "Pset_WallCommon"
    And the array contains an entry with "name": "Pset_ManufacturerTypeInformation"

  @S-135 @UC-USR-015
  Scenario: Get a specific property set by name
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has property set "Pset_WallCommon" containing "IsExternal": true and "ThermalTransmittance": 0.18
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets/Pset_WallCommon"
    Then the response status is 200
    And the response body contains "name": "Pset_WallCommon"
    And the response body contains a "properties" array
    And the properties include "IsExternal" with value true
    And the properties include "ThermalTransmittance" with value 0.18

  # ───────────────────────────────────────────────
  # Create and Update Property Sets
  # ───────────────────────────────────────────────

  @S-136 @UC-USR-015
  Scenario: Create a new property set on an element
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets" with body:
      """
      {
        "name": "Pset_WallCommon",
        "properties": [
          { "name": "IsExternal", "type": "IfcBoolean", "value": true },
          { "name": "ThermalTransmittance", "type": "IfcThermalTransmittanceMeasure", "value": 0.18 },
          { "name": "FireRating", "type": "IfcLabel", "value": "60" }
        ]
      }
      """
    Then the response status is 201
    And the response body contains "name": "Pset_WallCommon"
    And the response body "properties" array contains 3 items

  @S-137 @UC-USR-015
  Scenario: Add a single property to an existing property set
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has property set "Pset_WallCommon" with 2 existing properties
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets/Pset_WallCommon/properties" with body:
      """
      { "name": "AcousticRating", "type": "IfcLabel", "value": "Rw 45dB" }
      """
    Then the response status is 201
    And the response body contains "name": "AcousticRating"
    And the response body contains "value": "Rw 45dB"

  @S-138 @UC-USR-015
  Scenario: Update the value of an existing property
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has property "ThermalTransmittance" with value 0.18 in "Pset_WallCommon"
    When a PATCH request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets/Pset_WallCommon/properties/ThermalTransmittance" with body:
      """
      { "value": 0.21 }
      """
    Then the response status is 200
    And the response body contains "name": "ThermalTransmittance"
    And the response body contains "value": 0.21

  # ───────────────────────────────────────────────
  # Delete
  # ───────────────────────────────────────────────

  @S-139 @UC-USR-015
  Scenario: Delete a single property from a property set
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has property set "Pset_WallCommon" containing property "AcousticRating"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets/Pset_WallCommon/properties/AcousticRating"
    Then the response status is 204
    And a subsequent GET to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets/Pset_WallCommon" no longer lists "AcousticRating"

  @S-140 @UC-USR-015
  Scenario: Delete an entire property set from an element
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has property set "Pset_ManufacturerTypeInformation"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets/Pset_ManufacturerTypeInformation"
    Then the response status is 204
    And a subsequent GET to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets" no longer lists "Pset_ManufacturerTypeInformation"

  # ───────────────────────────────────────────────
  # Quantity Sets (IfcElementQuantity)
  # ───────────────────────────────────────────────

  @S-141 @UC-USR-015
  Scenario: Get the quantity set for an element
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has quantity set "Qto_WallBaseQuantities" with "NetArea": 14.4 and "Volume": 2.88
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/quantity-sets/Qto_WallBaseQuantities"
    Then the response status is 200
    And the response body contains "name": "Qto_WallBaseQuantities"
    And the response body "quantities" array contains an entry with "name": "NetArea" and "value": 14.4
    And the response body "quantities" array contains an entry with "name": "Volume" and "value": 2.88
