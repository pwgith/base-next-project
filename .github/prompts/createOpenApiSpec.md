# Create OpenAPI Specification

## Purpose

Guide the creation or update of OpenAPI specification files that document the project's Public REST API surface, based on the implemented and tested route handlers.

## Required Reading

Before creating an OpenAPI spec, review the following instruction files **in order**:

1. **`.github/instructions/openApiSpec.instructions.md`** — Primary reference. Defines the folder structure, naming conventions, OpenAPI version, schema organisation, response envelope format, authentication documentation, and the review checklist. Follow this file exactly.
2. **`.github/instructions/api.instructions.md`** — Defines the two API classes (UI vs Public REST), REST conventions, HTTP status codes, response envelope format, OAuth scopes, DTOs, and security controls. The OpenAPI spec must accurately reflect these conventions.
3. **`.github/instructions/architecture.instructions.md`** — Provides context on the system architecture, module boundaries, and layering that inform the API surface shape.
4. **`.github/instructions/codingStandard.instructions.md`** — Supplies naming conventions and project structure rules.

## Steps

### Phase 1 — Identify Routes to Document

1. Read each instruction file listed above.
2. Identify the routes to document. Either:
   - **Full spec generation**: Scan all route handlers under `src/app/api/v1/` to enumerate every public endpoint.
   - **Incremental update**: Identify the new or changed routes from the feature just implemented.
3. For each route, extract from the route handler source code:
   - HTTP method(s) exported (`GET`, `POST`, `PATCH`, `PUT`, `DELETE`).
   - Path parameters (from the Next.js folder structure).
   - Query parameters (from `request.nextUrl.searchParams`).
   - Request body shape (from the `await request.json()` parsing and field validation).
   - Response body shape (from the `ok()` / `created()` / `noContent()` calls).
   - Error responses (from `badRequest()` / `notFound()` / `conflict()` etc. calls).
   - Required OAuth scope (from `verifyTokenAndScope()` or `hasScope()` calls).
4. Cross-reference with the domain types in `src/modules/ifc/ifcModelTypes.ts` to get the accurate field names and types for request/response schemas.

### Phase 2 — Write or Update the Spec Files

5. If this is the first spec for an area, create the area folder and YAML file under `specification/openApiSpecs/` following the folder structure in `openApiSpec.instructions.md`.
6. If schemas are new, define them in `specification/openApiSpecs/schemas/common.yaml` (envelope types) or `schemas/ifc.yaml` (domain types).
7. Write the path definitions with:
   - Correct `operationId`, `summary`, `description` (including required scope).
   - All path parameters with `in: path`, `required: true`, and correct `schema`.
   - All query parameters with `in: query` and correct `required` flag.
   - Request body schema referencing `$ref` to `schemas/`.
   - All response status codes with correct envelope/error schemas.
   - Tags matching the area name.
8. Update the root `specification/openApiSpecs/openapi.yaml` to include `$ref` paths to the new area file.

### Phase 3 — Validate

9. Run through the review checklist from `openApiSpec.instructions.md`.
10. Verify all `$ref` paths resolve correctly.
11. Spot-check that the spec matches the actual route handler behaviour by comparing with the feature file scenarios and test results.

## Inputs

When invoking this prompt, provide:

- **Scope** — Either "full" (document all public routes) or the specific feature/area to document (e.g., "ifc-elements", "projects").
- **Route files** *(optional)* — Paths to the specific route handler files to document.
- **Additional context** *(optional)* — Any implementation notes or caveats.
