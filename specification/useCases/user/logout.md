# Logout

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-005                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-05                     |
| **Last Updated** | 2026-03-05                     |

## Summary

A signed-in user ends their session by signing out, so their account is no longer accessible from the current device or browser.

## Preconditions

- The user is currently signed in with an active session (see [UC-USR-004 Login](./login.md)).

## Trigger

The user chooses to sign out from the application navigation.

## Main Flow (Happy Path)

1. The user selects the sign-out option from the application navigation.
2. The system invalidates the user's current session and any associated session tokens.
3. The system clears any locally stored authentication data (e.g., cookies, tokens).
4. The system redirects the user to the landing page or sign-in page.
5. The system displays a confirmation that the user has been signed out.

## Alternative Flows

None.

## Exception Flows

### Session already expired

- **Triggered at**: Step 2 of Main Flow
- The session has already expired before the user manually signed out.
- The system still clears any local authentication data and redirects the user to the sign-in page without displaying an error.

## Postconditions

- The user's session is invalidated server-side.
- The user is no longer authenticated and cannot access protected areas of the application.
- Any attempt to access a protected page redirects the user to the sign-in page.

## Business Rules

- Signing out must invalidate the session server-side, not just remove the client-side token.
- After signing out, the browser back button must not allow access to protected pages.

## UI Reference

[./design/ui/logout.html](../../../design/ui/logout.html)

## Features

| Feature ID | Scenario IDs          | Description     |
|------------|-----------------------|-----------------|
| F-004      | S-036, S-037, S-038   | Logout feature  |

## Notes

- If the user has multiple active sessions (e.g., different devices), this use case only terminates the current session. A separate "sign out of all devices" capability is out of scope.
