```instructions
# Application Service Instructions

## Overview

This document defines how the application service layer is built and maintained. Application services are the orchestration layer — they receive validated requests from API route handlers, coordinate domain logic and persistence, and return results. They are the **single entry point** for all business operations and the **last framework-independent line of defence** for data integrity and security.

**Key principle**: The application service trusts nothing. Every piece of incoming data is validated and sanitised before it reaches the domain model or the database. The service orchestrates the workflow but delegates business rules to the domain and persistence to repositories.

---

## Role in the Architecture

The application service sits between the API route handler and the domain/repository layers:

```
API Route Handler
  │  verifies JWT, extracts userId
  │  passes raw request data + userId
  ▼
Application Service
  │  1. Validates & sanitises all input
  │  2. Loads current data from Repository
  │  3. Calls Domain for business logic
  │  4. Passes updated data to Repository (with version)
  │  5. Returns result
  ▼
API Route Handler
  │  maps result to HTTP response
  ▼
Client
```

### Responsibilities

| Responsibility | Detail |
|---------------|--------|
| **Input validation & sanitisation** | Check types, ranges, formats, required fields. Trim strings, reject unexpected data. This is the **last line of defence** before data enters the system. |
| **Threat checking** | Reject malicious input — XSS payloads, SQL injection patterns, oversized strings, unexpected field types. |
| **Authorisation** | Verify the authenticated user has permission to perform the operation on the requested resource. |
| **Data loading** | Read current state from repositories before passing to domain functions. |
| **Domain orchestration** | Call domain functions with clean, validated data and receive the updated result. |
| **Persistence orchestration** | Pass the domain result to the appropriate repository for saving, including the version for optimistic locking. |
| **Cross-module coordination** | If a use case spans multiple modules (e.g. checking subscription status before allowing a premium action), the application service coordinates the calls. |
| **Error translation** | Catch domain errors (`DomainError`) and persistence errors (`ConcurrencyError`) and translate them to appropriate result types for the API handler. |

### What the Application Service Must NOT Do

- **Business rules** — Delegate to the domain model. The service does not contain `if (plan.status === 'ARCHIVED') throw ...` — that belongs in the domain.
- **Database queries** — Delegate to repositories. The service never imports Prisma Client directly.
- **HTTP concerns** — The service does not read headers, set status codes, or format HTTP responses. It receives plain data and returns plain data.
- **UI concerns** — The service has no knowledge of React, components, or browser APIs.

---

## Input Validation & Sanitisation

The application service performs **thorough, framework-independent validation** of all input. The API route handler performs lighter-weight HTTP-level checks (field presence, JSON parsing, path parameter types) — see `api.instructions.md`. The application service is the **last line of defence** before data reaches the domain or database, and its checks must pass regardless of which caller invoked the service (UI API, public REST API, or any future client).

### Validation Rules

Every service method must validate its inputs at the top of the method, before any domain or repository calls:

```typescript
import { ValidationError } from '@/lib/errors';

export async function updateProfile(
  userId: string,
  input: UpdateProfileRequest
): Promise<Profile> {
  // 1. Validate & sanitise ALL input
  const sanitised = validateUpdateProfileInput(input);

  // 2. Load current data
  const current = await profileRepository.findByUserId(userId);
  if (!current) {
    throw new NotFoundError(`Profile not found for user ${userId}`);
  }

  // 3. Call domain
  const updated = profileDomain.updateProfile(current, sanitised);

  // 4. Persist
  return profileRepository.update(updated.id, updated, current.version);
}
```

### What to Validate

| Check | Example | Error Type |
|-------|---------|------------|
| **Required fields present** | `if (!input.displayName)` | `ValidationError` |
| **Correct types** | `if (typeof input.roofHeight !== 'number')` | `ValidationError` |
| **String length limits** | `if (input.displayName.length > 200)` | `ValidationError` |
| **Numeric ranges** | `if (input.roofHeight < 0)` | `ValidationError` |
| **Format validation** | Email format, UUID format | `ValidationError` |
| **No unexpected fields** | Strip any fields not in the expected schema | Silent strip |
| **String trimming** | `input.displayName.trim()` | N/A (silent fix) |

### Threat Checking

The service must reject or neutralise potentially malicious input:

| Threat | Defence |
|--------|---------|
| **XSS payloads** | Strip or reject HTML tags and script content from string inputs |
| **Oversized payloads** | Enforce maximum string lengths before passing to domain/repository |
| **Type coercion attacks** | Verify actual JavaScript types, not just truthy/falsy checks |
| **Prototype pollution** | Only extract known fields from input — never spread raw request bodies into domain objects |

```typescript
// ✗ BAD — Spreads raw input directly
const updated = { ...current, ...input };

// ✓ GOOD — Extracts only known, validated fields
const sanitised = {
  displayName: sanitiseString(input.displayName, 200),
  email: validateEmail(input.email),
};
```

### Validation Utility Module

Shared validation and sanitisation functions live in a utility module:

```
src/
  lib/
    validation.ts          # Shared validation/sanitisation helpers
    errors.ts              # Error classes (ValidationError, etc.)
```

```typescript
// src/lib/validation.ts

export function sanitiseString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`Expected string, got ${typeof value}`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('Value must not be empty');
  }
  if (trimmed.length > maxLength) {
    throw new ValidationError(`Value exceeds maximum length of ${maxLength}`);
  }
  return stripHtml(trimmed);
}

export function validatePositiveNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a number`);
  }
  if (value <= 0) {
    throw new ValidationError(`${fieldName} must be positive`);
  }
  return value;
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}
```

---

## Error Classes

The application service uses typed error classes to communicate specific failure modes. The API route handler maps these to HTTP status codes.

```typescript
// src/lib/errors.ts

export class ValidationError extends Error {
  public readonly fields: Record<string, string>;

  constructor(message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields ?? {};
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

export class AuthorisationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorisationError';
  }
}
```

### Error → HTTP Status Mapping

This mapping is enforced in the API route handler, not in the application service itself:

| Error Class | HTTP Status | Response |
|------------|-------------|----------|
| `ValidationError` | `400` | `{ error: { message, fields } }` |
| `NotFoundError` | `404` | `{ error: { message } }` |
| `DomainError` | `400` | `{ error: { message } }` |
| `ConcurrencyError` | `409` | `{ error: { message } }` |
| `AuthorisationError` | `403` | `{ error: { message } }` |
| Unhandled / unknown | `500` | `{ error: { message: 'Internal server error' } }` |

---

## Service Method Structure

Every application service method follows the same structure:

```typescript
export async function doSomething(
  userId: string,        // Always from the verified JWT, never from client input
  input: SomeInput       // Raw input from the API route handler
): Promise<SomeResult> {

  // ── Step 1: Validate & sanitise ──────────────────────────
  const sanitised = validateSomeInput(input);

  // ── Step 2: Authorise ────────────────────────────────────
  // Verify the user has permission to perform this action
  const profile = await profileRepository.findByUserId(userId);
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }

  // ── Step 3: Load current state ───────────────────────────
  const current = await someRepository.findById(sanitised.targetId);
  if (!current) {
    throw new NotFoundError(`Resource ${sanitised.targetId} not found`);
  }

  // ── Step 4: Check ownership / access ─────────────────────
  if (current.profileId !== profile.id) {
    throw new AuthorisationError('You do not have access to this resource');
  }

  // ── Step 5: Call domain ──────────────────────────────────
  const updated = someDomain.applyBusinessRule(current, sanitised);

  // ── Step 6: Persist ──────────────────────────────────────
  return someRepository.update(updated.id, updated, current.version);
}
```

### The userId Always Comes from the JWT

The application service **never** extracts the user identity from the request body. The `userId` parameter is always passed by the API route handler after JWT verification:

```typescript
// In the API route handler
const userId = await authService.verifyToken(request);  // From JWT
const result = await profileService.updateProfile(userId, body);  // userId is trusted
```

---

## Optimistic Locking Orchestration

The application service is responsible for the optimistic locking workflow, even though the Repository enforces the version check:

1. **Load** the current record from the repository (which includes `version`).
2. **Pass** the current data to the domain function.
3. **Receive** the updated data from the domain (version unchanged).
4. **Pass** the updated data and the `expectedVersion` to the repository's update method.
5. **Let** the repository throw `ConcurrencyError` if the version has changed.

The service does **not** catch `ConcurrencyError` — it lets it propagate to the API route handler, which returns `409 Conflict`.

```typescript
export async function updatePlan(
  userId: string,
  planId: string,
  input: UpdatePlanRequest
): Promise<Plan> {
  const sanitised = validateUpdatePlanInput(input);
  const current = await planRepository.findById(planId);

  if (!current) throw new NotFoundError(`Plan ${planId} not found`);
  if (current.profileId !== userId) throw new AuthorisationError('Access denied');

  // Domain applies rules, returns updated record (version unchanged)
  const updated = planDomain.updatePlan(current, sanitised);

  // Repository checks version and persists (throws ConcurrencyError on mismatch)
  return planRepository.update(updated.id, updated, current.version);
}
```

---

## Cross-Module Coordination

When a use case involves multiple modules, the application service in the **owning module** coordinates the calls. It imports the other module's service or repository as needed.

```typescript
// In core module's analyseService.ts
import { subscriptionService } from '@/modules/subscription/subscriptionService';
import { profileRepository } from '@/modules/profile/profileRepository';

export async function analyseFloorPlan(
  userId: string,
  input: AnalyseRequest
): Promise<AnalysisResult> {
  // Check subscription entitlement
  const profile = await profileRepository.findByUserId(userId);
  if (!profile) throw new NotFoundError('Profile not found');

  const subscription = await subscriptionService.getActiveSubscription(profile.id);
  if (!subscription) {
    throw new AuthorisationError('Active subscription required');
  }

  // Proceed with core domain logic...
  const sanitised = validateAnalyseInput(input);
  // ...
}
```

---

## File Organisation

### File Location

Application services live inside the module they belong to:

```
src/
  modules/
    profile/
      profileService.ts          # Application Service
      profileDomain.ts           # Domain (called by service)
      profileTypes.ts            # Domain types
      profileRepository.ts       # Repository (called by service)
      __tests__/
        profileService.test.ts   # Service unit tests
    core/
      services/
        analyseService.ts        # Application Service
      domain/
        planDomain.ts
        roomDomain.ts
      coreTypes.ts
      repositories/
        planRepository.ts
        roomRepository.ts
      __tests__/
        analyseService.test.ts
```

### File Naming

| File | Convention | Example |
|------|-----------|---------|
| Application service | `[entity]Service.ts` or `[action]Service.ts` | `profileService.ts`, `analyseService.ts` |

### Function Naming

Service functions are named after the **use case action**, matching the business language:

```typescript
// ✓ GOOD — Business action names
export async function updateProfile(userId: string, input: UpdateProfileRequest): Promise<Profile> { ... }
export async function analyseFloorPlan(userId: string, input: AnalyseRequest): Promise<AnalysisResult> { ... }
export async function createCheckoutSession(userId: string, priceId: string): Promise<string> { ... }

// ✗ BAD — Technical / generic names
export async function handleRequest(data: any): Promise<any> { ... }
export async function processData(input: object): Promise<object> { ... }
```

### Export Style

Application service functions use **named exports**. Classes are acceptable when shared state (e.g. injected dependencies) is needed, but prefer plain functions when there is no shared state:

```typescript
// Preferred — named exports
export async function updateProfile(...): Promise<Profile> { ... }
export async function getProfile(...): Promise<Profile | null> { ... }
```

---

## Application Service Testing

Application service tests verify that the orchestration logic works correctly — that inputs are validated, domain functions are called with the right data, and repository methods are invoked in the right order.

### Test Location

Tests live in a `__tests__` folder next to the service file:

```
src/
  modules/
    profile/
      profileService.ts
      __tests__/
        profileService.test.ts
```

### Test Approach

Application service tests **mock the repository and domain layers** to test the orchestration in isolation:

- **Mock repositories** — Stub `findById`, `update`, `create`, etc. to return controlled data.
- **Mock domain functions** — Stub to return predictable results (or use the real domain functions if they are simple enough).
- **Assert the orchestration** — Verify that validation runs first, domain is called with correct data, repository is called with correct data and version.

```typescript
import { updateProfile } from '../profileService';
import * as profileRepository from '../profileRepository';
import * as profileDomain from '../profileDomain';
import { ValidationError, NotFoundError, ConcurrencyError } from '@/lib/errors';

jest.mock('../profileRepository');
jest.mock('../profileDomain');

const mockRepo = profileRepository as jest.Mocked<typeof profileRepository>;
const mockDomain = profileDomain as jest.Mocked<typeof profileDomain>;

describe('updateProfile', () => {
  const userId = 'user-1';
  const existingProfile = {
    id: 'p-1',
    supabaseUserId: userId,
    displayName: 'Original',
    email: 'test@example.com',
    version: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('validates input before loading data', async () => {
    await expect(
      updateProfile(userId, { displayName: '' })
    ).rejects.toThrow(ValidationError);

    expect(mockRepo.findByUserId).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when profile does not exist', async () => {
    mockRepo.findByUserId.mockResolvedValue(null);

    await expect(
      updateProfile(userId, { displayName: 'Valid Name' })
    ).rejects.toThrow(NotFoundError);
  });

  it('calls domain with current data and sanitised input', async () => {
    mockRepo.findByUserId.mockResolvedValue(existingProfile);
    mockDomain.updateProfile.mockReturnValue({
      ...existingProfile,
      displayName: 'New Name',
    });
    mockRepo.update.mockResolvedValue({
      ...existingProfile,
      displayName: 'New Name',
      version: 3,
    });

    await updateProfile(userId, { displayName: '  New Name  ' });

    expect(mockDomain.updateProfile).toHaveBeenCalledWith(
      existingProfile,
      expect.objectContaining({ displayName: 'New Name' })  // trimmed
    );
  });

  it('passes correct version to repository update', async () => {
    mockRepo.findByUserId.mockResolvedValue(existingProfile);
    const domainResult = { ...existingProfile, displayName: 'Updated' };
    mockDomain.updateProfile.mockReturnValue(domainResult);
    mockRepo.update.mockResolvedValue({ ...domainResult, version: 3 });

    await updateProfile(userId, { displayName: 'Updated' });

    expect(mockRepo.update).toHaveBeenCalledWith(
      existingProfile.id,
      domainResult,
      2  // current version
    );
  });
});
```

### What to Test

| Concern | Example |
|---------|---------|
| **Validation rejects bad input** | Missing required fields, wrong types, oversized strings, HTML injection |
| **Validation runs before anything else** | Repository is never called when input is invalid |
| **Authorisation checks** | Wrong user cannot access another user's resource |
| **Domain is called correctly** | Current data and sanitised input are passed |
| **Repository is called correctly** | Updated data and correct version are passed |
| **Not found handling** | Service throws `NotFoundError` when record doesn't exist |
| **Error propagation** | `DomainError` and `ConcurrencyError` propagate unchanged |

---

## Dependency Rules

| May import from | Must not import from |
|----------------|---------------------|
| Domain functions (`[module]Domain.ts`) | Prisma Client directly |
| Repository functions (`[module]Repository.ts`) | Next.js (`next/*`) |
| Domain types (`[module]Types.ts`) | React or browser APIs |
| Shared errors (`@/lib/errors`) | API route handler code |
| Shared validation (`@/lib/validation`) | UI components or hooks |
| Shared constants (`@/constants/`) | |
| Other modules' services or repos (for cross-module) | |

The application service **never** imports `@prisma/client` directly — all database access goes through repository functions.

---

## Review Checklist

Before considering an application service complete:

- [ ] Every service method validates and sanitises all input before proceeding.
- [ ] String inputs are trimmed, length-checked, and stripped of HTML.
- [ ] Numeric inputs are type-checked and range-checked.
- [ ] Only known fields are extracted from input — raw request bodies are never spread into domain objects.
- [ ] The `userId` parameter comes from the verified JWT, never from client input.
- [ ] Authorisation checks verify the user owns or has access to the requested resource.
- [ ] Current state is loaded from the repository before calling domain functions.
- [ ] Domain functions are called with clean, validated data and current state.
- [ ] Repository update/delete methods receive the correct `expectedVersion` from the loaded record.
- [ ] `ConcurrencyError` propagates to the API handler (not caught in the service).
- [ ] `DomainError` propagates to the API handler (not caught in the service).
- [ ] `ValidationError` is thrown with descriptive messages and field-level detail where applicable.
- [ ] `NotFoundError` is thrown when required records are not in the database.
- [ ] No Prisma imports — all database access goes through repositories.
- [ ] No HTTP/framework imports — the service is framework-agnostic.
- [ ] Service functions are named after business actions.
- [ ] Unit tests exist with mocked repositories and domain functions.
- [ ] Tests verify validation runs first, domain receives correct data, and repository receives correct data and version.
```
