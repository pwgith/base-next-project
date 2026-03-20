```markdown
# Access Protected Route Without Session

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-009                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-05                     |
| **Last Updated** | 2026-03-05                     |

## Summary

When an unauthenticated user attempts to navigate to a protected page, the system intercepts the request, redirects them to the sign-in page, and preserves the originally requested URL so they can be returned there after successful authentication.

## Preconditions

- The user does not have an active authenticated session.
- The application is accessible.

## Trigger

The user navigates directly to a protected route (e.g. by entering a URL or following a bookmark).

## Main Flow (Happy Path)

1. The user navigates to a protected URL (e.g. `/plans`).
2. The system detects that the user does not have an active authenticated session.
3. The system stores the originally requested URL as the intended return destination.
4. The system redirects the user to the sign-in page.
5. The sign-in page is displayed with the return destination encoded in the redirect state.

## Alternative Flows

_None identified._

## Exception Flows

_None identified._

## Postconditions

- The user is on the sign-in page.
- The originally requested URL is preserved so the system can redirect the user there after successful authentication (see [UC-USR-004 Login](./login.md) — "Redirect after authentication" alternative flow).

## Business Rules

- All routes except the landing page, sign-in page, sign-up page, and password reset pages are protected.
- The return destination must be encoded securely and validated before use to prevent open redirect attacks.

## UI Reference

[Login Mockup](../../../design/ui/login.html)

## Features

| Feature ID | Scenario IDs | Description                           |
|------------|--------------|---------------------------------------|
| F-008      | S-060        | Access protected route without session |

## Notes

- The "redirect after authentication" behaviour (returning the user to their originally requested page after sign-in) is covered in [UC-USR-004 Login](./login.md), scenario S-031.
- This use case covers the middleware/route-guard interception step that precedes that login flow.
```
