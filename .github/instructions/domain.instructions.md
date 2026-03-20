```instructions
# Domain Instructions

## Overview

This document defines how the domain model layer is built and maintained. The domain model contains the pure business logic of the application — it receives data, applies business rules, and returns updated data. It **never** performs I/O, mutates live data in-situ, or depends on external services.

**Key principle**: Domain functions are pure transformations. They take input data, apply rules, and return a new result. They have no side effects, no database calls, no API calls, and no knowledge of the infrastructure that surrounds them.

---

## Role in the Architecture

The domain layer sits between the Application Service and the Repository in the Service–Domain–Repository pattern:

```
Application Service
  │
  │  passes current data
  ▼
Domain Model
  │  applies business rules
  │  returns updated data (new object)
  ▼
Application Service
  │  passes updated data to Repository
  ▼
Repository (persists)
```

The domain model **never** reads from or writes to the database. The Application Service is responsible for loading current data before calling the domain, and persisting the result after.

---

## Domain Function Rules

### Purity

Every domain function must be a **pure function**:

- **No I/O** — No database queries, no HTTP requests, no file system access, no logging.
- **No mutation** — Never modify the input data. Always return a new object with the changes applied.
- **Deterministic** — Same inputs always produce the same outputs.
- **No framework dependencies** — No imports from Prisma, Next.js, Supabase, Stripe, or any infrastructure library.

```typescript
// ✗ BAD — Mutates input, performs I/O
function updateProfile(profile: Profile, newName: string): void {
  profile.displayName = newName;  // Mutates input
  await prisma.profile.update({ ... }); // I/O
}

// ✓ GOOD — Pure transformation, returns new data
function updateProfileName(profile: Profile, newName: string): Profile {
  return {
    ...profile,
    displayName: newName,
  };
}
```

### Input and Output Types

Domain functions receive and return **domain types only** — never Prisma types, API request/response types, or framework-specific types. The repository maps between domain types and Prisma types; the API route handler maps between domain types and HTTP request/response shapes.

```typescript
// ✗ BAD — Uses Prisma type
import type { Profile as PrismaProfile } from '@prisma/client';
function updateName(profile: PrismaProfile, name: string): PrismaProfile { ... }

// ✓ GOOD — Uses domain type
import type { Profile } from './profileTypes';
function updateName(profile: Profile, name: string): Profile { ... }
```

### Return Updated Data, Not Deltas

Domain functions return the **complete updated record**, not a partial diff or a list of changes. The Application Service passes this complete record to the Repository for persistence.

```typescript
// ✗ BAD — Returns only what changed
function updateName(profile: Profile, name: string): { displayName: string } {
  return { displayName: name };
}

// ✓ GOOD — Returns complete updated record
function updateName(profile: Profile, name: string): Profile {
  return { ...profile, displayName: name };
}
```

### Version Passthrough

Domain functions receive the current `version` as part of the input data and pass it through unchanged in the output. The domain does **not** increment the version — that is the Repository's responsibility during the optimistic locking write.

```typescript
function updateName(profile: Profile, name: string): Profile {
  return {
    ...profile,           // version passes through unchanged
    displayName: name,
  };
}
```

### Validation in the Domain

The domain is responsible for enforcing **business rule validation** — rules that derive from the problem domain rather than input sanitisation. Examples:

- A plan cannot be archived if it has active rooms.
- A roof height must be between 1.0 and 10.0 metres.
- A room's floor area equals width × length (calculation, not user input).

Business rule violations are communicated by throwing a **domain error**:

```typescript
// src/lib/errors.ts
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
```

```typescript
// In domain function
import { DomainError } from '@/lib/errors';

function setRoofHeight(plan: Plan, roofHeight: number): Plan {
  if (roofHeight < 1.0 || roofHeight > 10.0) {
    throw new DomainError('Roof height must be between 1.0 and 10.0 metres');
  }
  return { ...plan, roofHeight };
}
```

The Application Service catches `DomainError` and maps it to the appropriate HTTP response (typically `400 Bad Request`).

**Input sanitisation** (e.g. checking types, trimming strings, rejecting missing fields) belongs in the Application Service, not the domain. The domain assumes it receives well-typed, sanitised data.

---

## Domain Types

### Ownership

Each module owns its domain types. Domain types are defined in the module's own type file:

```
src/
  modules/
    profile/
      profileDomain.ts       # Domain functions
      profileTypes.ts         # Domain types for this module
    core/
      domain/
        planDomain.ts         # Domain functions
        roomDomain.ts         # Domain functions
        coreTypes.ts          # Domain types for this module
```

### Type Design

Domain types represent the business entity as the application understands it — not as the database stores it:

```typescript
// src/modules/profile/profileTypes.ts

export interface Profile {
  id: string;
  supabaseUserId: string;
  displayName: string;
  email: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProfileInput {
  supabaseUserId: string;
  displayName: string;
  email: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  email?: string;
}
```

### Enumerated Values

Use TypeScript union types or enums for type-safe enumerated values in domain code. The repository maps between the domain type and the raw string stored in the database:

```typescript
// Domain type — type-safe
export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface Plan {
  id: string;
  status: PlanStatus;
  // ...
}
```

---

## File Organisation

### File Location

Domain files live inside the module they belong to:

```
src/
  modules/
    profile/
      profileDomain.ts           # Domain functions
      profileTypes.ts            # Domain types
      profileService.ts          # Application Service (uses domain)
      profileRepository.ts       # Repository (maps domain ↔ database)
    core/
      domain/
        planDomain.ts            # Domain functions for plans
        roomDomain.ts            # Domain functions for rooms
      coreTypes.ts               # Domain types for core module
      services/
        analyseService.ts        # Application Service
      repositories/
        planRepository.ts
        roomRepository.ts
```

### File Naming

| File | Convention | Example |
|------|-----------|---------|
| Domain functions | `[entity]Domain.ts` | `profileDomain.ts`, `planDomain.ts` |
| Domain types | `[module]Types.ts` or `[entity]Types.ts` | `profileTypes.ts`, `coreTypes.ts` |

### Function Naming

Domain functions are named after the **business action** they perform, not the technical operation:

```typescript
// ✗ BAD — Technical/infrastructure naming
function setField(profile: Profile, field: string, value: string): Profile { ... }

// ✓ GOOD — Business action naming
function updateDisplayName(profile: Profile, newName: string): Profile { ... }
function calculateFloorArea(room: Room): Room { ... }
function archivePlan(plan: Plan): Plan { ... }
```

### Export Style

Domain functions use **named exports** — one function per export. Do not wrap domain functions in a class unless shared state is required (it almost never is).

```typescript
// ✗ BAD — Class with no shared state
export class ProfileDomain {
  updateName(profile: Profile, name: string): Profile { ... }
}

// ✓ GOOD — Named exports
export function updateName(profile: Profile, name: string): Profile { ... }
export function updateEmail(profile: Profile, email: string): Profile { ... }
```

---

## Domain Testing

Domain functions are the easiest layer to test because they are pure — no mocking required.

### Test Location

Tests live in a `__tests__` folder next to the domain file:

```
src/
  modules/
    profile/
      profileDomain.ts
      __tests__/
        profileDomain.test.ts
    core/
      domain/
        planDomain.ts
        __tests__/
          planDomain.test.ts
```

### Test Approach

- **No mocks** — Domain functions have no dependencies to mock.
- **Input → output** — Every test provides input data and asserts on the returned output.
- **Cover business rules** — Every business rule enforced by the domain must have at least one test proving it works and at least one test proving it rejects invalid input.
- **Cover edge cases** — Boundary values, empty collections, maximum sizes.

```typescript
import { updateName } from '../profileDomain';
import { DomainError } from '@/lib/errors';

describe('updateName', () => {
  const baseProfile: Profile = {
    id: 'p-1',
    supabaseUserId: 'su-1',
    displayName: 'Original',
    email: 'test@example.com',
    version: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('returns a new profile with the updated name', () => {
    const result = updateName(baseProfile, 'New Name');
    expect(result.displayName).toBe('New Name');
    expect(result.id).toBe(baseProfile.id);
    expect(result.version).toBe(baseProfile.version); // unchanged
  });

  it('does not mutate the original profile', () => {
    const result = updateName(baseProfile, 'New Name');
    expect(baseProfile.displayName).toBe('Original');
    expect(result).not.toBe(baseProfile);
  });
});
```

### What to Test

| Concern | Example |
|---------|---------|
| **Happy path** | Valid input produces correct output |
| **Business rule enforcement** | Invalid state throws `DomainError` |
| **Immutability** | Input object is not modified |
| **Version passthrough** | Version in output matches version in input |
| **Calculations** | Computed fields are correct (e.g. floor area = width × length) |
| **Edge cases** | Boundary values, empty arrays, null-safe handling |

---

## Dependency Rules

The domain layer has the strictest dependency constraints in the system:

| May import from | Must not import from |
|----------------|---------------------|
| Its own module's types file | Prisma (`@prisma/client`) |
| Shared domain error classes (`@/lib/errors`) | Repository files |
| Shared constants (`@/constants/`) | Application Service files |
| Standard TypeScript / JavaScript | Next.js (`next/*`) |
| | Supabase SDK |
| | Stripe SDK |
| | Any I/O or network library |

If a domain function needs data from another module, the Application Service must fetch it and pass it in as a parameter — the domain never reaches out for data itself.

---

## Review Checklist

Before considering domain code complete:

- [ ] Every domain function is a pure function — no I/O, no side effects, no mutation of inputs.
- [ ] Domain functions return complete updated records, not partial diffs.
- [ ] Domain functions receive and return domain types only — no Prisma types, no API types.
- [ ] The `version` field passes through unchanged (not incremented by the domain).
- [ ] Business rule violations throw `DomainError` with a descriptive message.
- [ ] No imports from Prisma, Next.js, Supabase, Stripe, or any infrastructure library.
- [ ] Domain types are defined in the module's own types file.
- [ ] Enumerated values use TypeScript union types or enums, not raw strings.
- [ ] Functions are named after business actions, not technical operations.
- [ ] Named exports are used (no unnecessary classes).
- [ ] Unit tests exist in a `__tests__` folder next to the domain file.
- [ ] Tests cover happy paths, business rule enforcement, immutability, version passthrough, and edge cases.
- [ ] No mocks are used in domain tests.
```
