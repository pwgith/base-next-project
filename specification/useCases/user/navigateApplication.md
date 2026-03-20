# Navigate Application

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-002                     |
| **Actor**        | User (Investor or Tradie)      |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-01                     |
| **Last Updated** | 2026-03-01                     |

## Summary

The User lands on the application's home page and is presented with a top navigation menu and a set of action cards on the main page. The User selects an action to navigate to the corresponding feature page.

## Preconditions

- The User has access to the application.

## Trigger

The User opens the application in a browser.

## Main Flow (Happy Path)

1. The User opens the application root URL.
2. The system displays the landing page with:
   - A top navigation bar containing the application name and links to each available feature.
   - A hero section with the application name and tagline.
   - A grid of action cards, one per available feature, each showing a title, description, and icon.
   - A footer displaying the application version number so the User can verify the deployed build.
3. The User clicks an action card (or a navigation link) for the desired feature.
4. The system navigates the User to the corresponding feature page.

## Alternative Flows

### Navigate via Top Menu

- **Branches from**: Step 3 of Main Flow
- Instead of clicking an action card, the User clicks a link in the top navigation bar. The system navigates to the same feature page.

## Exception Flows

_None identified — the landing page is static and does not perform data fetching._

## Postconditions

- The User is on the selected feature page and can begin interacting with it.

## Business Rules

- The top navigation menu and the landing page action cards must present the same set of available features.
- The footer must display the current application version (sourced from `package.json`).
- Currently the only available action is "Analyse Floor Plan" which navigates to the Plans page.

## UI Reference

[Landing Page Mockup](../../../design/ui/landingPage.html)

## Features

| Feature ID | Scenario IDs | Description                                |
|------------|--------------|--------------------------------------------|
| —          | —            | _To be added when feature file is created_ |

## Notes

- The set of actions will grow over time as new features are added.
- The navigation bar is shared across all pages; feature pages already include it inline but this should be consolidated into the root layout.
