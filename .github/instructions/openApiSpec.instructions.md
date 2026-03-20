```instructions
# OpenAPI Specification Instructions

## Overview

This document defines how OpenAPI specifications are authored and maintained for the project's Public REST API (`/api/v1/`). OpenAPI specs serve as the **source of truth for external API documentation** and are written post-implementation to accurately describe the implemented behaviour.

UI APIs (`/api/`) are internal and not documented with OpenAPI specs.

**Prerequisite**: Read `api.instructions.md` before writing any OpenAPI spec — it defines the authentication schemes, response envelopes, error shapes, and REST conventions that every spec must follow.

---

## When to Write OpenAPI Specs

OpenAPI specs are authored **after implementation**, during Phase 4 (Verification). They document the real, tested API surface — not aspirational designs.

| Trigger | Action |
|---------|--------|
| New public API route implemented and tested | Add path to the relevant area spec file |
| Existing route behaviour changed | Update the corresponding path definition |
| Route removed | Remove the path and mark as deprecated first (one release) |

---

## Folder Structure

```
specification/
  openApiSpecs/
    openapi.yaml                  # Root document — info, servers, security, $ref aggregation
    projects/
      projects.yaml               # /api/v1/projects paths
    ifc-files/
      ifc-files.yaml              # /api/v1/ifc/files paths
    ifc-elements/
      ifc-elements.yaml           # Element CRUD + sub-resources (property-sets, classifications, material, geometry, placement, type, spatial-containment, quantity-sets)
    ifc-versioning/
      ifc-versioning.yaml         # /api/v1/ifc/files/{fileId}/versions paths
    ifc-spatial/
      ifc-spatial.yaml            # Storeys, spaces
    ifc-groups/
      ifc-groups.yaml             # Groups + members
    ifc-materials/
      ifc-materials.yaml          # File-level and element-level materials
    ifc-export/
      ifc-export.yaml             # Export + download (binary responses)
    ifc-metadata/
      ifc-metadata.yaml           # Project entity, element-types, CRS, file-level classifications, systems
    schemas/
      common.yaml                 # Shared schemas: error envelope, pagination, base types
      ifc.yaml                    # IFC domain schemas: elements, properties, materials, spatial
```

### Naming Rules

- Folder names use **kebab-case**: `ifc-elements/`, `ifc-versioning/`.
- YAML file names match the folder name: `ifc-elements/ifc-elements.yaml`.
- The root aggregator file is always `openapi.yaml`.
- Schema files live in `schemas/` and are referenced via `$ref`.

---

## OpenAPI Version

Use **OpenAPI 3.0.3**. Do not use 3.1 features (JSON Schema compatibility, `null` in `type` arrays) — tooling support is broader for 3.0.

---

## Document Structure

### Root Document (`openapi.yaml`)

The root document defines:

1. **`openapi`** — Version string: `"3.0.3"`.
2. **`info`** — API title, version, description.
3. **`servers`** — Base URLs for local dev and production.
4. **`security`** — Default security scheme applied to all operations.
5. **`tags`** — One tag per area folder (e.g., `Projects`, `IFC Files`, `IFC Elements`).
6. **`paths`** — Aggregated via `$ref` from area files.
7. **`components`** — Aggregated schemas from `schemas/`.

### Area Files

Each area file contains only `paths` and operation definitions for that area. Schemas are always defined in `schemas/` and referenced via `$ref`.

---

## Conventions

### Authentication

All Public REST API operations use OAuth 2.0 Bearer tokens. Define the security scheme once in the root document:

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: OAuth 2.0 Bearer token with scopes (ifc:read, ifc:write, ifc:delete)
```

Apply globally via `security: [{ bearerAuth: [] }]`. Override per-operation only if an endpoint has different auth requirements.

Document required scopes in each operation's `description`, not in the security array (OpenAPI 3.0 `http` scheme does not support scopes natively).

### Response Envelope

All JSON responses follow the project's envelope format:

**Success:**
```yaml
type: object
properties:
  data:
    $ref: '#/components/schemas/ThePayload'
required:
  - data
```

**Error:**
```yaml
type: object
properties:
  error:
    type: object
    properties:
      code:
        type: string
      message:
        type: string
    required:
      - message
required:
  - error
```

Define reusable error responses in `schemas/common.yaml`:
- `ErrorResponse` — Generic error envelope.
- `UnauthorizedError` — 401 response.
- `ForbiddenError` — 403 response.
- `NotFoundError` — 404 response.
- `ValidationError` — 400/422 response.
- `ConflictError` — 409 response.
- `InternalError` — 500 response.

### HTTP Status Codes

Map status codes per `api.instructions.md`:

| Status | When |
|--------|------|
| `200` | Success (read / update) |
| `201` | Resource created |
| `204` | Success, no body (delete) |
| `400` | Invalid request body or parameters |
| `401` | Missing or invalid Bearer token |
| `403` | Insufficient scope or ownership |
| `404` | Resource not found |
| `409` | Conflict (domain / concurrency error) |
| `422` | Validation error (domain constraint) |
| `500` | Internal server error |

### Binary Responses

Export and download endpoints return raw binary content, not the JSON envelope. Define these with:

```yaml
responses:
  '200':
    description: Binary file download
    headers:
      Content-Disposition:
        schema:
          type: string
          example: 'attachment; filename="model.ifc"'
    content:
      application/octet-stream:
        schema:
          type: string
          format: binary
```

### Path Parameters

Use `{camelCase}` for path parameter names matching the Next.js folder structure:

- `{projectId}` — UUID
- `{fileId}` — UUID
- `{globalId}` — 22-character IFC GlobalId (Base64)
- `{version}` — Integer version number
- `{psetName}` — Property set name string
- `{propertyName}` — Property name string
- `{referenceId}` — Classification reference GlobalId
- `{layerIndex}` — Zero-based layer index (integer)
- `{groupGlobalId}` — Group GlobalId
- `{memberGlobalId}` — Member element GlobalId
- `{storeyId}` — Storey GlobalId
- `{spaceId}` — Space GlobalId

### Operation IDs

Use `camelCase` operation IDs following `verbNoun` pattern:

- `listProjects`, `createProject`, `getProject`, `updateProject`, `deleteProject`
- `listElements`, `createElement`, `getElement`, `updateElement`, `deleteElement`
- `getElementGeometry`, `updateElementPlacement`
- `listVersions`, `getVersionMetadata`, `downloadVersion`, `restoreVersion`

### Tags

One tag per area folder. The tag `name` matches the display name:

| Tag | Area |
|-----|------|
| `Projects` | Project CRUD |
| `IFC Files` | File management |
| `IFC Elements` | Element CRUD + sub-resources |
| `IFC Versioning` | Version management |
| `IFC Spatial` | Storeys, spaces |
| `IFC Groups` | Groups + members |
| `IFC Materials` | Material management |
| `IFC Export` | Export + download |
| `IFC Metadata` | Project entity, element-types, CRS, classifications, systems |

### Schema Definitions

- Define all schemas in `schemas/common.yaml` (envelope, pagination) or `schemas/ifc.yaml` (domain types).
- Use `$ref` everywhere — never inline complex schemas in path definitions.
- Use `description` on every schema property.
- Use `example` values for string and number fields.
- Use `format: uuid` for UUID fields, `format: date-time` for ISO 8601 timestamps.
- Nullable fields use `nullable: true` (OpenAPI 3.0 convention).

### Descriptions

- Every operation must have a `summary` (one line) and `description` (paragraph with scope requirements and behaviour details).
- Document the required OAuth scope in the operation description: `**Required scope:** \`ifc:read\``.
- Document pagination, filtering, and sorting behaviour in collection endpoint descriptions.

---

## Review Checklist

Before considering an OpenAPI spec file complete:

- [ ] Every implemented route has a corresponding path definition.
- [ ] All path parameters have `in: path`, `required: true`, correct `schema` type.
- [ ] All query parameters have `in: query`, correct `required` flag, and `schema`.
- [ ] Request bodies use `application/json` content type (or `multipart/form-data` for uploads).
- [ ] All response status codes match the implemented route handler.
- [ ] Success responses use the `{ data: ... }` envelope schema.
- [ ] Error responses use the `{ error: { message: ... } }` envelope schema.
- [ ] Binary download responses use `application/octet-stream` with `Content-Disposition` header.
- [ ] Every operation has `operationId`, `summary`, `description`, and at least one `tag`.
- [ ] The required OAuth scope is documented in `description`.
- [ ] All `$ref` paths resolve correctly.
- [ ] No schema is defined inline that could be reused — extract to `schemas/`.
- [ ] Examples use realistic values from the test data or feature files.
```
