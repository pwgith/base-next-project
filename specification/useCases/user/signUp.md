# Sign Up

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-003                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-05                     |
| **Last Updated** | 2026-03-06                     |

## Summary

A new user creates an account by providing their email address and a password, so they can access the application and save their work.

## Preconditions

- The user does not already have an account with the provided email address.
- The application is accessible.

## Trigger

The user chooses to create a new account from the landing page or sign-in page.

## Main Flow (Happy Path)

1. The user navigates to the sign-up page.
2. The system displays a registration form requesting an email address and a password.
3. The user enters their email address.
4. The user enters a password that meets the password policy.
5. The user confirms their password by entering it a second time.
6. The user submits the form.
7. The system validates the email address format and confirms it is not already registered.
8. The system validates the password meets the required strength rules and that both password entries match.
9. The system creates the account and sends a verification email to the provided address.
10. The system displays a confirmation message informing the user to check their email to verify their account.

## Alternative Flows

### Email verification

- **Branches from**: Step 10 of Main Flow
- The user opens the verification email and clicks the verification link.
- The system marks the account email as verified and redirects the user to the sign-in page with a success message.

## Exception Flows

### Email already registered

- **Triggered at**: Step 7 of Main Flow
- The system detects the email address is already associated with an existing account.
- An error alert is displayed informing the user that an account with this email already exists, with a prompt to sign in or reset their password instead.

### Passwords do not match

- **Triggered at**: Step 8 of Main Flow
- The system detects the two password fields contain different values.
- An inline error is displayed beneath the confirm password field informing the user the passwords do not match.

### Password does not meet requirements

- **Triggered at**: Step 8 of Main Flow
- The system detects the password fails one or more strength rules.
- An inline error is displayed listing the unmet password requirements.

### Invalid email format

- **Triggered at**: Step 7 of Main Flow
- The system detects the email address is not in a valid format.
- An inline error is displayed beneath the email field informing the user the email address is invalid.

## Postconditions

- A new user account exists in the system associated with the provided email address.
- The account is assigned the **Free** subscription plan by default.
- A verification email has been dispatched to the user.
- The user is not yet signed in (sign-in occurs once email is verified).

## Business Rules

- Email addresses must be unique across all accounts.
- Passwords must meet the application password policy (minimum length and complexity).
- Account email addresses must be verified before the user can sign in.
- Every new account is created on the **Free** plan. No payment is required to sign up.

## UI Reference

[./design/ui/signUp.html](../../../design/ui/signUp.html)

## Features

| Feature ID | Scenario IDs                     | Description              |
|------------|----------------------------------|--------------------------|
| F-002      | S-023, S-024, S-025, S-026, S-027, S-028, S-029 | Sign up feature |

## Notes

- Consider whether social/OAuth sign-up (e.g., Google) is in scope. This use case covers email/password registration only.
- The verification email flow may be extracted into a separate sub-use case if complexity warrants it.
