@F-039 @UC-USR-017
Feature: IFC render verification — complex model renders without errors
  As a user
  I want the generated IFC STEP file to render correctly in the 3D viewer
  So that I can visually inspect complex building models without encountering errors

  # ───────────────────────────────────────────────
  # Render Smoke Tests
  # ───────────────────────────────────────────────

  @S-270 @UC-USR-017
  Scenario: A project with walls, door, window, slab, and roof renders without errors
    Given the user is signed in as "alice@example.com"
    And the user has a project named "Render Test House" with a complete house model
    When the user navigates to the workspace page for "Render Test House"
    Then the 3D model is rendered in the viewport
    And no error overlay is visible in the viewer

  @S-271 @UC-USR-017
  Scenario: A project with multiple storeys and varied element types renders without errors
    Given the user is signed in as "alice@example.com"
    And the user has a project named "Multi-Storey Building" with multiple storeys and varied elements
    When the user navigates to the workspace page for "Multi-Storey Building"
    Then the 3D model is rendered in the viewport
    And no error overlay is visible in the viewer
