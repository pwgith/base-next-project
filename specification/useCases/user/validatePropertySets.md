# Validate IFC Property Sets via REST API

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-020                     |
| **Actor**        | User                           |
| **Priority**     | Medium                         |
| **Status**       | Draft                          |
| **Created**      | 2026-03-17                     |
| **Last Updated** | 2026-03-17                     |

## Summary

An authenticated user validates the property sets attached to IFC elements against standard IFC property set definitions (e.g., Pset_WallCommon, Pset_SlabCommon) or custom user-defined templates. The system checks that required properties are present, property names match the schema, and property value types are correct.

## Preconditions

- The user holds a valid OAuth 2.0 access token with the `ifc:read` scope.
- The target IFC file exists and the user has access to it.
- The target element has at least one property set attached.

## Trigger

The user sends a GET or POST request to the property set validation endpoint for one or more elements.

## Main Flow (Happy Path)

1. The user sends a POST request to `/api/v1/ifc/files/{fileId}/elements/{globalId}/property-sets/{psetName}/validate` specifying the standard or custom schema to validate against.
2. The system validates the Bearer token and confirms the user has `ifc:read` scope.
3. The system retrieves the element's property set by name.
4. The system loads the referenced standard Pset definition (e.g., Pset_WallCommon from the IFC4 schema catalogue).
5. The system compares the element's properties against the definition: checks for missing required properties, unexpected properties, and type mismatches.
6. The system returns the validation result with HTTP 200, including a list of errors and warnings.

## Alternative Flows

### Validate against a custom template

- **Branches from**: Step 1 of Main Flow
- The user provides a custom property set template in the request body instead of referencing a standard Pset name.
- The system uses the custom template for validation instead of the standard catalogue.
- Flow continues from Step 5.

### Validate all property sets on an element

- **Branches from**: Step 1 of Main Flow
- The user sends a POST to `/api/v1/ifc/files/{fileId}/elements/{globalId}/property-sets/validate` without specifying a psetName.
- The system validates each property set against its matching standard definition (if one exists).
- Unrecognised property sets are reported as warnings.

### List available standard property set schemas

- **Branches from**: Step 1 of Main Flow
- The user sends a GET to `/api/v1/ifc/property-set-schemas` to discover which standard Pset definitions are available.
- The system returns a list of standard Pset names with their expected properties and types.

## Exception Flows

### Property set not found on element

- **Triggered at**: Step 3 of Main Flow
- The specified property set name does not exist on the element.
- The system returns 404.

### Unknown standard schema

- **Triggered at**: Step 4 of Main Flow
- The referenced standard Pset name is not in the system's catalogue.
- The system returns 422 with an error indicating the schema is not available.

## Postconditions

- No data has been modified — validation is a read-only operation.
- The user has received a structured validation report identifying any discrepancies.

## Business Rules

- Validation is read-only; it does not create a new version.
- Standard Pset definitions follow the IFC4 ADD2 TC1 specification.
- Custom templates must specify property names and their expected IFC data types.
- Validation results distinguish between errors (type mismatches, missing required properties) and warnings (extra properties not in the schema).
- This use case extends [UC-USR-015 Manipulate IFC File via REST API](./manipulateIfcFileViaApi.md) — all authentication and authorisation rules from that use case apply.

## UI Reference

[design/ui/ifcWorkspace.html](../../../design/ui/ifcWorkspace.html) — Properties tab may include a "Validate" action.

## Features

| Feature ID | Scenario IDs          | Description                     |
|------------|-----------------------|---------------------------------|
| F-032      | S-228, S-229, S-230, S-231, S-232, S-233 | IFC property set validation |

## Notes

- Property CRUD (create, read, update, delete) already exists in F-019. This use case adds only the validation capability.
- The IFC4 standard defines approximately 400 standard property set definitions across all element types.
