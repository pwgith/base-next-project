@F-030 @UC-USR-018
Feature: IFC viewer — inspect element properties
  As a user
  I want to click on an element in the 3D viewer and see its IFC properties
  So that I can understand what each part of the building model represents

  Background:
    Given the user is signed in as "alice@example.com"
    And the user has a project named "Office Building" with at least one IFC element
    And the IFC model for "Office Building" is rendered in the viewport

  # ───────────────────────────────────────────────
  # Main Flow — Happy Path
  # ───────────────────────────────────────────────

  @S-221 @UC-USR-018
  Scenario: Hovering over an element highlights it to indicate it is selectable
    When the user moves the cursor over a wall element in the viewport
    Then that wall element is visually highlighted

  @S-222 @UC-USR-018
  Scenario: Clicking an element highlights it and displays its IFC properties in the panel
    Given the IFC model contains a wall with GlobalId "0pQnDVWH58nOs0Y3vMLU_A", type "IfcWall", name "W-01", and a property set "Pset_WallCommon" with "IsExternal" set to "true"
    When the user clicks on that wall element in the viewport
    Then the wall element is visually highlighted in the viewport
    And the properties panel shows the element's IFC type as "IfcWall"
    And the properties panel shows the element's name as "W-01"
    And the properties panel shows the element's GlobalId as "0pQnDVWH58nOs0Y3vMLU_A"
    And the properties panel shows the property set "Pset_WallCommon" containing "IsExternal: true"

  # ───────────────────────────────────────────────
  # Alternative Flows
  # ───────────────────────────────────────────────

  @S-223 @UC-USR-018
  Scenario: Clicking on empty space deselects the current element and clears the properties panel
    Given the user has selected a wall element and its properties are shown in the panel
    When the user clicks on an empty area of the viewport with no geometry
    Then no element is highlighted
    And the properties panel is empty

  @S-224 @UC-USR-018
  Scenario: Clicking a different element replaces the current selection
    Given the user has selected a wall element with name "W-01"
    And the IFC model also contains a slab element with name "S-01"
    When the user clicks on the slab element in the viewport
    Then the slab element is visually highlighted
    And the wall is no longer highlighted
    And the properties panel shows the element's name as "S-01"
    And the properties panel shows the element's IFC type as "IfcSlab"

  @S-225 @UC-USR-018
  Scenario: Clicking an element with no property sets shows only base attributes
    Given the IFC model contains a beam element with GlobalId "1xS3BCk291UvhgP2a6eflL" that has no associated property sets
    When the user clicks on that beam element in the viewport
    Then the beam element is visually highlighted
    And the properties panel shows the element's IFC type
    And the properties panel shows the element's GlobalId as "1xS3BCk291UvhgP2a6eflL"
    And the properties panel displays the message "No property sets are attached to this element"

  @S-226 @UC-USR-018
  Scenario: The user can copy an element's GlobalId to the clipboard from the properties panel
    Given the user has selected a wall element with GlobalId "0pQnDVWH58nOs0Y3vMLU_A"
    When the user activates the copy control next to the GlobalId in the properties panel
    Then the text "0pQnDVWH58nOs0Y3vMLU_A" is copied to the clipboard

  # ───────────────────────────────────────────────
  # Exception Flows
  # ───────────────────────────────────────────────

  @S-227 @UC-USR-018
  Scenario: An error is shown in the properties panel when element properties cannot be retrieved
    Given an IFC element in the viewport has geometry that can be picked but whose property data cannot be parsed
    When the user clicks on that element
    Then the element remains visually highlighted in the viewport
    And the properties panel displays an error message indicating the properties could not be loaded

  @S-228 @UC-USR-018
  Scenario: Clicking in the viewport where there is no geometry does not change the existing selection
    Given the user has selected a wall element with name "W-01"
    When the user clicks on a point in the viewport that does not intersect any geometry
    Then the wall element remains highlighted
    And the properties panel still shows the wall's properties
