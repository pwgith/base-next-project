@F-032 @UC-USR-020
Feature: IFC property set validation
  As a user
  I want to validate property sets on IFC elements against standard or custom schemas via the REST API
  So that I can ensure BIM data quality and compliance with industry standards

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read"
    And the user has an IFC file with ID "file-001"
    And the file contains a wall with globalId "0VkXyZ2aB3c4D5e6F7gH8i"

  # ───────────────────────────────────────────────
  # Standard Pset Validation
  # ───────────────────────────────────────────────

  @S-228 @UC-USR-020
  Scenario: Validate a property set that conforms to its standard definition
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has property set "Pset_WallCommon" with properties:
      | name                   | type                             | value |
      | IsExternal             | IfcBoolean                       | true  |
      | ThermalTransmittance   | IfcThermalTransmittanceMeasure   | 0.18  |
      | FireRating             | IfcLabel                         | 60    |
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets/Pset_WallCommon/validate"
    Then the response status is 200
    And the response body contains "valid": true
    And the response body "errors" array contains 0 items

  @S-229 @UC-USR-020
  Scenario: Validation rejects a property with wrong data type
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has property set "Pset_WallCommon" with properties:
      | name                   | type      | value  |
      | IsExternal             | IfcLabel  | true   |
      | ThermalTransmittance   | IfcLabel  | high   |
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets/Pset_WallCommon/validate"
    Then the response status is 200
    And the response body contains "valid": false
    And the response body "errors" array contains an entry with "property": "IsExternal" and "issue": "type mismatch"
    And the response body "errors" array contains an entry with "property": "ThermalTransmittance" and "issue": "type mismatch"

  @S-230 @UC-USR-020
  Scenario: Validation warns about missing properties defined in the standard Pset
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has property set "Pset_WallCommon" with properties:
      | name       | type       | value |
      | IsExternal | IfcBoolean | true  |
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets/Pset_WallCommon/validate"
    Then the response status is 200
    And the response body "warnings" array contains an entry with "issue": "missing property" and "property": "ThermalTransmittance"

  # ───────────────────────────────────────────────
  # Custom Template Validation
  # ───────────────────────────────────────────────

  @S-231 @UC-USR-020
  Scenario: Validate a property set against a custom template
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has property set "Custom_ProjectData" with properties:
      | name         | type      | value       |
      | CostCode     | IfcLabel  | CC-4420     |
      | Contractor   | IfcLabel  | Acme Build  |
      | InstallDate  | IfcDate   | 2026-01-15  |
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets/Custom_ProjectData/validate" with body:
      """
      {
        "template": {
          "properties": [
            { "name": "CostCode", "type": "IfcLabel", "required": true },
            { "name": "Contractor", "type": "IfcLabel", "required": true },
            { "name": "InstallDate", "type": "IfcDate", "required": false },
            { "name": "SignOffBy", "type": "IfcLabel", "required": true }
          ]
        }
      }
      """
    Then the response status is 200
    And the response body contains "valid": false
    And the response body "errors" array contains an entry with "property": "SignOffBy" and "issue": "missing required property"

  # ───────────────────────────────────────────────
  # Validate All Property Sets on an Element
  # ───────────────────────────────────────────────

  @S-232 @UC-USR-020
  Scenario: Validate all property sets on an element against their standard definitions
    Given the wall "0VkXyZ2aB3c4D5e6F7gH8i" has property sets "Pset_WallCommon" and "Pset_ManufacturerTypeInformation"
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements/0VkXyZ2aB3c4D5e6F7gH8i/property-sets/validate"
    Then the response status is 200
    And the response body contains a "results" array with 2 items
    And each result contains "psetName", "valid", "errors", and "warnings" fields

  # ───────────────────────────────────────────────
  # List Available Standard Schemas
  # ───────────────────────────────────────────────

  @S-233 @UC-USR-020
  Scenario: List available standard property set schemas
    When a GET request is sent to "/api/v1/ifc/property-set-schemas"
    Then the response status is 200
    And the response body contains a "schemas" array
    And the array contains an entry with "name": "Pset_WallCommon"
    And the array contains an entry with "name": "Pset_SlabCommon"
    And each schema entry contains a "properties" array with expected property names and types
