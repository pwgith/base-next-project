# Login

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-004                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-05                     |
| **Last Updated** | 2026-03-05                     |

## Summary

A registered user signs in to the application using their email address and password, so they can access their account and use the application's features.

## Preconditions

- The user has a registered account (see [UC-USR-003 Sign Up](./signUp.md)).
- The user's email address has been verified.
- The application is accessible.

## Trigger

The user navigates to the sign-in page or is redirected there when attempting to access a protected area of the application.

## Main Flow (Happy Path)

1. The user navigates to the sign-in page.
2. The system displays a sign-in form requesting an email address and password.
3. The user enters their registered email address.
4. The user enters their password.
5. The user submits the form.
6. The system validates the credentials against the stored account.
7. The system creates an authenticated session for the user.
8. The system redirects the user to the application's main page (or the originally requested protected page).

## Alternative Flows

### Remember me

- **Branches from**: Step 5 of Main Flow
- If the user has opted to remain signed in, the system issues a persistent session token so they are not required to sign in again on the same device for an extended period.

### Redirect after authentication

- **Branches from**: Step 8 of Main Flow
- If the user was redirected to the sign-in page from a protected route (see [UC-USR-009 Access Protected Route Without Session](./accessProtectedRoute.md)), the system redirects them back to their originally requested page after successful authentication.

## Exception Flows

### Invalid credentials

- **Triggered at**: Step 6 of Main Flow
- The system cannot match the email and password to a known account.
- An error alert is displayed stating the email address or password is incorrect. No indication is given as to which field is wrong.

### Account not verified

- **Triggered at**: Step 6 of Main Flow
- The system finds a matching account but the email address has not been verified.
- An error alert is displayed informing the user their email address has not been verified, with an option to resend the verification email.

### Account locked

- **Triggered at**: Step 6 of Main Flow
- The system detects the account has been locked due to too many failed sign-in attempts.
- An error alert is displayed informing the user the account is temporarily locked and advising them to try again later or reset their password.

## Postconditions

- The user has an active authenticated session.
- The user can access protected areas of the application.

## Business Rules

- Sign-in attempts with incorrect credentials should not reveal whether the email or password is incorrect.
- Accounts should be temporarily locked after a configured number of consecutive failed sign-in attempts.
- Sessions must expire after a period of inactivity.

## UI Reference

[./design/ui/login.html](../../../design/ui/login.html)

## Features

| Feature ID | Scenario IDs                          | Description    |
|------------|---------------------------------------|----------------|
| F-003      | S-030, S-031, S-032, S-033, S-034, S-035 | Login feature |

## Notes

- This use case covers email/password authentication only. OAuth/social sign-in is out of scope.
- The specific lockout threshold and duration are defined by the security configuration.
- The precondition for the "Redirect after authentication" alternative flow is described in [UC-USR-009 Access Protected Route Without Session](./accessProtectedRoute.md).
