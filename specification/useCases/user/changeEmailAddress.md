# Change Email Address

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-008                     |
| **Actor**        | User                           |
| **Priority**     | Medium                         |
| **Status**       | Draft                          |
| **Created**      | 2026-03-05                     |
| **Last Updated** | 2026-03-05                     |

## Summary

A signed-in user changes the email address associated with their account, so their account remains accessible at their current, valid email address.

## Preconditions

- The user is currently signed in with an active session (see [UC-USR-004 Login](./login.md)).
- The user knows their current password.
- The new email address is not already registered to another account.

## Trigger

The user navigates to the email address section of their account settings and chooses to update it.

## Main Flow (Happy Path)

1. The user navigates to their account settings.
2. The system displays the account settings page, including the current email address and an option to change it.
3. The user selects the option to change their email address.
4. The system displays a form requesting the new email address, the new email address again for confirmation, and the user's current password to authorise the change.
5. The user enters the new email address.
6. The user enters the new email address again to confirm.
7. The user enters their current password.
8. The user submits the form.
9. The system verifies the current password is correct.
10. The system validates the new email address format and confirms it is not already registered to another account.
11. The system verifies the two new email address entries match.
12. The system sends a verification link to the new email address.
13. The system displays a message informing the user that a verification email has been sent to the new address and that the change will not take effect until the link is clicked.
14. The user opens the verification email and clicks the verification link.
15. The system validates the verification token.
16. The system updates the account email address to the new address.
17. The system sends a notification to the old email address informing the user that the email address on the account has been changed.
18. The system displays a success message confirming the email address has been updated.

## Alternative Flows

None.

## Exception Flows

### Password incorrect

- **Triggered at**: Step 9 of Main Flow
- The entered password does not match the account's stored password.
- An inline error is displayed informing the user the password is incorrect.

### New email addresses do not match

- **Triggered at**: Step 11 of Main Flow
- The two email address entries contain different values.
- An inline error is displayed beneath the confirm email field.

### Invalid email format

- **Triggered at**: Step 10 of Main Flow
- The new email address is not in a valid format.
- An inline error is displayed beneath the email field.

### Email already registered

- **Triggered at**: Step 10 of Main Flow
- The new email address is already associated with another account.
- An inline error is displayed informing the user the email address is already in use.

### Verification link expired

- **Triggered at**: Step 15 of Main Flow
- The verification token has passed its expiry time.
- An error alert is displayed informing the user the verification link has expired, with an option to restart the email change process.

### New email same as current email

- **Triggered at**: Step 10 of Main Flow
- The new email address is the same as the current account email address.
- An inline error is displayed informing the user the new email address must be different from the current one.

## Postconditions

- The account email address has been updated to the new address.
- The new email address is verified.
- A notification has been sent to the old email address about the change.
- The user's existing session remains active.

## Business Rules

- The user must re-authenticate with their current password to authorise an email change.
- The new email address must be verified before the account email is updated.
- The new email address must not already be registered to another account.
- A notification email must be sent to the old email address when a change is made, so the user can take action if the change was unauthorised.
- Email change verification tokens must be time-limited.

## UI Reference

[./design/ui/changeEmailAddress.html](../../../design/ui/changeEmailAddress.html)

## Features

| Feature ID | Scenario IDs                                         | Description                    |
|------------|------------------------------------------------------|--------------------------------|
| F-007      | S-053, S-054, S-055, S-056, S-057, S-058, S-059      | Change email address feature   |

## Notes

- The email address is the user's primary identifier and sign-in credential, so this change has significant security implications.
- If the user suspects an unauthorised change, the notification to the old address provides an audit trail.
