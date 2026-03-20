@F-005 @UC-USR-006
Feature: Change password
  As a user
  I want to change my account password
  So that I can maintain the security of my account

  Background:
    Given the user is signed in as "alice@example.com" with current password "OldPass!99"

  # ───────────────────────────────────────────────
  # Main Flow — Happy Path
  # ───────────────────────────────────────────────

  @S-039 @UC-USR-006
  Scenario: Successfully changing password updates the account
    Given the user is on the change password page
    When the user enters the current password "OldPass!99", the new password "NewPass!88", and confirms "NewPass!88"
    And the user submits the change password form
    Then the password for "alice@example.com" is updated
    And the success message "Your password has been changed" is displayed

  # ───────────────────────────────────────────────
  # Business Rules
  # ───────────────────────────────────────────────

  @S-040 @UC-USR-006
  Scenario: Notification email is sent after a successful password change
    Given the user is on the change password page
    When the user enters the current password "OldPass!99", the new password "NewPass!88", and confirms "NewPass!88"
    And the user submits the change password form
    Then a notification email is sent to "alice@example.com" advising that the password was changed

  # ───────────────────────────────────────────────
  # Exception Flows
  # ───────────────────────────────────────────────

  @S-041 @UC-USR-006
  Scenario: Incorrect current password shows an inline error
    Given the user is on the change password page
    When the user enters the current password "WrongPass!00", the new password "NewPass!88", and confirms "NewPass!88"
    And the user submits the change password form
    Then the error "Current password is incorrect" is displayed

  @S-042 @UC-USR-006
  Scenario: New passwords that do not match show an inline error
    Given the user is on the change password page
    When the user enters the current password "OldPass!99", the new password "NewPass!88", and confirms "DifferentPass!77"
    And the user submits the change password form
    Then the error "New passwords do not match" is displayed on the confirm password field

  @S-043 @UC-USR-006
  Scenario: New password that is the same as the current password shows an inline error
    Given the user is on the change password page
    When the user enters the current password "OldPass!99", the new password "OldPass!99", and confirms "OldPass!99"
    And the user submits the change password form
    Then the error "New password must be different from the current password" is displayed

  @S-044 @UC-USR-006
  Scenario Outline: Weak new password shows a requirements error
    Given the user is on the change password page
    When the user enters the current password "OldPass!99", the new password "<new_password>", and confirms "<new_password>"
    And the user submits the change password form
    Then a password strength error is displayed

    Examples:
      | new_password   |
      | short1!        |
      | alllower99!    |
      | ALLUPPER99!    |
      | NoSpecialChar1 |
