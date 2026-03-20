```instructions
# API Design & Implementation Instructions

## Overview

This document defines how REST APIs are designed and implemented in this application. There are two distinct classes of API, each with different audiences, authentication mechanisms, and routing conventions — but **both delegate to the same underlying application services**.

**Key principle**: API route handlers are thin adapters. They authenticate the caller, validate and sanitise the raw HTTP request, call the application service, and map the result to an HTTP response. Business logic lives in the application service and domain layers, never in a route handler.

**Prerequisite**: Every API implementation must conform to the system architecture defined in `architecture.instructions.md`. The architecture prescribes the layered Service–Domain–Repository pattern, Supabase JWT authentication for internal use, Prisma for persistence, and Stripe for payments. APIs must work within these constraints.

---

## Two Classes of API

| Class | Audience | Auth | Route Prefix | Versioned |
|-------|----------|------|--------------|-----------|
| **UI API** | This application's Next.js front-end | Supabase JWT | `/api/` | No |
| **Public REST API** | External consumers (third parties, mobile apps) | OAuth 2.0 Bearer token | `/api/v1/` | Yes |

### Why Separate?

- **Different auth mechanisms**: The UI uses short-lived Supabase JWTs; external clients use longer-lived OAuth tokens with explicit scopes.
- **Different stability contracts**: Public APIs are versioned (`/api/v1/`) and must maintain backwards compatibility within a major version. UI APIs are internal and may change freely with the front-end.
- **Different response shapes**: Public APIs follow strict REST conventions (consistent envelope, pagination, hypermedia links). UI APIs may return shapes optimised for the specific UI component consuming them.
- **Both call the same application services** — a change to business logic is reflected in both automatically.

---

## Folder Structure

```
src/
  app/
    api/                    # UI APIs (internal, Supabase JWT)
      auth/
        sign-up/route.ts
        session/route.ts
      profile/route.ts
      subscription/route.ts
      ...
    api/v1/                 # Public REST APIs (OAuth 2.0 Bearer + scope)
      projects/
        route.ts            # GET /api/v1/projects, POST /api/v1/projects
        [projectId]/
          route.ts          # GET /api/v1/projects/:id, PATCH, DELETE
          ifc/
            elements/
              route.ts      # POST /api/v1/projects/:id/ifc/elements
            versions/
              route.ts      # GET /api/v1/projects/:id/ifc/versions
      ifc/
        files/
          route.ts          # GET /api/v1/ifc/files, POST (upload)
          [fileId]/
            route.ts        # GET, DELETE
            elements/
              route.ts      # GET (with query params), POST
              [elementId]/
                route.ts    # GET, PATCH, DELETE
                property-sets/route.ts
                classifications/route.ts
                material/route.ts
                geometry/route.ts
                placement/route.ts
            materials/route.ts
            classifications/route.ts
            storeys/route.ts
            spaces/route.ts
            groups/route.ts
            systems/route.ts
            versions/route.ts
            export/route.ts
            download/route.ts
      ...
  lib/
    apiAuth.ts              # Shared JWT/OAuth token verification helpers
    apiResponse.ts          # Shared response-envelope builder
    apiErrors.ts            # HTTP error helpers
```

---

## IFC API Namespace Rules

The IFC model manipulation APIs are **Public REST APIs** only — they are not duplicated as UI APIs. The Next.js front-end uses direct service calls (server components) or the UI project APIs for project metadata.

| Namespace | Purpose | Auth | Example |
|-----------|---------|------|---------|
| `GET /api/v1/projects` | Project CRUD | OAuth `ifc:read` | List all projects for the token holder |
| `POST /api/v1/projects` | Create project | OAuth `ifc:write` | Create and initialise an empty IFC model |
| `/api/v1/projects/{id}/ifc/elements` | Per-project element mutations | OAuth `ifc:write` | Add element to project's IFC model |
| `/api/v1/projects/{id}/ifc/versions` | Per-project version history | OAuth `ifc:read` | List or restore a version |
| `/api/v1/ifc/files` | Standalone IFC file upload/download | OAuth `ifc:write` | Upload a STEP file |
| `/api/v1/ifc/files/{id}/elements` | Element CRUD on uploaded file | OAuth `ifc:write` | Add/edit/delete elements |
| `/api/v1/ifc/files/{id}/materials` | Material management | OAuth `ifc:write` | Assign materials to elements |
| `/api/v1/ifc/files/{id}/export` | Export to STEP/JSON/XML/COBie | OAuth `ifc:read` | Download as `.ifc` STEP file |

---

## REST Conventions

All APIs — UI and public — follow REST conventions:

### HTTP Methods

| Method | Semantics |
|--------|-----------|
| `GET` | Read a resource or collection. Must be idempotent and safe. Never mutate state. |
| `POST` | Create a new resource, or trigger an action with no natural resource ID. |
| `PATCH` | Partial update of an existing resource. Send only the fields being changed. |
| `PUT` | Full replacement of a resource. Use rarely; prefer `PATCH`. |
| `DELETE` | Remove a resource. Should be idempotent. |

### URL Design

- Use **nouns**, not verbs: `/api/v1/subscriptions`, not `/api/v1/getSubscription`.
- Use **plural nouns** for collections: `/api/v1/users`, `/api/v1/plans`.
- Nest to express ownership: `/api/v1/users/{userId}/subscriptions`.
- Keep URLs lowercase and hyphen-separated: `/api/v1/floor-plans`.
- Collection + singleton pattern: `GET /api/v1/users` (list), `GET /api/v1/users/{id}` (single).

### HTTP Status Codes

| Scenario | Status |
|----------|--------|
| Success (read / update) | `200 OK` |
| Success (created) | `201 Created` |
| Success (no body) | `204 No Content` |
| Validation error | `400 Bad Request` |
| Authentication failed | `401 Unauthorized` |
| Authorisation denied | `403 Forbidden` |
| Resource not found | `404 Not Found` |
| Conflict / concurrency | `409 Conflict` |
| Internal server error | `500 Internal Server Error` |

---

## Response Envelope

### Public REST API Envelope

All Public REST API responses use a consistent envelope:

```typescript
// Success — single resource
{
  "data": { ... }
}

// Success — collection
{
  "data": [ ... ],
  "meta": {
    "total": 120,
    "page": 1,
    "pageSize": 20
  }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "displayName must not be empty.",
    "details": [
      { "field": "displayName", "message": "Required." }
    ]
  }
}
```

### UI API Envelope

UI API responses use the same `{ data }` / `{ error }` wrapper but may omit pagination metadata and may include UI-specific computed fields.

```typescript
// UI API success
{ "data": { ... } }

// UI API error
{ "error": { "message": "Human-readable message." } }
```

### Helper: `src/lib/apiResponse.ts`

Centralise envelope creation to keep route handlers clean:

```typescript
import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, code?: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status: 400 });
}

export function unauthorized(message = "Authentication required."): NextResponse {
  return NextResponse.json({ error: { message } }, { status: 401 });
}

export function forbidden(message = "Access denied."): NextResponse {
  return NextResponse.json({ error: { message } }, { status: 403 });
}

export function notFound(message = "Resource not found."): NextResponse {
  return NextResponse.json({ error: { message } }, { status: 404 });
}

export function conflict(message: string): NextResponse {
  return NextResponse.json({ error: { message } }, { status: 409 });
}

export function internalError(): NextResponse {
  return NextResponse.json(
    { error: { message: "An unexpected error occurred." } },
    { status: 500 }
  );
}
```

---

## UI API — Authentication (Supabase JWT)

UI API route handlers must verify the caller's Supabase JWT on every request.

### Authentication Pattern

```typescript
// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/profile/profileService";
import { ok, unauthorized, notFound, internalError } from "@/lib/apiResponse";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Verify JWT and extract user identity
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return unauthorized();
  }

  // 2. Call application service
  try {
    const profile = await getProfile(user.id);
    if (!profile) return notFound("Profile not found.");
    return ok(profile);
  } catch {
    return internalError();
  }
}
```

### Rules

- **Never trust client-supplied identity.** Always derive `userId` from the verified JWT.
- **Do not expose internal IDs, stack traces, or database details** in error responses.
- Token verification via the Supabase server SDK must occur before any data access.

---

## Public REST API — Authentication (OAuth 2.0)

Public REST APIs use **OAuth 2.0 Bearer tokens** (RFC 6750). The application acts as a **Resource Server** — it validates incoming Bearer tokens and extracts the authenticated identity and granted scopes.

### Token Verification

Verify the Bearer token in every public route handler before any data access:

```typescript
// src/lib/apiAuth.ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export interface OAuthClaims {
  userId: string;
  scopes: string[];
}

export async function verifyBearerToken(
  request: NextRequest
): Promise<OAuthClaims | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  // Verify token via Supabase (or your OAuth provider)
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  // Extract scopes from token metadata
  const scopes = (user.app_metadata?.scopes as string[] | undefined) ?? [];

  return { userId: user.id, scopes };
}

export function hasScope(claims: OAuthClaims, required: string): boolean {
  return claims.scopes.includes(required);
}
```

### Public Route Handler Pattern

```typescript
// src/app/api/v1/users/[id]/route.ts
import { NextRequest } from "next/server";
import { verifyBearerToken, hasScope } from "@/lib/apiAuth";
import { getProfile } from "@/modules/profile/profileService";
import { ok, unauthorized, forbidden, notFound, internalError } from "@/lib/apiResponse";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  // 1. Verify OAuth Bearer token
  const claims = await verifyBearerToken(request);
  if (!claims) return unauthorized();

  // 2. Enforce scope
  if (!hasScope(claims, "profile:read")) return forbidden("Insufficient scope.");

  // 3. Authorise — users may only read their own profile unless admin
  const { id } = await params;
  if (id !== claims.userId) return forbidden();

  // 4. Call application service
  try {
    const profile = await getProfile(id);
    if (!profile) return notFound("User not found.");
    return ok(toPublicUserDto(profile));
  } catch {
    return internalError();
  }
}
```

### OAuth Scopes

Define scopes at the resource level. Use `resource:action` naming:

| Scope | Meaning |
|-------|---------|
| `profile:read` | Read the authenticated user's profile |
| `profile:write` | Update the authenticated user's profile |
| `subscription:read` | Read subscription status |
| `ifc:read` | Read IFC projects, files, elements, and version history |
| `ifc:write` | Create and modify IFC projects, files, and elements |
| `ifc:delete` | Delete IFC projects, files, and elements |
| `admin:read` | Read any user's data (admin only) |

Document all scopes in the public API documentation. **Never grant broader scopes than necessary** (principle of least privilege).

---

## Request Validation

Both UI and public API route handlers must validate all input before delegating to the application service.

### Parsing the Request Body

```typescript
let body: unknown;
try {
  body = await request.json();
} catch {
  return badRequest("Invalid JSON in request body.");
}
```

### Validating Fields

Check field presence and types in the route handler. The application service performs deeper domain validation.

```typescript
const { displayName, email } = body as Record<string, unknown>;

if (typeof displayName !== "string" || displayName.trim() === "") {
  return badRequest("displayName is required.", "VALIDATION_ERROR");
}
if (typeof email !== "string" || !email.includes("@")) {
  return badRequest("A valid email address is required.", "VALIDATION_ERROR");
}
```

### Validating Path Parameters

```typescript
const { id } = await params;
if (!id || typeof id !== "string") {
  return badRequest("id path parameter is required.");
}
```

---

## Error Handling in Route Handlers

Route handlers map application service errors to HTTP responses. Never allow unhandled exceptions to leak stack traces to the caller.

```typescript
import { ValidationError, NotFoundError, ConcurrencyError } from "@/lib/errors";

try {
  const result = await someService(userId, input);
  return ok(result);
} catch (err) {
  if (err instanceof ValidationError) return badRequest(err.message);
  if (err instanceof NotFoundError) return notFound(err.message);
  if (err instanceof ConcurrencyError) return conflict(err.message);
  // Log unexpected errors server-side before returning generic 500
  console.error("Unexpected error in route handler:", err);
  return internalError();
}
```

**Never** return the raw `Error.message` of an unexpected exception to the caller — it may contain internal details.

---

## Public REST API — Versioning

- Public APIs are versioned in the URL path: `/api/v1/`.
- Introduce `/api/v2/` only when a breaking change is unavoidable.
- Within a major version, all changes must be backwards compatible (additive only — new optional fields, new endpoints).
- **Do not version UI APIs** — they are internal and can change with the front-end.

---

## Public REST API — Pagination

Collections in public REST APIs must support cursor-based or page-based pagination. Never return an unbounded list.

```typescript
// Query parameters: ?page=1&pageSize=20
const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
const pageSize = Math.min(
  parseInt(request.nextUrl.searchParams.get("pageSize") ?? "20", 10),
  100  // Maximum page size — reject larger requests
);

const { items, total } = await someService.list({ page, pageSize });

return NextResponse.json({
  data: items,
  meta: { total, page, pageSize }
});
```

---

## Public REST API — Data Transfer Objects (DTOs)

Public APIs must not expose internal domain model shapes directly. Define explicit DTOs that:

- **Include only fields the external consumer needs** — omit internal IDs, version columns, and sensitive data.
- **Use stable, snake_case field names** consistent with REST conventions.
- **Are documented** — update the API documentation when DTOs change.

```typescript
// src/app/api/v1/users/dto.ts
import type { Profile } from "@/modules/profile/profileTypes";

export interface PublicUserDto {
  id: string;
  display_name: string;
  created_at: string;
}

export function toPublicUserDto(profile: Profile): PublicUserDto {
  return {
    id: profile.id,
    display_name: profile.displayName,
    created_at: profile.createdAt.toISOString(),
  };
}
```

---

## Security

Apply the following controls to every API route handler:

| Control | UI API | Public REST API |
|---------|--------|-----------------|
| Verify caller identity | Supabase JWT | OAuth Bearer token |
| Validate and sanitise all input | ✓ | ✓ |
| Enforce authorisation (not just authentication) | ✓ | ✓ + scope check |
| Never expose stack traces | ✓ | ✓ |
| Never expose internal IDs in errors | ✓ | ✓ |
| Rate limiting (per IP / per token) | Recommended | Required |
| CORS headers (for cross-origin public APIs) | Not needed | Configure via `next.config.ts` |
| Reject oversized request bodies | ✓ | ✓ |

### CORS for Public REST APIs

Configure CORS in `next.config.ts` for the `/api/v1/` prefix to allow external clients:

```typescript
// next.config.ts (example)
async headers() {
  return [
    {
      source: "/api/v1/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: "https://trusted-client.example.com" },
        { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, DELETE, OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" },
      ],
    },
  ];
}
```

Avoid `Access-Control-Allow-Origin: *` for authenticated endpoints.

---

## Route Handler Checklist

Before marking a route handler as complete, verify:

- [ ] Authentication is verified before any data access.
- [ ] Public REST handler checks the required OAuth scope.
- [ ] All path and body parameters are validated and sanitised.
- [ ] Errors are caught and mapped to appropriate HTTP status codes.
- [ ] No stack traces or internal details are returned to the caller.
- [ ] The response uses the correct envelope format (`{ data }` / `{ error }`).
- [ ] The route handler contains no business logic — all logic is in the application service.
- [ ] The route handler is in the correct folder (UI: `/api/`, Public: `/api/v1/`).
- [ ] Any new public endpoint has DTOs to decouple the external contract from the domain model.
- [ ] The OpenAPI spec in `specification/openApiSpecs/` has been updated to include the new or changed route (see `openApiSpec.instructions.md`).
```
