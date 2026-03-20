@F-004 @UC-USR-005
Feature: Logout
  As a user
  I want to sign out of the application
  So that my account is no longer accessible from this device

  Background:
    Given the user is signed in as "alice@example.com"

  # ───────────────────────────────────────────────
  # Main Flow — Happy Path
  # ───────────────────────────────────────────────

  @S-036 @UC-USR-005
  Scenario: Signing out ends the session and redirects to the sign-in page
    When the user signs out
    Then the user's session is invalidated
    And the user is redirected to the sign-in page
    And a confirmation message is shown that the user has been signed out

  # ───────────────────────────────────────────────
  # Business Rules
  # ───────────────────────────────────────────────

  @S-037 @UC-USR-005
  Scenario: Accessing a protected page after signing out redirects to sign-in
    Given the user has signed out
    When the user attempts to access "/plans"
    Then the user is redirected to the sign-in page

  # ───────────────────────────────────────────────
  # Exception Flows
  # ───────────────────────────────────────────────

  @S-038 @UC-USR-005
  Scenario: Signing out when the session has already expired still clears local auth data
    Given the user's session has already expired
    When the user signs out
    Then any locally stored authentication data is cleared
    And the user is redirected to the sign-in page
