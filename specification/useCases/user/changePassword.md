# Change Password

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-006                     |
| **Actor**        | User                           |
| **Priority**     | Medium                         |
| **Status**       | Draft                          |
| **Created**      | 2026-03-05                     |
| **Last Updated** | 2026-03-05                     |

## Summary

A signed-in user changes their account password by providing their current password and choosing a new one, so they can maintain the security of their account.

## Preconditions

- The user is currently signed in with an active session (see [UC-USR-004 Login](./login.md)).
- The user knows their current password.

## Trigger

The user navigates to the change password section of their account settings.

## Main Flow (Happy Path)

1. The user navigates to their account settings.
2. The system displays the account settings page, including the option to change their password.
3. The user selects the change password option.
4. The system displays a form requesting the current password, a new password, and a confirmation of the new password.
5. The user enters their current password.
6. The user enters a new password that meets the password policy.
7. The user enters the new password again to confirm.
8. The user submits the form.
9. The system verifies the current password is correct.
10. The system validates the new password meets the required strength rules and that both new password entries match.
11. The system updates the account password.
12. The system displays a success message confirming the password has been changed.
13. The system optionally sends an email notification to the user's registered address advising that their password was changed.

## Alternative Flows

None.

## Exception Flows

### Current password incorrect

- **Triggered at**: Step 9 of Main Flow
- The entered current password does not match the account's stored password.
- An inline error is displayed informing the user the current password is incorrect.

### New passwords do not match

- **Triggered at**: Step 10 of Main Flow
- The new password and confirmation fields contain different values.
- An inline error is displayed beneath the confirm new password field.

### New password does not meet requirements

- **Triggered at**: Step 10 of Main Flow
- The new password fails one or more strength rules.
- An inline error is displayed listing the unmet password requirements.

### New password same as current password

- **Triggered at**: Step 10 of Main Flow
- The new password is identical to the current password.
- An inline error is displayed informing the user the new password must be different from the current password.

## Postconditions

- The user's account password has been updated.
- The user remains signed in with their existing session.
- A notification email has been sent to the user's registered email address.

## Business Rules

- The user must supply their current password to authorise the change (re-authentication).
- The new password must meet the application password policy.
- The new password must differ from the current password.
- A notification email must be sent when a password is changed successfully.

## UI Reference

[./design/ui/changePassword.html](../../../design/ui/changePassword.html)

## Features

| Feature ID | Scenario IDs                          | Description             |
|------------|---------------------------------------|-------------------------|
| F-005      | S-039, S-040, S-041, S-042, S-043, S-044 | Change password feature |

## Notes

- If the user has forgotten their current password, they should use the reset password flow instead (see [UC-USR-007 Reset Password](./resetPassword.md)).
