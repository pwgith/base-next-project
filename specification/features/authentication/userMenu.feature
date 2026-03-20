@F-009 @UC-USR-010
Feature: User account menu
  As a signed-in user
  I want to open the account menu in the navigation bar
  So that I can access my profile, change my password, or sign out

  Background:
    Given the user is signed in as "alice@example.com"

  # ───────────────────────────────────────────────
  # Main Flow — Desktop dropdown
  # ───────────────────────────────────────────────

  @S-061 @UC-USR-010
  Scenario: Opening the account menu on desktop shows identity and account actions
    Given the user is on a desktop viewport
    When the user opens the account menu
    Then the menu displays the identity header "alice@example.com"
    And the menu contains the "Profile" action
    And the menu contains the "Change Password" action
    And the menu contains the "Sign Out" action

  @S-062 @UC-USR-010
  Scenario: Selecting Profile from the account menu navigates to the profile page
    Given the user is on a desktop viewport
    And the user has opened the account menu
    When the user selects "Profile"
    Then the user is navigated to the profile page
    And the account menu is closed

  @S-066 @UC-USR-010
  Scenario: Selecting Change Password from the account menu navigates to the change password page
    Given the user is on a desktop viewport
    And the user has opened the account menu
    When the user selects "Change Password"
    Then the user is navigated to the change password page
    And the account menu is closed

  @S-067 @UC-USR-010
  Scenario: Selecting Sign Out from the account menu ends the session
    Given the user is on a desktop viewport
    And the user has opened the account menu
    When the user selects "Sign Out"
    Then the user's session is invalidated
    And the user is redirected to the sign-in page

  # ───────────────────────────────────────────────
  # Alternative Flow — Mobile hamburger menu
  # ───────────────────────────────────────────────

  @S-063 @UC-USR-010
  Scenario: Opening the hamburger menu on mobile shows primary nav and account actions
    Given the user is on a mobile viewport
    When the user taps the hamburger icon
    Then the slide-down panel is visible
    And the panel displays the identity header "alice@example.com"
    And the panel contains the "Home" navigation link
    And the panel contains the "Plans" navigation link
    And the panel contains the "Profile" action
    And the panel contains the "Change Password" action
    And the panel contains the "Sign Out" action

  # ───────────────────────────────────────────────
  # Alternative Flow — Dismiss without acting
  # ───────────────────────────────────────────────

  @S-064 @UC-USR-010
  Scenario: Clicking outside the open desktop menu closes it without navigating
    Given the user is on a desktop viewport
    And the user has opened the account menu
    When the user clicks outside the account menu
    Then the account menu is closed
    And the user remains on the current page

  @S-065 @UC-USR-010
  Scenario: Pressing Escape closes the open menu without navigating
    Given the user is on a desktop viewport
    And the user has opened the account menu
    When the user presses the Escape key
    Then the account menu is closed
    And the user remains on the current page
