# Manage Element Connectivity via REST API

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-022                     |
| **Actor**        | User                           |
| **Priority**     | Medium                         |
| **Status**       | Draft                          |
| **Created**      | 2026-03-17                     |
| **Last Updated** | 2026-03-17                     |

## Summary

An authenticated user defines and queries logical connections between IFC elements via the REST API. This models IfcRelConnectsElements and IfcRelConnectsPortToElement relationships, enabling representation of how MEP (Mechanical, Electrical, and Plumbing) components connect — such as pipe-to-pipe joints, duct-to-terminal connections, and cable tray segments.

## Preconditions

- The user holds a valid OAuth 2.0 access token with the `ifc:write` scope (or `ifc:read` for read operations).
- The target IFC file exists and the user has access to it.
- The elements to be connected exist within the file.

## Trigger

The user sends an HTTP request to create, query, or remove a connectivity relationship between elements.

## Main Flow (Happy Path)

1. The user sends a POST request to `/api/v1/ifc/files/{fileId}/elements/{globalId}/connections` with the connected element's globalId and optional port details.
2. The system validates the Bearer token and confirms the user has `ifc:write` scope.
3. The system validates that both elements exist and that the connection is semantically valid.
4. The system creates an IfcRelConnectsElements relationship between the two elements.
5. The system creates a new version snapshot of the IFC model.
6. The system returns the connection relationship with HTTP 201, including a connectionId.

## Alternative Flows

### List all connections for an element

- **Branches from**: Step 1 of Main Flow
- The user sends a GET to `/api/v1/ifc/files/{fileId}/elements/{globalId}/connections`.
- The system returns all elements connected to the specified element via IfcRelConnectsElements.

### Define a port on an element

- **Branches from**: Step 1 of Main Flow
- The user sends a POST to `/api/v1/ifc/files/{fileId}/elements/{globalId}/ports` to create an IfcDistributionPort.
- Ports define the connection points on MEP elements (inlet, outlet, bidirectional).

### List ports on an element

- **Branches from**: Step 1 of Main Flow
- The user sends a GET to `/api/v1/ifc/files/{fileId}/elements/{globalId}/ports`.
- The system returns all IfcDistributionPort entities related to the element.

### Remove a connection between elements

- **Branches from**: Step 1 of Main Flow
- The user sends a DELETE to `/api/v1/ifc/files/{fileId}/elements/{globalId}/connections/{connectionId}`.
- The system removes the IfcRelConnectsElements relationship. The elements themselves are not deleted.
- A new version snapshot is created.

## Exception Flows

### Incompatible element types

- **Triggered at**: Step 3 of Main Flow
- The elements cannot be logically connected (e.g., connecting a wall to a pipe without an intermediary).
- The system returns 422 with an error explaining the constraint.

### Elements in different files

- **Triggered at**: Step 3 of Main Flow
- The target connected element does not exist in the same IFC file.
- The system returns 404.

## Postconditions

- The IfcRelConnectsElements relationship has been created or removed as requested.
- A new version snapshot has been persisted for each mutating operation.

## Business Rules

- Connectivity relationships are primarily used for MEP (IfcDistributionElement subtypes) and structural elements.
- Ports define the physical connection points and carry flow direction (SOURCE, SINK, SOURCEANDSINK).
- A connection links two ports or two elements directly.
- This use case extends [UC-USR-015 Manipulate IFC File via REST API](./manipulateIfcFileViaApi.md) — all authentication, authorisation, and versioning rules apply.

## UI Reference

[design/ui/ifcWorkspace.html](../../../design/ui/ifcWorkspace.html) — Element detail panel may show connected elements and ports.

## Features

| Feature ID | Scenario IDs          | Description                     |
|------------|-----------------------|---------------------------------|
| F-034      | S-242, S-243, S-244, S-245, S-246, S-247, S-248 | IFC element connectivity |

## Notes

- The current relationship management (F-022) covers spatial containment, type assignments, groups, and systems but does not model element-to-element connectivity.
- The IFC schema relationships modelled are IfcRelConnectsElements (ISO 16739, §5.2.5.5) and IfcRelConnectsPortToElement (§7.5.4.17).
