# Manage Opening Relationships via REST API

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-021                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-17                     |
| **Last Updated** | 2026-03-17                     |

## Summary

An authenticated user manages the void-and-fill relationships between IFC elements via the REST API. This covers creating openings (voids) in host elements such as walls or slabs, and filling those openings with door or window elements — modelling the IfcRelVoidsElement and IfcRelFillsElement relationships defined in the IFC schema.

## Preconditions

- The user holds a valid OAuth 2.0 access token with the `ifc:write` scope (or `ifc:read` for read operations).
- The target IFC file exists and the user has access to it.
- The host element (wall, slab, etc.) exists in the file.

## Trigger

The user sends an HTTP request to manage openings on an element — creating a void, listing voids, filling an opening, or removing a void or fill.

## Main Flow (Happy Path)

1. The user sends a POST request to `/api/v1/ifc/files/{fileId}/elements/{globalId}/openings` with an opening element definition.
2. The system validates the Bearer token and confirms the user has `ifc:write` scope.
3. The system creates an IfcOpeningElement and establishes an IfcRelVoidsElement relationship between the host element and the new opening.
4. The system creates a new version snapshot of the IFC model.
5. The system returns the created opening with HTTP 201, including its globalId and relationship details.

## Alternative Flows

### List openings on an element

- **Branches from**: Step 1 of Main Flow
- The user sends a GET to `/api/v1/ifc/files/{fileId}/elements/{globalId}/openings`.
- The system returns all IfcOpeningElement entities related to the host element via IfcRelVoidsElement.

### Fill an opening with a door or window

- **Branches from**: Step 1 of Main Flow
- The user sends a PUT to `/api/v1/ifc/files/{fileId}/elements/{globalId}/openings/{openingGlobalId}/filling` with the filling element's globalId.
- The system creates an IfcRelFillsElement relationship between the opening and the specified door or window element.
- A new version snapshot is created.

### Get the filling element for an opening

- **Branches from**: Step 1 of Main Flow
- The user sends a GET to `/api/v1/ifc/files/{fileId}/elements/{globalId}/openings/{openingGlobalId}/filling`.
- The system returns the filling element (door, window) if one exists, or 404 if the opening is unfilled.

### Remove a filling element from an opening

- **Branches from**: Step 1 of Main Flow
- The user sends a DELETE to `/api/v1/ifc/files/{fileId}/elements/{globalId}/openings/{openingGlobalId}/filling`.
- The system removes the IfcRelFillsElement relationship. The filling element itself is not deleted.
- A new version snapshot is created.

### Remove a void from an element

- **Branches from**: Step 1 of Main Flow
- The user sends a DELETE to `/api/v1/ifc/files/{fileId}/elements/{globalId}/openings/{openingGlobalId}`.
- The system removes the IfcRelVoidsElement relationship and the opening element. Any filling relationship is also removed.
- A new version snapshot is created.

## Exception Flows

### Host element does not support openings

- **Triggered at**: Step 3 of Main Flow
- The target element's IFC type does not support void relationships (e.g., IfcFurnishingElement).
- The system returns 422 with an error explaining the constraint.

### Opening already filled

- **Triggered at**: Alternative Flow "Fill an opening"
- The opening already has a filling element assigned.
- The system returns 409 Conflict.

## Postconditions

- The IfcRelVoidsElement and/or IfcRelFillsElement relationships have been created, updated, or removed as requested.
- A new version snapshot has been persisted for each mutating operation.

## Business Rules

- Only element types that support IfcRelVoidsElement may have openings (walls, slabs, roofs, beams, columns).
- An opening can have at most one filling element.
- A filling element must be of a type that supports IfcRelFillsElement (doors, windows).
- Removing a void also removes any associated fill relationship.
- This use case extends [UC-USR-015 Manipulate IFC File via REST API](./manipulateIfcFileViaApi.md) — all authentication, authorisation, and versioning rules apply.

## UI Reference

[design/ui/ifcWorkspace.html](../../../design/ui/ifcWorkspace.html) — Element detail panel may show related openings and filling elements.

## Features

| Feature ID | Scenario IDs          | Description                     |
|------------|-----------------------|---------------------------------|
| F-033      | S-234, S-235, S-236, S-237, S-238, S-239, S-240, S-241 | IFC opening relationships (voiding and filling) |

## Notes

- This fills a gap in the current relationship management (F-022), which covers spatial containment, type assignments, groups, and systems but not voiding/filling.
- The IFC schema relationships modelled are IfcRelVoidsElement (ISO 16739, §8.5.3.39) and IfcRelFillsElement (§8.5.3.37).
