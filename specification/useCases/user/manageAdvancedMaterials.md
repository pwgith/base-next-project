# Manage Advanced Material Compositions via REST API

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-023                     |
| **Actor**        | User                           |
| **Priority**     | Medium                         |
| **Status**       | Draft                          |
| **Created**      | 2026-03-17                     |
| **Last Updated** | 2026-03-17                     |

## Summary

An authenticated user manages advanced material compositions and performs bulk material assignments via the REST API. The existing API supports single-material assignment and material layer sets; this use case adds bulk assignment of one material to multiple elements, and support for IfcMaterialConstituentSet and IfcMaterialProfileSet compositions.

## Preconditions

- The user holds a valid OAuth 2.0 access token with the `ifc:write` scope (or `ifc:read` for read operations).
- The target IFC file exists and the user has access to it.
- For bulk assignment, the material and all target elements exist in the file.

## Trigger

The user sends an HTTP request to assign a material to multiple elements, or to define a constituent set or profile set on an element.

## Main Flow (Happy Path) — Bulk Assignment

1. The user sends a POST request to `/api/v1/ifc/files/{fileId}/materials/{materialId}/assignments` with an array of element globalIds.
2. The system validates the Bearer token and confirms the user has `ifc:write` scope.
3. The system validates that the material and all referenced elements exist.
4. The system assigns the specified material to each element, creating IfcRelAssociatesMaterial relationships.
5. The system creates a new version snapshot of the IFC model.
6. The system returns a summary with HTTP 200, listing the number of assignments created.

## Alternative Flows

### Define a material constituent set

- **Branches from**: Step 1 of Main Flow
- The user sends a PUT to `/api/v1/ifc/files/{fileId}/elements/{globalId}/material` with `"assignmentType": "IfcMaterialConstituentSet"` and an array of constituents, each specifying a material name, fraction, and category.
- The system creates the constituent set and associates it with the element.
- A new version snapshot is created.

### Get a material constituent set

- **Branches from**: Step 1 of Main Flow
- The user sends a GET to `/api/v1/ifc/files/{fileId}/elements/{globalId}/material`.
- If the element uses a constituent set, the response includes `"assignmentType": "IfcMaterialConstituentSet"` and the constituents array.

### Define a material profile set

- **Branches from**: Step 1 of Main Flow
- The user sends a PUT to `/api/v1/ifc/files/{fileId}/elements/{globalId}/material` with `"assignmentType": "IfcMaterialProfileSet"` and an array of profiles, each specifying a material name and profile definition.
- The system creates the profile set and associates it with the element.
- A new version snapshot is created.

### Get a material profile set

- **Branches from**: Step 1 of Main Flow
- The user sends a GET to `/api/v1/ifc/files/{fileId}/elements/{globalId}/material`.
- If the element uses a profile set, the response includes `"assignmentType": "IfcMaterialProfileSet"` and the profiles array.

### Partial success in bulk assignment

- **Branches from**: Step 3 of Main Flow
- Some element globalIds do not exist in the file.
- The system assigns the material to the valid elements and returns a 207 Multi-Status response listing successes and failures.

## Exception Flows

### Material not found

- **Triggered at**: Step 3 of Main Flow
- The specified materialId does not exist.
- The system returns 404.

### Empty element list in bulk assignment

- **Triggered at**: Step 3 of Main Flow
- The globalIds array is empty.
- The system returns 400 with a validation error.

## Postconditions

- Material assignments, constituent sets, or profile sets have been created as requested.
- A new version snapshot has been persisted for each mutating operation.

## Business Rules

- Bulk assignment replaces any existing material assignment on each target element.
- An element can have only one material assignment at a time (single material, layer set, constituent set, or profile set).
- IfcMaterialConstituentSet is used for elements composed of identifiable parts (e.g., a curtain wall with glass and frame constituents).
- IfcMaterialProfileSet is used for structural members with defined cross-sections (e.g., I-beams, hollow sections).
- Each constituent specifies a material, an optional fraction (0.0–1.0), and an optional category string.
- Each profile specifies a material and a profile definition (e.g., "IfcIShapeProfileDef" with dimensions).
- This use case extends [UC-USR-015 Manipulate IFC File via REST API](./manipulateIfcFileViaApi.md) — all authentication, authorisation, and versioning rules apply.

## UI Reference

[design/ui/ifcWorkspace.html](../../../design/ui/ifcWorkspace.html) — Materials tab in the element detail panel.

## Features

| Feature ID | Scenario IDs          | Description                     |
|------------|-----------------------|---------------------------------|
| F-035      | S-249, S-250, S-251, S-252, S-253, S-254, S-255, S-256 | IFC advanced material compositions |

## Notes

- Single-material assignment and material layer sets are already supported (F-020). This use case adds bulk assignment, constituent sets, and profile sets.
- The IFC schema types modelled are IfcMaterialConstituentSet (ISO 16739, §8.10.3.3) and IfcMaterialProfileSet (§8.10.3.9).
