```instructions
# API Spec Test Instructions

## Overview

API spec tests are **integration tests** that verify the running application conforms to the OpenAPI specifications in `specification/openApiSpecs/`. They make real HTTP requests to the dev server — **no mocks**. Each test reads the expected behaviour from the OpenAPI spec (status codes, response shapes, required fields, content types) and asserts the live API matches.

**Key principle**: The OpenAPI spec is the contract. These tests prove the implementation honours that contract. If a test fails, either the spec is wrong or the implementation has drifted.

**Prerequisites**:
- Read `openApiSpec.instructions.md` — spec structure, envelope format, schemas.
- Read `api.instructions.md` — two API classes, auth schemes, REST conventions.
- Read `codingStandard.instructions.md` — naming, TypeScript rules.

---

## Technology Stack

| Tool | Purpose |
|------|---------|
| **Jest** | Test runner and assertion library |
| **Native `fetch()`** | HTTP client — no axios or node-fetch |
| **js-yaml** | Parse OpenAPI YAML specs at runtime |
| **Supabase SDK** | Obtain Bearer tokens for authenticated requests |

---

## Folder Structure

```
test/
  api-spec/
    support/
      apiSpecHelper.ts          # Shared helpers: auth, request builder, spec loader
    projects/
      projects.spec.ts          # Tests for specification/openApiSpecs/projects/
    ifc-files/
      ifcFiles.spec.ts          # Tests for specification/openApiSpecs/ifc-files/
    ifc-elements/
      ifcElements.spec.ts       # Tests for specification/openApiSpecs/ifc-elements/
    ifc-versioning/
      ifcVersioning.spec.ts     # Tests for specification/openApiSpecs/ifc-versioning/
    ifc-spatial/
      ifcSpatial.spec.ts        # Tests for specification/openApiSpecs/ifc-spatial/
    ifc-groups/
      ifcGroups.spec.ts         # Tests for specification/openApiSpecs/ifc-groups/
    ifc-materials/
      ifcMaterials.spec.ts      # Tests for specification/openApiSpecs/ifc-materials/
    ifc-export/
      ifcExport.spec.ts         # Tests for specification/openApiSpecs/ifc-export/
    ifc-metadata/
      ifcMetadata.spec.ts       # Tests for specification/openApiSpecs/ifc-metadata/
```

- **One test file per area spec file** — mirrors the `specification/openApiSpecs/` folder structure.
- Folder names use **kebab-case** matching the spec folders.
- Test filenames use **camelCase** with a `.spec.ts` suffix.
- Shared helpers live in `test/api-spec/support/`.

---

## Running Tests

```bash
# Run all API spec tests
npx jest --config jest.config.ts test/api-spec

# Run a single area
npx jest --config jest.config.ts test/api-spec/projects

# Run with verbose output
npx jest --config jest.config.ts test/api-spec --verbose
```

The dev server must be running on `http://localhost:3000` before executing tests.

---

## Shared Helper (`test/api-spec/support/apiSpecHelper.ts`)

The helper module provides reusable utilities for all spec test files:

### Authentication

Use the same pattern as the Cucumber step definitions — create test users via the test setup API, sign in with Supabase to get a Bearer token.

```ts
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const BASE_URL = "http://localhost:3000";
const API_BASE_URL = `${BASE_URL}/api/v1`;
const SETUP_URL = `${BASE_URL}/api/test/setup`;
const TEARDOWN_URL = `${BASE_URL}/api/test/teardown`;

export async function setupUserAndGetToken(
  email: string,
  password: string,
  scopes: string[],
): Promise<string> {
  // Create user via test setup API
  // Sign in via Supabase to get access token
  // Return the token
}

export async function teardownUsers(emails: string[]): Promise<void> {
  // Delete test users via teardown API
}
```

### Request Builder

```ts
export async function apiRequest(
  method: string,
  path: string,
  token: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  return fetch(url, options);
}
```

The `path` parameter is relative to `/api/v1` — e.g., `/projects`, `/ifc/files/{fileId}/elements`.

### Spec Loader

Load and parse the OpenAPI YAML spec files so tests can reference expected schemas, status codes, and response shapes programmatically:

```ts
import { readFileSync } from "fs";
import { load as loadYaml } from "js-yaml";

export function loadSpec(relativePath: string): Record<string, unknown> {
  const fullPath = `specification/openApiSpecs/${relativePath}`;
  const content = readFileSync(fullPath, "utf8");
  return loadYaml(content) as Record<string, unknown>;
}
```

---

## Test Structure

### Organising `describe` Blocks

Group tests by **endpoint path**, then by **HTTP method**, then by **scenario** (success, validation error, auth error, not found, etc.):

```ts
describe("Projects API", () => {
  describe("GET /projects", () => {
    it("returns 200 with data.projects array", async () => { ... });
    it("returns 401 without auth token", async () => { ... });
    it("returns 403 with insufficient scope", async () => { ... });
  });

  describe("POST /projects", () => {
    it("returns 201 with created project", async () => { ... });
    it("returns 400 for invalid body", async () => { ... });
  });
});
```

### What to Assert

Each test validates that the live API response matches the OpenAPI spec:

| Assertion | What to check |
|-----------|---------------|
| **Status code** | Response status matches the spec's documented status for the scenario |
| **Response envelope** | Success responses have `{ data: ... }`, error responses have `{ error: { message } }` |
| **Required fields** | All fields marked `required` in the schema are present in the response |
| **Field types** | String fields are strings, numbers are numbers, arrays are arrays, UUIDs match `format: uuid` |
| **Content-Type** | JSON endpoints return `application/json`, binary endpoints return `application/octet-stream` |
| **Error shape** | Error responses include `error.message` as a string |
| **Headers** | Binary download responses include `Content-Disposition` header |

### What NOT to Assert

- **Exact field values** — don't hard-code expected names or descriptions (those are business test concerns).
- **Array length** — don't assert exact counts; assert the array exists and items have the right shape.
- **Timing** — don't assert response times.

---

## Test Lifecycle

### Setup and Teardown

Use Jest's `beforeAll` / `afterAll` at the `describe` block level to manage test data:

```ts
describe("Projects API", () => {
  let token: string;
  const testEmail = "apispec.projects@example.com";

  beforeAll(async () => {
    token = await setupUserAndGetToken(testEmail, "Secure!99", ["ifc:read", "ifc:write", "ifc:delete"]);
  });

  afterAll(async () => {
    await teardownUsers([testEmail]);
  });
});
```

- Each area test file creates its **own dedicated test user** with a unique email.
- Use a naming convention for test emails: `apispec.{area}@example.com`.
- Clean up all created resources (projects, files) before tearing down users.

### Test Data Creation

Tests that need existing resources (e.g., testing GET on a project) must create them as part of setup:

```ts
let projectId: string;

beforeAll(async () => {
  token = await setupUserAndGetToken(testEmail, "Secure!99", ["ifc:read", "ifc:write", "ifc:delete"]);
  // Create a project for read/update/delete tests
  const res = await apiRequest("POST", "/projects", token, { name: "Spec Test Project" });
  const body = await res.json();
  projectId = body.data.projectId;
});
```

### Cleanup

Delete all test-created resources in `afterAll`:

```ts
afterAll(async () => {
  // Delete test project
  await apiRequest("DELETE", `/projects/${projectId}?confirm=true`, token);
  // Tear down test user
  await teardownUsers([testEmail]);
});
```

---

## Writing Tests for Each Scenario Type

### Success (2xx)

```ts
it("returns 200 with data.projects array", async () => {
  const res = await apiRequest("GET", "/projects", token);
  expect(res.status).toBe(200);

  const body = await res.json();
  expect(body).toHaveProperty("data");
  expect(body.data).toHaveProperty("projects");
  expect(Array.isArray(body.data.projects)).toBe(true);
});
```

### Resource Created (201)

```ts
it("returns 201 with created resource", async () => {
  const res = await apiRequest("POST", "/projects", token, { name: "New Project" });
  expect(res.status).toBe(201);

  const body = await res.json();
  expect(body).toHaveProperty("data");
  expect(body.data).toHaveProperty("projectId");
  expect(typeof body.data.projectId).toBe("string");
});
```

### No Content (204)

```ts
it("returns 204 with no body", async () => {
  const res = await apiRequest("DELETE", `/projects/${id}?confirm=true`, token);
  expect(res.status).toBe(204);

  const text = await res.text();
  expect(text).toBe("");
});
```

### Unauthenticated (401)

```ts
it("returns 401 without auth token", async () => {
  const res = await fetch(`${API_BASE_URL}/projects`);
  expect(res.status).toBe(401);

  const body = await res.json();
  expect(body).toHaveProperty("error");
  expect(body.error).toHaveProperty("message");
  expect(typeof body.error.message).toBe("string");
});
```

### Forbidden (403)

Test with a token that has insufficient scopes:

```ts
it("returns 403 with read-only scope on write endpoint", async () => {
  const readOnlyToken = await setupUserAndGetToken(
    "apispec.readonly@example.com", "Secure!99", ["ifc:read"],
  );
  const res = await apiRequest("POST", "/projects", readOnlyToken, { name: "Blocked" });
  expect(res.status).toBe(403);

  const body = await res.json();
  expect(body).toHaveProperty("error");
  expect(body.error).toHaveProperty("message");
});
```

### Not Found (404)

```ts
it("returns 404 for non-existent resource", async () => {
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const res = await apiRequest("GET", `/projects/${fakeId}`, token);
  expect(res.status).toBe(404);

  const body = await res.json();
  expect(body).toHaveProperty("error");
  expect(body.error).toHaveProperty("message");
});
```

### Validation Error (400 / 422)

```ts
it("returns 400 for invalid request body", async () => {
  const res = await apiRequest("POST", "/ifc/files", token, { invalid: "data" });
  expect(res.status).toBeGreaterThanOrEqual(400);
  expect(res.status).toBeLessThan(500);

  const body = await res.json();
  expect(body).toHaveProperty("error");
});
```

### Binary Download (200 with Content-Disposition)

```ts
it("returns binary content with Content-Disposition header", async () => {
  const res = await apiRequest("GET", `/ifc/files/${fileId}/download`, token);
  expect(res.status).toBe(200);

  const contentType = res.headers.get("content-type");
  expect(contentType).toMatch(/application\/octet-stream/);

  const disposition = res.headers.get("content-disposition");
  expect(disposition).toBeTruthy();
  expect(disposition).toContain("attachment");
});
```

---

## Response Shape Validation

### Validating Against the Spec Schema

For each success response, validate the shape of the returned data matches the schema defined in the OpenAPI spec. Check:

1. All `required` properties are present.
2. Property types match (`string`, `number`, `integer`, `boolean`, `array`, `object`).
3. `format: uuid` fields are valid UUIDs.
4. `format: date-time` fields are valid ISO 8601 strings.
5. Nested objects and arrays of objects also match their schemas.

Use a reusable assertion helper:

```ts
export function expectUuid(value: unknown): void {
  expect(typeof value).toBe("string");
  expect(value).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
}

export function expectIsoDateTime(value: unknown): void {
  expect(typeof value).toBe("string");
  expect(new Date(value as string).toISOString()).toBeTruthy();
}
```

### Envelope Consistency

Every JSON response must match the envelope format:

```ts
export function expectSuccessEnvelope(body: Record<string, unknown>): void {
  expect(body).toHaveProperty("data");
  expect(body).not.toHaveProperty("error");
}

export function expectErrorEnvelope(body: Record<string, unknown>): void {
  expect(body).toHaveProperty("error");
  expect(body.error).toHaveProperty("message");
  expect(typeof (body.error as Record<string, unknown>).message).toBe("string");
  expect(body).not.toHaveProperty("data");
}
```

---

## Coverage Expectations

Each area spec test file should cover:

| Category | Target |
|----------|--------|
| **Every documented endpoint** | At least one success and one error test per path+method |
| **All documented status codes** | Each status code listed in the spec must have a test that triggers it |
| **Auth scenarios** | 401 (no token) and 403 (wrong scope) for at least one endpoint per area |
| **Required fields** | Success responses validated for all required properties |

Within each test file, add a comment block at the top listing the operations covered:

```ts
/**
 * API Spec Tests — Projects
 *
 * Validates the running API conforms to specification/openApiSpecs/projects/projects.yaml
 *
 * Operations covered:
 * - GET    /projects           (listProjects)
 * - POST   /projects           (createProject)
 * - GET    /projects/{id}      (getProject)
 * - PATCH  /projects/{id}      (updateProject)
 * - DELETE /projects/{id}      (deleteProject)
 */
```

---

## Handling Test Dependencies

Some endpoints require prior state (e.g., testing GET element requires a file with elements). Handle this by **building up state in `beforeAll`** using the API itself:

```
1. Create test user → token
2. Create project → projectId
3. Upload/create IFC file → fileId
4. Create element → globalId
5. Run tests against the created resources
6. Clean up in reverse order in afterAll
```

Each area file is self-contained — it creates all the data it needs and cleans up after itself. Do not share state between area test files.

---

## Jest Configuration

The existing `jest.config.ts` already includes `test/` in its `roots` and matches `**/*.spec.ts` files via the `testMatch` pattern. No configuration changes are needed — files under `test/api-spec/` are automatically discovered.

If a specific test timeout is needed for slower integration calls, set it per-file:

```ts
jest.setTimeout(30_000); // 30 seconds for integration tests
```

---

## Dependencies

The tests use packages already in the project:

- `jest` / `ts-jest` — test runner
- `@supabase/supabase-js` — token acquisition
- `dotenv` — load `.env.local`

Add one new dev dependency:

- `js-yaml` + `@types/js-yaml` — parse OpenAPI YAML spec files

---

## Review Checklist

Before considering an API spec test file complete:

- [ ] Every path+method in the area's OpenAPI spec has at least one success test.
- [ ] Every documented error status code has a test that triggers it.
- [ ] 401 and 403 scenarios are tested for at least one endpoint in the area.
- [ ] Success responses are validated for envelope shape (`{ data: ... }`).
- [ ] All `required` properties from the spec schema are asserted as present.
- [ ] Property types are validated (string, number, array, uuid, date-time).
- [ ] Binary download endpoints are tested for Content-Type and Content-Disposition.
- [ ] Test data is created in `beforeAll` and cleaned up in `afterAll`.
- [ ] The test file uses its own dedicated test user email.
- [ ] No mocks — all requests go to the running dev server.
- [ ] Test runs green: `npx jest --config jest.config.ts test/api-spec/{area}`.
```
