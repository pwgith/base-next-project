@F-003 @UC-USR-004
Feature: Login
  As a user
  I want to sign in to the application with my email address and password
  So that I can access my account and use the application's features

  Background:
    Given a verified account exists for "alice@example.com" with password "Secure!99"

  # ───────────────────────────────────────────────
  # Main Flow — Happy Path
  # ───────────────────────────────────────────────

  @S-030 @UC-USR-004
  Scenario: Successful sign-in redirects to the main page
    Given the user is on the sign-in page
    When the user signs in with "alice@example.com" and "Secure!99"
    Then the user is redirected to the main page
    And the user has an active authenticated session

  # ───────────────────────────────────────────────
  # Alternative Flows
  # ───────────────────────────────────────────────

  @S-031 @UC-USR-004
  Scenario: Successful sign-in redirects to the originally requested protected page
    Given the user attempted to access "/plans" without being signed in
    When the user signs in with "alice@example.com" and "Secure!99"
    Then the user is redirected to "/plans"

  # ───────────────────────────────────────────────
  # Exception Flows
  # ───────────────────────────────────────────────

  @S-032 @UC-USR-004
  Scenario: Incorrect password shows a generic error that does not reveal which field is wrong
    Given the user is on the sign-in page
    When the user attempts to sign in with "alice@example.com" and "WrongPassword1!"
    Then the error "The email address or password is incorrect" is displayed
    And the user is not signed in

  @S-033 @UC-USR-004
  Scenario: Unregistered email shows the same generic error as an incorrect password
    Given the user is on the sign-in page
    When the user attempts to sign in with "unknown@example.com" and "Secure!99"
    Then the error "The email address or password is incorrect" is displayed
    And the user is not signed in

  @S-034 @UC-USR-004
  Scenario: Account not yet verified shows a verification reminder
    Given a user has registered with "unverified@example.com" but has not yet verified their email
    When the user attempts to sign in with "unverified@example.com" and "Secure!99"
    Then the error "Please verify your email address before signing in" is displayed
    And a link to resend the verification email is shown

  @S-035 @UC-USR-004
  Scenario: Locked account shows a lockout message
    Given the account for "alice@example.com" is locked due to too many failed sign-in attempts
    When the user attempts to sign in with "alice@example.com" and "Secure!99"
    Then the error "Your account has been temporarily locked. Please try again later or reset your password." is displayed
    And the user is not signed in
