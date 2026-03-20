@F-025 @UC-USR-015
Feature: IFC model export
  As a user
  I want to export an IFC model (or a subset of it) in a range of industry-standard formats via the REST API
  So that I can exchange BIM data with other software tools and stakeholders programmatically

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read"
    And the user has an IFC file with ID "file-001"

  # ───────────────────────────────────────────────
  # Full Model Exports
  # ───────────────────────────────────────────────

  @S-176 @UC-USR-015
  Scenario: Export the full IFC model as an IFC STEP file
    When a GET request is sent to "/api/v1/ifc/files/file-001/export?format=ifc"
    Then the response status is 200
    And the response Content-Type is "application/x-step"
    And the response Content-Disposition header includes filename "file-001.ifc"
    And the response body starts with "ISO-10303-21;"

  @S-177 @UC-USR-015
  Scenario: Export the full IFC model as IFC-JSON
    When a GET request is sent to "/api/v1/ifc/files/file-001/export?format=json"
    Then the response status is 200
    And the response Content-Type is "application/json"
    And the response Content-Disposition header includes filename "file-001.ifcjson"
    And the response body contains a "type" field with value "ifcJSON"
    And the response body contains a "version" field
    And the response body contains a "data" array of IFC entities

  @S-178 @UC-USR-015
  Scenario: Export the full IFC model as ifcXML
    When a GET request is sent to "/api/v1/ifc/files/file-001/export?format=xml"
    Then the response status is 200
    And the response Content-Type is "application/xml"
    And the response Content-Disposition header includes filename "file-001.ifcxml"
    And the response body begins with an XML declaration and a root element "ex:iso_10303_28"

  @S-179 @UC-USR-015
  Scenario: Export COBie data as a CSV package
    When a GET request is sent to "/api/v1/ifc/files/file-001/export?format=cobie"
    Then the response status is 200
    And the response Content-Type is "application/zip"
    And the response Content-Disposition header includes filename "file-001-cobie.zip"
    And the ZIP archive contains CSV files including "Contact.csv", "Facility.csv", "Floor.csv", "Space.csv", "Component.csv"

  # ───────────────────────────────────────────────
  # Partial / Selective Export
  # ───────────────────────────────────────────────

  @S-180 @UC-USR-015
  Scenario: Export a subset of elements selected by GlobalId list
    When a POST request is sent to "/api/v1/ifc/files/file-001/export?format=ifc" with body:
      """
      {
        "globalIds": [
          "0VkXyZ2aB3c4D5e6F7gH8i",
          "1aB2cD3eF4gH5iJ6kL7mN8",
          "2YByTx5Kv4wO3rJpL8uN1z"
        ]
      }
      """
    Then the response status is 200
    And the response Content-Type is "application/x-step"
    And the exported IFC file contains exactly the 3 specified elements plus any required referencing entities

  # ───────────────────────────────────────────────
  # Exception Flows
  # ───────────────────────────────────────────────

  @S-181 @UC-USR-015
  Scenario: Requesting an unsupported export format returns 400
    When a GET request is sent to "/api/v1/ifc/files/file-001/export?format=dwg"
    Then the response status is 400
    And the response body contains the error "Unsupported export format 'dwg'; supported formats are: ifc, json, xml, cobie"
