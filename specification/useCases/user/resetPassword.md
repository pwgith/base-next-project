# Reset Password

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-007                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-05                     |
| **Last Updated** | 2026-03-05                     |

## Summary

A user who has forgotten their password requests a password reset link via email, so they can regain access to their account without knowing the current password.

## Preconditions

- The user has a registered account (see [UC-USR-003 Sign Up](./signUp.md)).
- The user has access to the email address associated with their account.

## Trigger

The user selects the "Forgot password" option from the sign-in page.

## Main Flow (Happy Path)

1. The user selects the forgotten password option on the sign-in page.
2. The system displays a form requesting the user's registered email address.
3. The user enters their email address.
4. The user submits the form.
5. The system locates the account associated with the email address.
6. The system generates a time-limited, single-use password reset token and sends a reset link to the provided email address.
7. The system displays a message informing the user that if an account exists for that email address, a reset link has been sent.
8. The user opens the reset email and clicks the password reset link.
9. The system validates the reset token (checking it exists, has not been used, and has not expired).
10. The system displays a form for the user to enter and confirm a new password.
11. The user enters a new password that meets the password policy.
12. The user enters the new password again to confirm.
13. The user submits the form.
14. The system validates the new password meets strength rules and both entries match.
15. The system updates the account password and invalidates the reset token.
16. The system displays a success message and prompts the user to sign in with their new password.
17. The system sends an email notification informing the user their password was changed.

## Alternative Flows

None.

## Exception Flows

### Email address not registered

- **Triggered at**: Step 5 of Main Flow
- The system cannot find an account for the provided email address.
- The system still displays the same neutral message as Step 7 to prevent email enumeration attacks. No reset email is sent.

### Reset link expired

- **Triggered at**: Step 9 of Main Flow
- The reset token has passed its expiry time.
- An error alert is displayed informing the user the reset link has expired, with an option to request a new one.

### Reset link already used

- **Triggered at**: Step 9 of Main Flow
- The reset token has already been consumed.
- An error alert is displayed informing the user the reset link is no longer valid, with an option to request a new one.

### New passwords do not match

- **Triggered at**: Step 14 of Main Flow
- The two password entries contain different values.
- An inline error is displayed beneath the confirm password field.

### Password does not meet requirements

- **Triggered at**: Step 14 of Main Flow
- The new password fails one or more strength rules.
- An inline error is displayed listing the unmet password requirements.

## Postconditions

- The user's account password has been updated to the new password.
- The reset token has been invalidated and cannot be reused.
- The user is directed to sign in with the new password.
- A notification email has been sent to the user's registered email address.

## Business Rules

- Password reset tokens must be single-use and time-limited (e.g., valid for 1 hour).
- The system must not confirm or deny whether a given email address has an account (to prevent email enumeration).
- All outstanding reset tokens for the account should be invalidated once a successful reset is completed.
- A notification email must be sent when the password is successfully changed via reset.

## UI Reference

[./design/ui/resetPassword.html](../../../design/ui/resetPassword.html)

## Features

| Feature ID | Scenario IDs                                    | Description              |
|------------|-------------------------------------------------|--------------------------|
| F-006      | S-045, S-046, S-047, S-048, S-049, S-050, S-051, S-052 | Reset password feature |

## Notes

- This flow is for unauthenticated users who cannot access the change password function (see [UC-USR-006 Change Password](./changePassword.md)).
- The token expiry duration is determined by the application's security configuration.
