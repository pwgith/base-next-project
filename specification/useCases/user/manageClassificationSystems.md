# Manage Classification Systems via REST API

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-024                     |
| **Actor**        | User                           |
| **Priority**     | Medium                         |
| **Status**       | Draft                          |
| **Created**      | 2026-03-17                     |
| **Last Updated** | 2026-03-17                     |

## Summary

An authenticated user manages the IfcClassification systems registered in an IFC file via the REST API. The existing API supports listing file-level classification systems and full CRUD for element-level classification references, but lacks the ability to create, update, or delete the classification systems themselves.

## Preconditions

- The user holds a valid OAuth 2.0 access token with the `ifc:write` scope (or `ifc:read` for read operations).
- The target IFC file exists and the user has access to it.

## Trigger

The user sends an HTTP request to create, update, or delete a classification system on an IFC file.

## Main Flow (Happy Path)

1. The user sends a POST request to `/api/v1/ifc/files/{fileId}/classifications` with the classification system details (name, source, edition, edition date).
2. The system validates the Bearer token and confirms the user has `ifc:write` scope.
3. The system validates the payload: name is required, source and edition are optional but recommended.
4. The system creates an IfcClassification entity in the file.
5. The system creates a new version snapshot of the IFC model.
6. The system returns the created classification system with HTTP 201, including a systemId.

## Alternative Flows

### Update a classification system

- **Branches from**: Step 1 of Main Flow
- The user sends a PATCH to `/api/v1/ifc/files/{fileId}/classifications/{systemId}` with updated fields.
- The system updates the classification system's attributes.
- A new version snapshot is created.

### Delete a classification system

- **Branches from**: Step 1 of Main Flow
- The user sends a DELETE to `/api/v1/ifc/files/{fileId}/classifications/{systemId}`.
- The system checks that no element-level classification references point to this system.
- If no references exist, the system removes the classification system and creates a new version snapshot.

### Get a single classification system

- **Branches from**: Step 1 of Main Flow
- The user sends a GET to `/api/v1/ifc/files/{fileId}/classifications/{systemId}`.
- The system returns the classification system details.

## Exception Flows

### Duplicate classification system

- **Triggered at**: Step 4 of Main Flow
- A classification system with the same name and edition already exists in the file.
- The system returns 409 Conflict.

### Classification system has element references

- **Triggered at**: Alternative Flow "Delete"
- The classification system is referenced by one or more element classification references.
- The system returns 409 Conflict with an error message indicating the system cannot be deleted while references exist.

## Postconditions

- The IfcClassification entity has been created, updated, or removed as requested.
- A new version snapshot has been persisted for each mutating operation.

## Business Rules

- A classification system name must be unique within a file (combined with edition).
- A classification system cannot be deleted if any element references it.
- Common classification systems include Uniclass 2015, OmniClass, MasterFormat, and UniFormat.
- This use case extends [UC-USR-015 Manipulate IFC File via REST API](./manipulateIfcFileViaApi.md) — all authentication, authorisation, and versioning rules apply.

## UI Reference

[design/ui/ifcWorkspace.html](../../../design/ui/ifcWorkspace.html) — Classification tab in the element detail panel.

## Features

| Feature ID | Scenario IDs          | Description                     |
|------------|-----------------------|---------------------------------|
| F-036      | S-257, S-258, S-259, S-260, S-261, S-262 | IFC classification system management |

## Notes

- Element-level classification reference CRUD already exists (F-023). This use case adds management of the parent classification systems.
- The IFC entity modelled is IfcClassification (ISO 16739, §8.3.3.1).
