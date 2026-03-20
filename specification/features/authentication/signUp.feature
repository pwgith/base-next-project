@F-002 @UC-USR-003
Feature: Sign up
  As a user
  I want to create an account with my email address and a password
  So that I can access the application and save my work

  # ───────────────────────────────────────────────
  # Main Flow — Happy Path
  # ───────────────────────────────────────────────

  @S-023 @UC-USR-003
  Scenario: Successful registration creates an account and sends a verification email
    Given the user is on the sign-up page
    When the user enters the email "alice@example.com", the password "Secure!99", and confirms "Secure!99"
    And the user submits the registration form
    Then a new account is created for "alice@example.com"
    And a verification email is sent to "alice@example.com"
    And the user is shown a message to check their email to verify their account

  # ───────────────────────────────────────────────
  # Alternative Flows
  # ───────────────────────────────────────────────

  @S-024 @UC-USR-003
  Scenario: Clicking the verification link verifies the account
    Given a verification email has been sent to "alice@example.com"
    When the user clicks the verification link in the email
    Then the account for "alice@example.com" is marked as verified
    And the user is redirected to the sign-in page with a success message

  # ───────────────────────────────────────────────
  # Exception Flows
  # ───────────────────────────────────────────────

  @S-025 @UC-USR-003
  Scenario: Email already registered shows an error
    Given an account already exists for "alice@example.com"
    When the user attempts to register with the email "alice@example.com", the password "Secure!99", and confirms "Secure!99"
    Then the error "An account with this email already exists" is displayed
    And no new account is created

  @S-026 @UC-USR-003
  Scenario: Passwords that do not match show an inline error
    Given the user is on the sign-up page
    When the user enters the email "bob@example.com", the password "Secure!99", and the confirmation "Different!88"
    And the user submits the registration form
    Then the error "Passwords do not match" is displayed on the confirm password field

  @S-027 @UC-USR-003
  Scenario Outline: Password that does not meet requirements shows an inline error
    Given the user is on the sign-up page
    When the user enters the email "bob@example.com", the password "<password>", and confirms "<password>"
    And the user submits the registration form
    Then a password strength error is displayed

    Examples:
      | password       |
      | short1!        |
      | alllower99!    |
      | ALLUPPER99!    |
      | NoSpecialChar1 |

  @S-028 @UC-USR-003
  Scenario: Invalid email format shows an inline error
    Given the user is on the sign-up page
    When the user enters the email "not-an-email", the password "Secure!99", and confirms "Secure!99"
    And the user submits the registration form
    Then the error "Please enter a valid email address" is displayed on the email field

  # ───────────────────────────────────────────────
  # Business Rules
  # ───────────────────────────────────────────────

  @S-029 @UC-USR-003
  Scenario: Unverified user cannot sign in and is prompted to verify their email
    Given a user has registered with "alice@example.com" but has not yet verified their email
    When the user attempts to sign in with "alice@example.com" and "Secure!99"
    Then the error "Please verify your email address before signing in" is displayed
    And a link to resend the verification email is shown
