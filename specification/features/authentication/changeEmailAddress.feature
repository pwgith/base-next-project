@F-007 @UC-USR-008
Feature: Change email address
  As a user
  I want to change the email address associated with my account
  So that my account remains accessible at my current, valid email address

  Background:
    Given the user is signed in as "alice@example.com" with password "Secure!99"

  # ───────────────────────────────────────────────
  # Main Flow — Happy Path
  # ───────────────────────────────────────────────

  @S-053 @UC-USR-008
  Scenario: Requesting an email address change sends a verification email to the new address
    Given the user is on the change email address page
    When the user enters the new email "alice-new@example.com", confirms "alice-new@example.com", and provides their password "Secure!99"
    And the user submits the email change form
    Then a verification email is sent to "alice-new@example.com"
    And the account email address remains "alice@example.com"
    And the user is shown a message that the change will take effect once the link is clicked

  @S-054 @UC-USR-008
  Scenario: Clicking the verification link updates the account email address
    Given a pending email change exists from "alice@example.com" to "alice-new@example.com"
    When the user clicks the verification link sent to "alice-new@example.com"
    Then the account email address is updated to "alice-new@example.com"
    And a notification email is sent to "alice@example.com" advising that the email address was changed
    And the user is shown a success message confirming the email address has been updated

  # ───────────────────────────────────────────────
  # Exception Flows
  # ───────────────────────────────────────────────

  @S-055 @UC-USR-008
  Scenario: Incorrect password shows an inline error
    Given the user is on the change email address page
    When the user enters the new email "alice-new@example.com", confirms "alice-new@example.com", and provides the wrong password "WrongPass!00"
    And the user submits the email change form
    Then the error "Password is incorrect" is displayed
    And no verification email is sent

  @S-056 @UC-USR-008
  Scenario: New email addresses that do not match show an inline error
    Given the user is on the change email address page
    When the user enters the new email "alice-new@example.com", confirms "alice-other@example.com", and provides their password "Secure!99"
    And the user submits the email change form
    Then the error "Email addresses do not match" is displayed on the confirm email field

  @S-057 @UC-USR-008
  Scenario: New email address already registered to another account shows an inline error
    Given an account already exists for "taken@example.com"
    And the user is on the change email address page
    When the user enters the new email "taken@example.com", confirms "taken@example.com", and provides their password "Secure!99"
    And the user submits the email change form
    Then the error "This email address is already in use" is displayed

  @S-058 @UC-USR-008
  Scenario: New email address same as current shows an inline error
    Given the user is on the change email address page
    When the user enters the new email "alice@example.com", confirms "alice@example.com", and provides their password "Secure!99"
    And the user submits the email change form
    Then the error "New email address must be different from your current email address" is displayed

  @S-059 @UC-USR-008
  Scenario: Expired email change verification link shows an error with an option to restart
    Given a pending email change exists from "alice@example.com" to "alice-new@example.com"
    And the verification link has expired
    When the user follows the expired verification link
    Then the error "This verification link has expired" is displayed
    And the user is offered an option to restart the email change process
    And the account email address remains "alice@example.com"
