# Update IFC Project Settings via REST API

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-025                     |
| **Actor**        | User                           |
| **Priority**     | Medium                         |
| **Status**       | Draft                          |
| **Created**      | 2026-03-17                     |
| **Last Updated** | 2026-03-17                     |

## Summary

An authenticated user updates the project-level settings of an IFC file via the REST API — specifically the unit assignments that govern how all numeric values in the IFC model are interpreted. The existing API supports reading the IfcProject entity but does not allow modification of unit definitions.

## Preconditions

- The user holds a valid OAuth 2.0 access token with the `ifc:write` scope (or `ifc:read` for read operations).
- The target IFC file exists and the user has access to it.
- The IFC file has an IfcProject entity.

## Trigger

The user sends a PATCH request to the project entity endpoint to update unit assignments or project metadata.

## Main Flow (Happy Path)

1. The user sends a PATCH request to `/api/v1/ifc/files/{fileId}/project` with updated unit definitions.
2. The system validates the Bearer token and confirms the user has `ifc:write` scope.
3. The system validates the unit assignments: each unit type (length, area, volume, angle) must reference a valid SI unit or derived unit.
4. The system updates the IfcProject's IfcUnitAssignment.
5. The system creates a new version snapshot of the IFC model.
6. The system returns the updated project entity with HTTP 200.

## Alternative Flows

### Get current unit assignments

- **Branches from**: Step 1 of Main Flow
- The user sends a GET to `/api/v1/ifc/files/{fileId}/project/units`.
- The system returns the current IfcUnitAssignment with each unit type, name, and prefix.

### Update project metadata (name, description, phase)

- **Branches from**: Step 1 of Main Flow
- The user sends a PATCH to `/api/v1/ifc/files/{fileId}/project` with updated name, description, or phase fields.
- The system updates the IfcProject attributes (not the units).
- A new version snapshot is created.

## Exception Flows

### Invalid unit definition

- **Triggered at**: Step 3 of Main Flow
- The request specifies a unit type that is not recognised or a unit name that is not a valid SI unit.
- The system returns 422 with a structured error listing the invalid units.

### Missing required unit types

- **Triggered at**: Step 3 of Main Flow
- The request removes a required unit type (e.g., length unit) without providing a replacement.
- The system returns 422 with an error indicating the required unit types.

## Postconditions

- The IfcProject entity reflects the updated unit assignments and/or metadata.
- A new version snapshot has been persisted.
- All subsequent reads of element dimensions and quantities are interpreted in the new units.

## Business Rules

- An IFC file must always have unit assignments for at minimum: length, area, volume, and plane angle.
- Supported length units include METRE and its SI prefixes (MILLI, CENTI, KILO).
- Supported area units are derived from the length unit (square metres, etc.).
- Supported angle units are RADIAN and DEGREE.
- Changing units does not convert existing numeric values — it changes how they are interpreted. The API response should document this behaviour clearly.
- This use case extends [UC-USR-015 Manipulate IFC File via REST API](./manipulateIfcFileViaApi.md) — all authentication, authorisation, and versioning rules apply.

## UI Reference

[design/ui/ifcWorkspace.html](../../../design/ui/ifcWorkspace.html) — Project metadata section in the spatial hierarchy tree.

## Features

| Feature ID | Scenario IDs          | Description                     |
|------------|-----------------------|---------------------------------|
| F-037      | S-263, S-264, S-265, S-266, S-267, S-268 | IFC project settings management |

## Notes

- The existing GET `/files/{fileId}/project` endpoint returns the IfcProject entity including unit information. This use case adds the ability to modify it.
- The IFC entities modelled are IfcProject (ISO 16739, §5.4.3.7) and IfcUnitAssignment (§8.12.2.1).
