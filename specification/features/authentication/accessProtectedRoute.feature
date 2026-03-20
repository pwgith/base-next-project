@F-008 @UC-USR-009
Feature: Access protected route without session
  As an unauthenticated user
  I want to be redirected to the sign-in page when I navigate to a protected route
  So that I can authenticate and then continue to my originally requested destination

  # ───────────────────────────────────────────────
  # Main Flow — Happy Path
  # ───────────────────────────────────────────────

  @S-060 @UC-USR-009
  Scenario: Unauthenticated user navigating to a protected page is redirected to the login page
    Given the user has no active session
    When the user navigates to "/plans"
    Then the user is redirected to the sign-in page
    And the sign-in page preserves "/plans" as the return destination
