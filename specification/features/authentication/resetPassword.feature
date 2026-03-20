@F-006 @UC-USR-007
Feature: Reset password
  As a user
  I want to reset my account password via a link sent to my email address
  So that I can regain access to my account if I have forgotten my password

  # ───────────────────────────────────────────────
  # Main Flow — Happy Path
  # ───────────────────────────────────────────────

  @S-045 @UC-USR-007
  Scenario: Requesting a password reset for a registered email sends a reset link
    Given an account exists for "alice@example.com"
    When the user requests a password reset for "alice@example.com"
    Then a password reset email is sent to "alice@example.com"
    And the user is shown "If an account exists for that email address, a reset link has been sent"

  @S-046 @UC-USR-007
  Scenario: Using a valid reset link allows the user to set a new password
    Given "alice@example.com" has a valid, unused password reset link
    When the user follows the reset link and enters the new password "NewPass!88" and confirms "NewPass!88"
    And the user submits the new password
    Then the password for "alice@example.com" is updated to "NewPass!88"
    And the reset token is invalidated and cannot be used again
    And the user is shown a success message prompting them to sign in with their new password

  # ───────────────────────────────────────────────
  # Business Rules
  # ───────────────────────────────────────────────

  @S-047 @UC-USR-007
  Scenario: Requesting a reset for an unregistered email shows the same neutral message
    Given no account exists for "unknown@example.com"
    When the user requests a password reset for "unknown@example.com"
    Then no reset email is sent
    And the user is shown "If an account exists for that email address, a reset link has been sent"

  @S-048 @UC-USR-007
  Scenario: Notification email is sent after a successful password reset
    Given "alice@example.com" has a valid, unused password reset link
    When the user follows the reset link and successfully sets the new password "NewPass!88"
    Then a notification email is sent to "alice@example.com" advising that the password was changed

  # ───────────────────────────────────────────────
  # Exception Flows
  # ───────────────────────────────────────────────

  @S-049 @UC-USR-007
  Scenario: Expired reset link shows an error with an option to request a new one
    Given "alice@example.com" has an expired password reset link
    When the user follows the expired reset link
    Then the error "This reset link has expired" is displayed
    And the user is offered an option to request a new reset link

  @S-050 @UC-USR-007
  Scenario: Already-used reset link shows an error with an option to request a new one
    Given "alice@example.com" has already used their password reset link
    When the user follows the used reset link
    Then the error "This reset link has already been used" is displayed
    And the user is offered an option to request a new reset link

  @S-051 @UC-USR-007
  Scenario: New passwords that do not match on the reset form show an inline error
    Given "alice@example.com" has a valid, unused password reset link
    When the user follows the reset link and enters the new password "NewPass!88" and confirms "DifferentPass!77"
    And the user submits the new password
    Then the error "Passwords do not match" is displayed on the confirm password field
    And the password for "alice@example.com" is not changed

  @S-052 @UC-USR-007
  Scenario Outline: Weak password on the reset form shows a requirements error
    Given "alice@example.com" has a valid, unused password reset link
    When the user follows the reset link and enters the new password "<password>" and confirms "<password>"
    And the user submits the new password
    Then a password strength error is displayed
    And the password for "alice@example.com" is not changed

    Examples:
      | password       |
      | short1!        |
      | alllower99!    |
      | ALLUPPER99!    |
      | NoSpecialChar1 |
