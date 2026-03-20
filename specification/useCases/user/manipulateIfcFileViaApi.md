# Manipulate IFC File via REST API

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-015                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-16                     |
| **Last Updated** | 2026-03-16                     |

## Summary

An authenticated user (or a client application acting on behalf of a user) performs any supported IFC file operation — such as uploading, querying, modifying, or exporting — by making REST API calls. Every call is protected by an OAuth 2.0 Bearer token. The API is designed API-first so that any future UI consumes the same endpoints without needing separate access paths.

## Preconditions

- The user has a registered account (see [UC-USR-003 Sign Up](./signUp.md)).
- The user is signed in and holds a valid OAuth 2.0 access token issued by the authorisation server.
- The access token has not expired and carries the scope required for the requested IFC operation.
- The user has authorisation to access the target IFC file (i.e., they are the owner or have been granted access).

## Trigger

A client (browser, mobile app, third-party integration, or programmatic script) sends an HTTP request to an IFC REST API endpoint, supplying a Bearer token in the `Authorization` header.

## Main Flow (Happy Path)

1. The client includes a valid OAuth 2.0 Bearer token in the `Authorization: Bearer <token>` header of the HTTP request.
2. The system intercepts the request and validates the token: it confirms the token signature, expiry, issuer, and required scope.
3. The system extracts the user identity from the validated token and resolves the corresponding user account.
4. The system checks that the user has permission to perform the requested IFC operation on the specified resource (e.g., file ownership or share grant).
5. The system performs the requested IFC operation. The specific operation depends on the HTTP method and endpoint path (full list of operations is defined in the corresponding feature files).
6. If the operation is mutating (any POST, PATCH, PUT, or DELETE that changes the IFC model's data), the system saves a complete snapshot of the updated IFC model to the database, assigning it the next sequential version number for that file.
7. The system returns a structured HTTP response (typically JSON) containing the operation result, any requested IFC data, or a success confirmation, along with an appropriate HTTP status code. Responses for mutating operations include the new `version` number in the response body or a `X-IFC-Version` response header.

## Alternative Flows

### Token Is Expired

- **Branches from**: Step 2 of Main Flow
- The system rejects the request with `401 Unauthorized` and a `WWW-Authenticate` response header indicating the token has expired.
- The client must obtain a fresh access token (e.g., via a refresh token grant) and retry the request.

### Insufficient Scope

- **Branches from**: Step 2 of Main Flow
- The access token is valid but does not carry the scope required for the operation.
- The system returns `403 Forbidden` with an error body identifying the missing scope.
- The user must reauthorise with the required scope before retrying.

### IFC Resource Not Found

- **Branches from**: Step 4 or Step 5 of Main Flow
- The specified IFC file or entity does not exist.
- The system returns `404 Not Found` with a structured error body.

### IFC Operation Produces a Partial Result

- **Branches from**: Step 5 of Main Flow
- The operation is valid but only part of the data could be retrieved or modified (e.g., pagination or a partial write).
- The system returns a `206 Partial Content` or `207 Multi-Status` response as appropriate, with metadata indicating what was and was not processed.
- No new version is created for partially applied changes; the system rolls back or records only fully committed mutations.

## Exception Flows

### Invalid or Malformed Token

- **Triggered at**: Step 2 of Main Flow
- The token cannot be validated (e.g., bad signature, wrong issuer, or malformed JWT).
- The system returns `401 Unauthorized`; the request is not processed further.

### User Not Authorised for Resource

- **Triggered at**: Step 4 of Main Flow
- The user's identity is known, but they do not have permission to access the requested IFC file or perform the operation.
- The system returns `403 Forbidden` with a structured error body.

### Invalid or Malformed IFC Payload

- **Triggered at**: Step 5 of Main Flow
- The request body contains an IFC payload that fails schema validation or cannot be parsed.
- The system returns `422 Unprocessable Entity` with a structured error body identifying the validation failures.
- No new version is created because no mutation was committed.

### Version Snapshot Save Failure

- **Triggered at**: Step 6 of Main Flow
- The IFC operation itself succeeds, but the system encounters an error when persisting the version snapshot to the database.
- The system rolls back the mutation, returns `500 Internal Server Error`, and logs the failure with a reference code.
- The IFC file's data and version number remain unchanged.

### Internal Server Error During IFC Processing

- **Triggered at**: Step 5 of Main Flow
- An unexpected error occurs during processing (e.g., a corrupt IFC file, unavailable storage, or unexpected engine failure).
- The system returns `500 Internal Server Error` with a reference code the user can report.
- The error is logged for investigation.
- No new version is created.

## Postconditions

- The requested IFC operation has been applied to the resource (for mutating operations) and the system state reflects the change.
- For every successful mutating operation, a new version snapshot of the complete IFC model is persisted to the database. The version number is an integer that increments by 1 from the previous version for that file.
- The client has received a structured response it can use to confirm success, retrieve queried data, or surface error details to the end user. Mutating responses include the new version number.
- All API calls are recorded in the audit log with the user identity, token scope, operation, resource ID, timestamp, HTTP status code, and the resulting version number (for mutating operations).

## Business Rules

- Every IFC REST API endpoint **must** require a valid OAuth 2.0 Bearer token; unauthenticated requests are always rejected.
- The API is **API-first**: any future UI must use the same REST API endpoints rather than creating separate server-side data paths.
- Access tokens are not stored by the application; they are validated on each request using the issuing authorisation server's public keys or introspection endpoint.
- Each distinct IFC operation is scoped: the token must carry the appropriate OAuth scope for that operation class (e.g., `ifc:read`, `ifc:write`, `ifc:delete`).
- A user may only operate on IFC files they own or to which they have been explicitly granted access.
- **Every successful mutating operation (POST, PATCH, PUT, DELETE) on an IFC model creates a new version snapshot in the database.** Version numbers are positive integers, start at 1 on initial upload, and increment by exactly 1 per committed mutation.
- Read-only operations (GET) do not create a new version.
- Versions are immutable once written — they may be read or used to restore state, but not edited in place.
- The full set of supported IFC operations (upload, download, query, create element, update element, delete element, export, etc.) is defined in the feature files linked in the `## Features` section below.

## UI Reference

[design/ui/ifcWorkspace.html](../../../design/ui/ifcWorkspace.html) — IFC model workspace: spatial hierarchy tree (Project → Site → Building → Storey → Space/Element), element detail panel with tabs for Properties (property sets), Materials (layer set), Classification, and Geometry, plus version history slide-in panel and export modal.

## Features

Trace to Gherkin feature files that implement this use case:

| Feature ID | Scenario IDs                              | Description                                    |
|------------|-------------------------------------------|------------------------------------------------|
| F-015      | S-100, S-101, S-102, S-103, S-104, S-105, S-106, S-107 | IFC file management (upload, list, download, delete) |
| F-016      | S-108, S-109, S-110, S-111, S-112, S-113, S-114, S-115 | IFC spatial structure (project, storeys, spaces)     |
| F-017      | S-116, S-117, S-118, S-119, S-120, S-121, S-122, S-123, S-124, S-125, S-126 | IFC building elements (walls, slabs, columns, beams, doors, windows, stairs) |
| F-018      | S-127, S-128, S-129, S-130, S-131, S-132, S-133 | IFC MEP elements (ducts, pipes, electrical, HVAC)    |
| F-019      | S-134, S-135, S-136, S-137, S-138, S-139, S-140, S-141 | IFC properties and quantity sets                     |
| F-020      | S-142, S-143, S-144, S-145, S-146, S-147, S-148 | IFC materials and material layer sets                |
| F-021      | S-149, S-150, S-151, S-152, S-153, S-154 | IFC geometry representations and placement           |
| F-022      | S-155, S-156, S-157, S-158, S-159, S-160, S-161, S-162 | IFC relationships (containment, types, groups, systems) |
| F-023      | S-163, S-164, S-165, S-166, S-167        | IFC classification references                        |
| F-024      | S-168, S-169, S-170, S-171, S-172, S-173, S-174, S-175 | IFC query and search                                 |
| F-025      | S-176, S-177, S-178, S-179, S-180, S-181 | IFC model export (STEP, JSON, XML, COBie)            |
| F-026      | S-182, S-183, S-184, S-185, S-186, S-187 | IFC API OAuth authentication and scope enforcement   |
| F-027      | S-188, S-189, S-190, S-191, S-192, S-193, S-194, S-195, S-196, S-197, S-198 | IFC model versioning (snapshot per mutation, list, get, download, restore, concurrency) |
| F-031      | S-222, S-223, S-224, S-225, S-226, S-227 | IFC geometry update (modify shape and dimensions)    |
| F-032      | S-228, S-229, S-230, S-231, S-232, S-233 | IFC property set validation (standard and custom schemas) |
| F-033      | S-234, S-235, S-236, S-237, S-238, S-239, S-240, S-241 | IFC opening relationships (voiding and filling)      |
| F-034      | S-242, S-243, S-244, S-245, S-246, S-247, S-248 | IFC element connectivity (ports and connections)     |
| F-035      | S-249, S-250, S-251, S-252, S-253, S-254, S-255, S-256 | IFC advanced material compositions (bulk, constituents, profiles) |
| F-036      | S-257, S-258, S-259, S-260, S-261, S-262 | IFC classification system management (CRUD)          |
| F-037      | S-263, S-264, S-265, S-266, S-267, S-268 | IFC project settings (units and metadata)            |

## Notes

- The specific IFC operations (and their HTTP methods, paths, request/response schemas) are deliberately left out of this use case and will each be captured in dedicated Gherkin feature files. This use case describes the **common authentication and authorisation contract** that all IFC API endpoints share.
- IFC (Industry Foundation Classes) is an open, neutral data format standard (ISO 16739) for Building Information Modelling (BIM). The application operates on IFC STEP-encoded files (`.ifc`) and/or IFC-JSON.
- OAuth 2.0 flows supported (to be confirmed per deployment environment): Authorization Code with PKCE (browser clients), Client Credentials (machine-to-machine integrations).
- Rate limiting, pagination, and API versioning policies are to be defined when the feature files are authored.
- IFC model versioning (version snapshots, version listing, restore) is specified in F-027. The versioning store persists whole-model snapshots; diff-based storage is an implementation detail that does not affect the API contract.
