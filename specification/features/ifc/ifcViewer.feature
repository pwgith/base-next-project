@F-029 @UC-USR-017
Feature: IFC viewer — load and render model in browser
  As a user
  I want to open a project workspace and see the IFC model rendered in 3D in the browser
  So that I can visually explore the building model

  Background:
    Given the user is signed in as "alice@example.com"
    And the user has a project named "Office Building" with at least one IFC element

  # ───────────────────────────────────────────────
  # Main Flow — Happy Path
  # ───────────────────────────────────────────────

  @S-211 @UC-USR-017
  Scenario: Navigating to a project workspace fetches and renders the IFC model
    When the user navigates to the workspace page for "Office Building"
    Then the IFC model is fetched from the server
    And the 3D model is rendered in the viewport
    And no loading indicator is visible

  @S-212 @UC-USR-017
  Scenario: A loading indicator is shown while the IFC file is being fetched and converted
    When the user navigates to the workspace page for "Office Building"
    Then a loading indicator is visible while the IFC file is being loaded
    And the loading indicator disappears once the model is rendered in the viewport

  # ───────────────────────────────────────────────
  # Alternative Flows
  # ───────────────────────────────────────────────

  @S-213 @UC-USR-017
  Scenario: Orbiting the camera rotates the view around the model
    Given the IFC model is rendered in the viewport
    When the user clicks and drags within the viewport
    Then the camera rotates around the model's pivot point in response to the drag

  @S-214 @UC-USR-017
  Scenario: Panning the camera moves the view laterally
    Given the IFC model is rendered in the viewport
    When the user right-click drags within the viewport
    Then the camera moves laterally in the direction of the drag

  @S-215 @UC-USR-017
  Scenario: Scrolling the mouse wheel zooms the camera in and out
    Given the IFC model is rendered in the viewport
    When the user scrolls the mouse wheel forward within the viewport
    Then the camera moves closer to the model
    When the user scrolls the mouse wheel backward within the viewport
    Then the camera moves further from the model

  @S-216 @UC-USR-017
  Scenario: Resetting the camera fits the entire model within the viewport
    Given the IFC model is rendered in the viewport
    And the user has orbited the camera to a non-default position
    When the user activates the reset-camera control in the viewer toolbar
    Then the camera position and orientation reset to fit the entire model within the viewport

  @S-217 @UC-USR-017
  Scenario: Reloading the viewer fetches the latest IFC version while preserving camera position
    Given the IFC model is rendered in the viewport
    And the user has orbited the camera to a non-default position
    And the IFC model has been updated via the API since the initial load
    When the user activates the reload control in the viewer toolbar
    Then the latest version of the IFC model is fetched from the server
    And the updated model is rendered in the viewport
    And the camera position is unchanged from before the reload

  # ───────────────────────────────────────────────
  # Exception Flows
  # ───────────────────────────────────────────────

  @S-218 @UC-USR-017
  Scenario: An error is shown when the IFC file cannot be fetched from the server
    Given the IFC model server returns a 404 error for "Office Building"
    When the user navigates to the workspace page for "Office Building"
    Then no 3D model is rendered
    And an error message is displayed explaining that the model could not be loaded
    And a retry option is visible

  @S-219 @UC-USR-017
  Scenario: An error is shown when the IFC file is downloaded but cannot be converted to Fragments
    Given the IFC file for "Office Building" is malformed and cannot be parsed by the renderer
    When the user navigates to the workspace page for "Office Building"
    Then no 3D model is rendered
    And an error message is displayed explaining that the model could not be processed
    And a link to the project details page is visible

  @S-220 @UC-USR-017
  Scenario: An informational message is shown when the model contains no visible geometry
    Given the user has a project named "Empty Project" containing only a root IfcProject entity with no geometry
    When the user navigates to the workspace page for "Empty Project"
    Then an empty scene is rendered in the viewport
    And an informational message is displayed indicating that the model has no visible geometry yet
    And the viewport camera controls remain interactive
