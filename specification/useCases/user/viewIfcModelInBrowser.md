# View IFC Model in Browser

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-017                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-16                     |
| **Last Updated** | 2026-03-16                     |

## Summary

An authenticated user opens a project workspace and the IFC model for that project is loaded and rendered as an interactive 3D scene in the browser. The user can orbit, pan, and zoom the camera to explore the model from any angle.

## Preconditions

- The user is signed in with a valid session (see [UC-USR-004 Login](./login.md)).
- The user has at least one project (see [UC-USR-016 Manage IFC Projects](./manageIfcProjects.md)).
- The selected project contains an IFC model (the model may be an initial empty project structure or a populated model built via the API).

## Trigger

The user navigates to a project's workspace page (e.g., `/projects/{projectId}/workspace`), either by clicking on a project in their project list or by following a direct link.

## Main Flow (Happy Path)

1. The user selects a project from their project list.
2. The system navigates to the project workspace page and displays a loading indicator while the IFC file is fetched.
3. The system fetches the current IFC file for the project from the server via the REST API (authenticated with the user's session credentials).
4. The browser receives the IFC file and passes it to `@thatopen/components`, which converts it into an internal Fragment representation. A progress indicator is displayed during conversion.
5. The system passes the loaded Fragments to the Three.js scene managed by `@thatopen/components`, and the 3D model appears in the viewport.
6. The system hides the loading indicator and the viewport becomes interactive.
7. The user can orbit, pan, and zoom the camera to explore the model in any direction (see Alternative Flows below).

## Alternative Flows

### Orbit the Camera

- **Branches from**: Step 7 of Main Flow
- The user clicks and drags within the viewport.
- The system rotates the camera around the model's pivot point in response to the drag direction and distance.
- Releasing the mouse button stops the rotation.

### Pan the Camera

- **Branches from**: Step 7 of Main Flow
- The user holds the right mouse button (or two-finger drags on a trackpad) and drags within the viewport.
- The system moves the camera laterally (parallel to the view plane) in the direction of the drag.

### Zoom the Camera

- **Branches from**: Step 7 of Main Flow
- The user scrolls the mouse wheel or performs a pinch gesture.
- The system moves the camera closer to or further from the model.

### Reset Camera to Default View

- **Branches from**: Step 7 of Main Flow
- The user activates the reset-camera control in the viewer toolbar.
- The system resets the camera position and orientation to fit the entire model within the viewport.

### Model Updates After Initial Load

- **Branches from**: Step 7 of Main Flow
- The IFC model for the project has been modified via the API after the initial load (e.g., by an MCP agent adding elements).
- The user activates the reload control in the viewer toolbar.
- The system re-executes Steps 3–6, fetching the latest IFC version and re-rendering the updated model. The camera position is preserved across the reload.

## Exception Flows

### IFC File Cannot Be Fetched

- **Triggered at**: Step 3 of Main Flow
- The server returns an error (e.g., `404 Not Found`, `401 Unauthorized`, or a network failure).
- The system hides the loading indicator and displays an error message explaining that the model could not be loaded, with an option to retry.

### IFC Conversion Fails

- **Triggered at**: Step 4 of Main Flow
- The IFC file is fetched successfully but `@thatopen/components` cannot convert it to Fragments (e.g., the file is malformed or uses unsupported IFC schema features).
- The system displays an error message identifying that the model could not be processed, and offers a link to the project's details page.

### Empty or Minimal Model

- **Triggered at**: Step 5 of Main Flow
- The IFC model contains only a root `IfcProject` entity with no geometry (e.g., a newly created project).
- The system renders an empty scene and displays an informational message indicating that the model has no visible geometry yet.
- The viewport remains interactive so the user can reload once geometry is added.

## Postconditions

- The IFC model for the selected project is rendered in the browser viewport as an interactive 3D scene.
- The user can use camera controls to explore the model.

## Business Rules

- The IFC file served to the browser must be the current (latest) version for the project.
- The browser viewer is read-only with respect to the IFC data — modifications to the model must be made via the REST API, not through the viewer UI.
- Fragment conversion is performed client-side by `@thatopen/components`; the server always delivers raw IFC, not pre-converted Fragments.
- For large models, the application may optionally cache the converted Fragments in browser storage to avoid reprocessing on subsequent page loads (future optimisation).

## UI Reference

[design/ui/ifcWorkspace.html](../../../design/ui/ifcWorkspace.html)

## Features

| Feature ID | Scenario IDs                                        | Description                             |
|------------|-----------------------------------------------------|-----------------------------------------|
| F-029      | S-211, S-212, S-213, S-214, S-215, S-216, S-217, S-218, S-219, S-220 | IFC viewer — load and render model in browser |

## Notes

- The renderer stack is: `web-ifc` (server-side IFC generation) → `@thatopen/components` (client-side IFC → Fragments conversion and Three.js scene management) → `@thatopen/ui` (optional BIM UI panels).
- `web-ifc-viewer` is the deprecated predecessor to `@thatopen/components` and must not be used.
- Fragment caching (storing converted Fragments rather than re-converting from IFC each load) is a planned optimisation for large models but is not required for the initial implementation.
- This use case covers the viewer experience only. Element inspection (clicking on an element to see its IFC properties) is covered by [UC-USR-018 Inspect IFC Element in Viewer](./inspectIfcElementInViewer.md).
