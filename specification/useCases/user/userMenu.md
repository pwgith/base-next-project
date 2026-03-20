# User Menu

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-010                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-06                     |
| **Last Updated** | 2026-03-06                     |

## Summary

A signed-in user opens the account menu from the top navigation bar and uses it to access account-level actions: viewing their profile, changing their password, or signing out.

## Preconditions

- The user is currently signed in with an active session (see [UC-USR-004 Login](./login.md)).
- The top navigation bar is visible on the current page.

## Trigger

The user activates the account menu control in the top navigation bar. On desktop, this is an avatar/email button. On mobile, this is a hamburger icon that reveals a slide-down panel.

## Main Flow (Happy Path)

1. The user selects the account menu control in the top navigation bar.
2. The system displays the account menu containing:
   - An identity header showing the signed-in email address.
   - A **Profile** action to view and edit account details.
   - A **Change Password** action.
   - A **Sign Out** action, visually distinguished from the other items (red colouring).
3. The user selects an action from the menu.
4. The system closes the menu and navigates the user to the corresponding page or initiates the action.

## Alternative Flows

### Mobile — Hamburger Menu

- **Branches from**: Step 1 of Main Flow
- On viewports narrower than 640 px, the avatar/email button is replaced by a hamburger icon (☰).
- The user taps the hamburger icon.
- The system displays a slide-down panel containing primary navigation links (Home, Plans) followed by an "Account" section with the same three account actions (Profile, Change Password, Sign Out).
- The hamburger icon changes to a close icon (✕) while the panel is open.
- Selecting an item or tapping the close icon dismisses the panel.

### Dismiss Without Acting — Click Outside (Desktop)

- **Branches from**: Step 2 of Main Flow
- The user clicks anywhere outside the open dropdown.
- The system closes the dropdown without performing any action.

### Dismiss Without Acting — Escape Key

- **Branches from**: Step 2 of Main Flow
- The user presses the Escape key while the menu is open.
- The system closes the menu without performing any action.

## Exception Flows

_None identified — the menu is rendered client-side and does not perform data fetching._

## Postconditions

- If the user selected **Profile**: the user is on the profile page.
- If the user selected **Change Password**: the user is on the change password page (see [UC-USR-006 Change Password](./changePassword.md)).
- If the user selected **Sign Out**: the user's session is invalidated and they are redirected to the sign-in page (see [UC-USR-005 Logout](./logout.md)).
- If the user dismissed the menu: the user remains on the current page with no change to their session.

## Business Rules

- The account menu is only rendered when the user is authenticated. Unauthenticated users do not see the avatar button or hamburger menu account section.
- The signed-in email address displayed in the identity header must match the authenticated user's email.
- The Sign Out item must be visually distinct from navigation items (red text and background on hover) to reduce the risk of accidental sign-out.
- On desktop (≥ 640 px), the menu renders as a floating dropdown below the avatar button.
- On mobile (< 640 px), the menu renders as a full-width slide-down panel from the navigation bar.
- Primary navigation links (Home, Plans) are included in the mobile panel so the user has access to all navigation from a single control.

## UI Reference

[User Menu Mockup](../../../design/ui/userMenu.html)

## Features

| Feature ID | Scenario IDs                   | Description                          |
|------------|--------------------------------|--------------------------------------|
| F-009      | S-061, S-062, S-063, S-064, S-065, S-066, S-067 | User account menu navigation |

## Notes

- The Profile page (linked from this menu) is not yet implemented; link to a placeholder `profile.html` page in the mockup.
- The Change Password and Sign Out actions delegate to existing use cases UC-USR-006 and UC-USR-005 respectively.
