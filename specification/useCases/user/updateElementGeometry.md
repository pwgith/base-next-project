# Update Element Geometry via REST API

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-019                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-17                     |
| **Last Updated** | 2026-03-17                     |

## Summary

An authenticated user updates the geometric representation of an IFC element — changing its shape, dimensions, or extrusion profile — via the REST API. The existing API supports reading geometry and updating placement (position/orientation), but does not allow modifying the geometry itself.

## Preconditions

- The user holds a valid OAuth 2.0 access token with the `ifc:write` scope.
- The target IFC file exists and the user has write access to it.
- The target element exists within the file and has at least one geometry representation.

## Trigger

The user sends a PATCH or PUT request to the element's geometry endpoint with an updated geometry representation.

## Main Flow (Happy Path)

1. The user sends a PATCH request to `/api/v1/ifc/files/{fileId}/elements/{globalId}/geometry` with an updated representation body.
2. The system validates the Bearer token and confirms the user has `ifc:write` scope.
3. The system validates the geometry payload: representation type is supported, geometric primitives are well-formed, and numeric values are finite.
4. The system replaces or merges the element's geometry representation with the provided data.
5. The system creates a new version snapshot of the IFC model.
6. The system returns the updated geometry representation with HTTP 200.

## Alternative Flows

### Replace entire geometry (PUT)

- **Branches from**: Step 1 of Main Flow
- The user sends a PUT request instead of PATCH, providing the complete geometry representation.
- The system replaces all existing representations with the provided set.
- Flow continues from Step 5.

### Element has no existing geometry

- **Branches from**: Step 3 of Main Flow
- The element exists but has no geometry representation yet.
- A PUT request creates the geometry; a PATCH request returns 404.

## Exception Flows

### Invalid geometry payload

- **Triggered at**: Step 3 of Main Flow
- The payload contains an unsupported representation type or malformed primitives.
- The system returns 422 with a structured error describing the validation failures.

### Element not found

- **Triggered at**: Step 3 of Main Flow
- The specified globalId does not exist in the file.
- The system returns 404.

## Postconditions

- The element's geometry representation reflects the updated shape data.
- A new version snapshot has been persisted.

## Business Rules

- Supported representation types include SweptSolid, Brep, Clipping, MappedRepresentation, and ExtrudedAreaSolid.
- Geometry updates must not violate IFC schema constraints (e.g., a profile must be a closed curve).
- This use case extends [UC-USR-015 Manipulate IFC File via REST API](./manipulateIfcFileViaApi.md) — all authentication, authorisation, and versioning rules from that use case apply.

## UI Reference

[design/ui/ifcWorkspace.html](../../../design/ui/ifcWorkspace.html) — Geometry tab in the element detail panel.

## Features

| Feature ID | Scenario IDs          | Description                     |
|------------|-----------------------|---------------------------------|
| F-031      | S-222, S-223, S-224, S-225, S-226, S-227 | IFC geometry update |

## Notes

- Placement (position and orientation) updates are already supported via PATCH `/elements/{globalId}/placement` (see F-021). This use case covers only the geometric shape itself.
- Complex geometry types (CSG, tessellated) may be added in future iterations.
