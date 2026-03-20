# Manage IFC Projects

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-016                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-16                     |
| **Last Updated** | 2026-03-16                     |

## Summary

An authenticated user creates and manages named **projects**. Each project is an independent workspace that holds exactly one IFC model. All IFC operations (element creation, property edits, material assignments, etc.) are performed within the scope of a specific project, and the IFC model for each project is versioned independently. A user may have many projects, each progressing at its own pace without affecting any other.

## Preconditions

- The user has a registered account (see [UC-USR-003 Sign Up](./signUp.md)).
- The user is signed in and holds a valid OAuth 2.0 access token (see [UC-USR-015 Manipulate IFC File via REST API](./manipulateIfcFileViaApi.md)).

## Trigger

The user creates a new project, listing their projects, or selects an existing project to work on.

## Main Flow (Happy Path) — Create a Project

1. The user sends a POST request to `/api/projects` with a project name and optional description.
2. The system validates that the name is non-empty and does not duplicate an existing project name owned by the same user.
3. The system creates a new project record owned by the authenticated user, assigning it a unique project ID.
4. The system initialises an empty IFC model for the project (containing only a root `IfcProject` entity) and stores it in the database as version 1.
5. The system records a `createdAt` and `lastUpdatedAt` timestamp (both set to the current date and time) on the new project record.
6. The system returns a `201 Created` response containing the project ID, name, description, `createdAt`, `lastUpdatedAt`, and the initial IFC model version number (1).

## Alternative Flows

### List All Projects

- **Branches from**: Before Step 1 (separate endpoint)
- The user sends a GET request to `/api/projects`.
- The system returns a list of all projects owned by the authenticated user, each with its project ID, name, description, `createdAt`, `lastUpdatedAt`, and current IFC version number.
- Projects are ordered by `lastUpdatedAt` descending (most recently changed first), and support pagination.

### Get a Single Project

- **Branches from**: Before Step 1 (separate endpoint)
- The user sends a GET request to `/api/projects/{projectId}`.
- The system returns the project metadata: ID, name, description, `createdAt`, `lastUpdatedAt`, current IFC version number, element count, and the owning user identity.

### Update a Project Name or Description

- **Branches from**: After Step 6 (separate endpoint)
- The user sends a PATCH request to `/api/projects/{projectId}` with a new name and/or description.
- The system validates the new name (non-empty, no duplicate within the user's projects).
- The system updates the project record, sets `lastUpdatedAt` to the current date and time, and returns the updated metadata.
- No new IFC version is created — project metadata is stored separately from the IFC model data.

### Perform IFC Operations Within a Project

- **Branches from**: After Step 5
- The user sends any IFC operation request (see [UC-USR-015](./manipulateIfcFileViaApi.md)) scoped to a project using the path prefix `/api/projects/{projectId}/ifc/...`.
- The system resolves the project, confirms the user owns it, and delegates to the IFC operation logic.
- Each successful mutating IFC operation increments the IFC version for that project only; other projects are unaffected.

### Two Projects Evolve Independently

- **Branches from**: After Step 5 (repeated for a second project)
- The user creates a second project ("Warehouse Extension") alongside an existing project ("Office Building").
- The user makes 5 mutations to "Office Building" (IFC version 1 → version 6) and 2 mutations to "Warehouse Extension" (IFC version 1 → version 3).
- Each project maintains its own independent version counter and IFC data; operations on one project never affect the other.

## Exception Flows

### Project Name Already Exists for This User

- **Triggered at**: Step 2 of Main Flow
- The user attempts to create a project with a name identical to one they already own.
- The system returns `409 Conflict` with the error "A project named '{name}' already exists in your workspace".
- No project is created.

### Project Not Found

- **Triggered at**: Step 1 of any flow that references a `{projectId}`
- The specified project does not exist or belongs to another user.
- The system returns `404 Not Found` with the error "Project not found".

### Project Name Is Blank

- **Triggered at**: Step 2 of Main Flow or the Update alternative flow
- The project name is empty or whitespace only.
- The system returns `422 Unprocessable Entity` with the error "Project name is required".

### Delete Project With Existing IFC Data

- **Triggered at**: A DELETE to `/api/projects/{projectId}`
- The user attempts to delete a project that has IFC data (version > 1 or any elements).
- The system requires an explicit confirmation flag (`?confirm=true`) in the request.
- Without the flag, the system returns `409 Conflict` with the error "Project contains IFC data; add ?confirm=true to the request to permanently delete it".
- With the flag, the system deletes the project and all its IFC version history, then returns `204 No Content`.

## Postconditions

- A new project record exists in the database, owned by the authenticated user, with a unique project ID.
- The project record stores `createdAt` and `lastUpdatedAt` timestamps; both are set to the creation time on initial creation.
- An initial IFC model (version 1) is associated with the project and stored in the database.
- All subsequent IFC mutating operations on this project increment its own IFC version counter independently of all other projects.
- When the project's name or description is updated, `lastUpdatedAt` is updated to the time of the change; `createdAt` is never modified after creation.
- When a project is deleted, the project record, all its IFC version snapshots, and all associated IFC entity data are permanently removed from the database.

## Business Rules

- A user may own any number of projects; there is no system-imposed maximum (subscription plans may impose limits in future).
- Project names must be unique within a user's own workspace; two different users may have projects with the same name.
- Each project holds exactly one IFC model. Multiple IFC models within a single project are not supported.
- The IFC model version counter for a project starts at 1 (empty model on creation) and increments by 1 per committed mutation, independently of all other projects.
- Project metadata (name, description) is stored separately from IFC model data; updating project metadata does not create a new IFC version.
- `createdAt` is set once at project creation and is never subsequently changed.
- `lastUpdatedAt` is set to the current timestamp whenever the project name or description is changed. It is not updated by IFC model mutations (those are tracked by the IFC version history).
- All IFC REST API endpoints scoped to a project use the path prefix `/api/projects/{projectId}/ifc/...`; the `projectId` determines which IFC model and version history are targeted.
- A user can only access their own projects; attempting to access another user's project returns `404 Not Found` (not `403`, to avoid confirming existence).

## UI Reference

[design/ui/ifcProjects.html](../../../design/ui/ifcProjects.html) — Project dashboard: project card grid (name, description, IFC version badge, lastUpdatedAt), New Project modal (name + description form with blank-name validation), Edit metadata modal, Delete confirmation modal with IFC data warning, empty state, and success/error toasts.

## Features

| Feature ID | Scenario IDs                              | Description                                            |
|------------|-------------------------------------------|--------------------------------------------------------|
| F-028      | S-199, S-200, S-201, S-202, S-203, S-204, S-205, S-206, S-207, S-208, S-209, S-210 | IFC project management (create, list, get, update, delete, independent versioning) |

## Notes

- This use case introduces the **Project** as the top-level organisational unit. UC-USR-015 describes the IFC operations that run within a project's scope; both use cases together form the complete IFC API surface.
- The path prefix convention `/api/projects/{projectId}/ifc/...` means all IFC endpoints defined in F-015–F-027 are reachable within a project context by substituting this prefix for `/api/ifc/`.
