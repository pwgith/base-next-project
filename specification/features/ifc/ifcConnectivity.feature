@F-034 @UC-USR-022
Feature: IFC element connectivity
  As a user
  I want to define and query logical connections between IFC elements via the REST API
  So that I can model how MEP components connect (pipes, ducts, cables) and traverse the distribution network programmatically

  Background:
    Given the user holds a valid OAuth token with scope "ifc:read ifc:write ifc:delete"
    And the user has an IFC file with ID "file-001"
    And the file contains a pipe segment with globalId "7pQrStUvWxYz1A2B3C4D5E" named "CW-Pipe-001"
    And the file contains a pipe segment with globalId "8qRsTuVwXyZa2B3C4D5E6F" named "CW-Pipe-002"

  # ───────────────────────────────────────────────
  # Ports
  # ───────────────────────────────────────────────

  @S-242 @UC-USR-022
  Scenario: Create a distribution port on an element
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements/7pQrStUvWxYz1A2B3C4D5E/ports" with body:
      """
      {
        "name": "CW-Pipe-001-Outlet",
        "flowDirection": "SOURCE",
        "systemType": "DOMESTICCOLDWATER"
      }
      """
    Then the response status is 201
    And the response body contains "ifcType": "IfcDistributionPort"
    And the response body contains "name": "CW-Pipe-001-Outlet"
    And the response body contains "flowDirection": "SOURCE"
    And the response body contains a "portId" field

  @S-243 @UC-USR-022
  Scenario: List ports on an element
    Given the pipe "7pQrStUvWxYz1A2B3C4D5E" has ports "CW-Pipe-001-Inlet" (portId "port-001", flowDirection "SINK") and "CW-Pipe-001-Outlet" (portId "port-002", flowDirection "SOURCE")
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/7pQrStUvWxYz1A2B3C4D5E/ports"
    Then the response status is 200
    And the response body contains a "ports" array with 2 items
    And the array contains an entry with "name": "CW-Pipe-001-Inlet" and "flowDirection": "SINK"
    And the array contains an entry with "name": "CW-Pipe-001-Outlet" and "flowDirection": "SOURCE"

  # ───────────────────────────────────────────────
  # Connections
  # ───────────────────────────────────────────────

  @S-244 @UC-USR-022
  Scenario: Connect two pipe segments via their ports
    Given the pipe "7pQrStUvWxYz1A2B3C4D5E" has a port with portId "port-002" (flowDirection "SOURCE")
    And the pipe "8qRsTuVwXyZa2B3C4D5E6F" has a port with portId "port-003" (flowDirection "SINK")
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements/7pQrStUvWxYz1A2B3C4D5E/connections" with body:
      """
      {
        "connectedElementGlobalId": "8qRsTuVwXyZa2B3C4D5E6F",
        "sourcePortId": "port-002",
        "targetPortId": "port-003"
      }
      """
    Then the response status is 201
    And the response body contains a "connectionId" field
    And the response body contains "relatingElement" with "globalId": "7pQrStUvWxYz1A2B3C4D5E"
    And the response body contains "relatedElement" with "globalId": "8qRsTuVwXyZa2B3C4D5E6F"

  @S-245 @UC-USR-022
  Scenario: Connect a duct segment to an air terminal
    Given the file contains a duct segment with globalId "9rStUvWxYzAb3C4D5E6F7G" named "SA-Duct-001"
    And the file contains an air terminal with globalId "0sTuVwXyZaBc4D5E6F7G8H" named "Diffuser-GF-01"
    And the duct has a port with portId "port-004" (flowDirection "SOURCE")
    And the terminal has a port with portId "port-005" (flowDirection "SINK")
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements/9rStUvWxYzAb3C4D5E6F7G/connections" with body:
      """
      {
        "connectedElementGlobalId": "0sTuVwXyZaBc4D5E6F7G8H",
        "sourcePortId": "port-004",
        "targetPortId": "port-005"
      }
      """
    Then the response status is 201
    And the response body contains "relatedElement" with "name": "Diffuser-GF-01"

  @S-246 @UC-USR-022
  Scenario: List all connections for an element
    Given the pipe "7pQrStUvWxYz1A2B3C4D5E" is connected to "CW-Pipe-002" (connectionId "conn-001") and "CW-Valve-001" (connectionId "conn-002")
    When a GET request is sent to "/api/v1/ifc/files/file-001/elements/7pQrStUvWxYz1A2B3C4D5E/connections"
    Then the response status is 200
    And the response body contains a "connections" array with 2 items
    And the array contains an entry with "connectionId": "conn-001"
    And the array contains an entry with "connectionId": "conn-002"

  # ───────────────────────────────────────────────
  # Remove Connection
  # ───────────────────────────────────────────────

  @S-247 @UC-USR-022
  Scenario: Remove a connection between elements
    Given the pipe "7pQrStUvWxYz1A2B3C4D5E" has a connection with connectionId "conn-001" to "8qRsTuVwXyZa2B3C4D5E6F"
    When a DELETE request is sent to "/api/v1/ifc/files/file-001/elements/7pQrStUvWxYz1A2B3C4D5E/connections/conn-001"
    Then the response status is 204
    And a subsequent GET to "/api/v1/ifc/files/file-001/elements/7pQrStUvWxYz1A2B3C4D5E/connections" does not include connection "conn-001"

  # ───────────────────────────────────────────────
  # Error Handling
  # ───────────────────────────────────────────────

  @S-248 @UC-USR-022
  Scenario: Reject connection when target element does not exist
    When a POST request is sent to "/api/v1/ifc/files/file-001/elements/7pQrStUvWxYz1A2B3C4D5E/connections" with body:
      """
      {
        "connectedElementGlobalId": "NONEXISTENT_GLOBALID_22"
      }
      """
    Then the response status is 404
    And the response body contains an error with message containing "element not found"
