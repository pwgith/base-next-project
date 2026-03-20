# Persistence Instructions

## Overview

This document defines how the persistence layer is built and maintained. It covers the Prisma schema, repository classes, database synchronisation workflow, and the rules that ensure the persistence layer stays aligned with the database design document (`./design/database/schema.md`).

**Key principle**: The database schema design is approved first, then the Prisma schema and repository code are updated to match. Never modify `schema.prisma` without an approved `schema.md` change.

---

## Database Schema Synchronisation

### Workflow

1. **Update `./design/database/schema.md`** — Add or modify tables, columns, relationships, and constraints in the Mermaid diagram and table definitions section.
2. **Human review and approval** — The schema change must be reviewed and approved before any implementation proceeds. Record the approval in the schema document's change log.
3. **Update `prisma/schema.prisma`** — Modify the Prisma schema to match the approved database design exactly.
4. **Reset the database** — Run `npx prisma db push --force-reset` to nuke and recreate the database from the updated schema. Do **not** create migration files at this stage.
5. **Re-seed reference data** — Run `npx prisma db seed` to repopulate the `reference_data` table and any other seed data.
6. **Update or create repository classes** — Ensure every table has a corresponding repository with standard CRUD and optimistic locking methods.
7. **Update the schema document's change log** — Record the date, change description, and confirmation that Prisma and repositories are in sync.

### Pre-Go-Live Database Strategy

During development (pre-go-live), the database is treated as disposable:

- **No migration files** — Migrations add overhead and complexity that is not justified while the schema is still evolving. Do not run `npx prisma migrate`. Use `npx prisma db push --force-reset` instead.
- **Nuke and recreate on every schema change** — When the schema changes, destroy the database and rebuild it from scratch. All test data is lost — this is expected and acceptable.
- **Seed file is the source of reference data** — After every reset, `prisma/seed.ts` repopulates all reference data. Keep the seed file up to date with every schema change.
- **Post-go-live migration strategy** — Before launch, a proper migration history will be established. This decision is deferred until the schema stabilises.

### Commands

| Action | Command |
|--------|---------|
| Push schema and reset DB | `npx prisma db push --force-reset` |
| Seed reference data | `npx prisma db seed` |
| Generate Prisma Client | `npx prisma generate` |
| Open Prisma Studio | `npx prisma studio` |
| Full reset workflow | `npx prisma db push --force-reset && npx prisma db seed` |

---

## Prisma Schema Rules

### No Database Enums

Do **not** use Prisma `enum` types. Prisma's enum support is inconsistent across providers and causes issues with migrations, resets, and seeding.

Instead, represent enumerated values as:

- **`String` columns** in Prisma with application-level validation.
- **Reference data** in the `reference_data` table for values that need labels, sort orders, or active/inactive status.
- **Domain-level TypeScript union types or enums** for type safety in application code. The repository maps between the string stored in the database and the TypeScript type.

```prisma
// ✗ BAD — Do not use database enums
enum PlanStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

model Plan {
  id     String     @id @default(uuid())
  status PlanStatus
}

// ✓ GOOD — Use String with application-level validation
model Plan {
  id     String @id @default(uuid())
  status String // Validated in domain: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
}
```

### Optimistic Locking Column

Every mutable table must include:

```prisma
version   Int      @default(1)
```

This is enforced in the repository layer, not in Prisma middleware or hooks.

### Standard Column Conventions

Every mutable table must include:

```prisma
id        String   @id @default(uuid())
version   Int      @default(1)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

Immutable tables (e.g. `reference_data`) may omit `version` and `updatedAt`.

### Naming Conventions

| Concern | Convention | Example |
|---------|-----------|---------|
| Model name | PascalCase, singular | `Profile`, `ReferenceData` |
| Field name | camelCase | `supabaseUserId`, `sortOrder` |
| Table name (mapped) | snake_case via `@@map` | `@@map("reference_data")` |
| Column name (mapped) | snake_case via `@map` | `@map("supabase_user_id")` |
| Relation field | camelCase, descriptive | `profile`, `referenceItems` |

```prisma
model ReferenceData {
  id        String  @id @default(uuid())
  category  String
  code      String
  label     String
  sortOrder Int     @default(0) @map("sort_order")
  isActive  Boolean @default(true) @map("is_active")

  @@unique([category, code])
  @@map("reference_data")
}
```

---

## Repository Pattern

### One Repository Per Table

Each database table has a single repository class that owns all read and write access to that table. Repositories live under the module that owns the table:

```
src/
  modules/
    profile/
      profileRepository.ts
    core/
      repositories/
        planRepository.ts
        roomRepository.ts
```

### Repository Responsibilities

- **CRUD operations** — `findById`, `findMany`, `create`, `update`, `delete`.
- **Optimistic locking** — Every `update` and `delete` must verify the `version` column.
- **Domain ↔ database mapping** — Convert between Prisma-generated types and domain types.
- **Transaction management** — Use `prisma.$transaction()` for operations that span multiple writes.

### Repository Interface

Every repository must expose at minimum:

```typescript
interface Repository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput, expectedVersion: number): Promise<T>;
  delete(id: string, expectedVersion: number): Promise<void>;
}
```

### Optimistic Locking Implementation

Every write operation must follow this pattern:

```typescript
async update(
  id: string,
  data: UpdateProfileInput,
  expectedVersion: number
): Promise<Profile> {
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.profile.updateMany({
      where: {
        id,
        version: expectedVersion,
      },
      data: {
        ...data,
        version: expectedVersion + 1,
      },
    });

    if (updated.count === 0) {
      throw new ConcurrencyError(`Profile ${id} has been modified by another process`);
    }

    return tx.profile.findUniqueOrThrow({ where: { id } });
  });

  return mapToDomain(result);
}
```

### ConcurrencyError

Define a shared error class used by all repositories:

```typescript
// src/lib/errors.ts
export class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}
```

The API route handler catches this and returns HTTP `409 Conflict`.

---

## Domain ↔ Database Mapping

Repositories are responsible for mapping between Prisma-generated types and domain types. The domain model never sees Prisma types directly.

```typescript
// In the repository file
import type { Profile as PrismaProfile } from '@prisma/client';
import type { Profile } from '../profileDomain';

function mapToDomain(record: PrismaProfile): Profile {
  return {
    id: record.id,
    supabaseUserId: record.supabaseUserId,
    displayName: record.displayName,
    email: record.email,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapToCreateInput(domain: CreateProfileInput): Prisma.ProfileCreateInput {
  return {
    supabaseUserId: domain.supabaseUserId,
    displayName: domain.displayName,
    email: domain.email,
  };
}
```

---

## Reference Data Access

The `reference_data` table is read-only at runtime. Access is provided through a shared utility, not a full repository:

```typescript
// src/lib/referenceData.ts
export async function getReferenceData(category: string): Promise<ReferenceItem[]> {
  const items = await prisma.referenceData.findMany({
    where: { category, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return items.map(mapToReferenceItem);
}

export async function getReferenceItem(
  category: string,
  code: string
): Promise<ReferenceItem | null> {
  const item = await prisma.referenceData.findUnique({
    where: { category_code: { category, code } },
  });
  return item ? mapToReferenceItem(item) : null;
}
```

---

## Seed File

The seed file (`prisma/seed.ts`) populates all reference data and any baseline records needed for the application to function. It must be:

- **Idempotent** — Safe to run multiple times (use upserts, not inserts).
- **Complete** — After seeding, the application has all the reference data it needs to operate.
- **Version-controlled** — Changes to seed data are committed and reviewed like any other code change.

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Upsert reference data
  const referenceData = [
    { category: 'trade_type', code: 'PLUMBER', label: 'Plumber', sortOrder: 1 },
    { category: 'trade_type', code: 'ELECTRICIAN', label: 'Electrician', sortOrder: 2 },
    // ... more items
  ];

  for (const item of referenceData) {
    await prisma.referenceData.upsert({
      where: { category_code: { category: item.category, code: item.code } },
      update: { label: item.label, sortOrder: item.sortOrder, isActive: true },
      create: { ...item, isActive: true },
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Repository Integration Tests

Every repository must have integration tests that run against a **real database** — no mocking. These tests prove that CRUD operations, optimistic locking, and domain mapping work end-to-end with the actual Prisma schema.

### Folder Structure

Test files live in a `__tests__` folder inside the module's persistence folder, next to the repository they test:

```
src/
  modules/
    profile/
      profileRepository.ts
      __tests__/
        profileRepository.integration.test.ts
    core/
      repositories/
        planRepository.ts
        roomRepository.ts
        __tests__/
          planRepository.integration.test.ts
          roomRepository.integration.test.ts
```

### Dev-Only Database Guard

Repository integration tests **must only run against the development database**. They must **never** run against test or production databases. Every test file must verify the database environment before executing:

```typescript
// At the top of every repository integration test file
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function assertDevDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  // Adjust these patterns to match your project's connection string conventions
  if (
    databaseUrl.includes('prod') ||
    databaseUrl.includes('production') ||
    databaseUrl.includes('test') ||
    databaseUrl.includes('staging')
  ) {
    throw new Error(
      'Repository integration tests must only run against the dev database. ' +
      `Current DATABASE_URL appears to be non-dev: ${databaseUrl.substring(0, 50)}...`
    );
  }
}

beforeAll(() => {
  assertDevDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

### Test Data Cleanup

Every test must clean up after itself. Test data **must not** leak between tests or persist after the test run. Use `afterEach` to delete all records created during the test:

```typescript
afterEach(async () => {
  // Delete in reverse dependency order to respect foreign key constraints
  await prisma.room.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.profile.deleteMany();
});
```

**Rules:**

- Delete in reverse dependency order to avoid foreign key constraint violations.
- Use `deleteMany()` without a `where` clause to clean the table completely, or use a test-specific identifier to target only test records.
- Never rely on database resets or seed re-runs between tests — tests must be self-cleaning.
- If multiple tables are involved, wrap the cleanup in a transaction.

### What to Test

Each repository test file must cover:

| Concern | Example Test |
|---------|-------------|
| **Create** | Insert a record and verify all fields are persisted correctly |
| **Read** | Create a record, then retrieve it by ID and verify the domain mapping |
| **Update with correct version** | Create, then update with the matching version — verify fields and version increment |
| **Update with stale version** | Create, then update with a wrong version — verify `ConcurrencyError` is thrown |
| **Delete with correct version** | Create, then delete with the matching version — verify the record is removed |
| **Delete with stale version** | Create, then delete with a wrong version — verify `ConcurrencyError` is thrown |
| **Not found** | Attempt to read a non-existent ID — verify `null` is returned |
| **Domain mapping** | Verify the returned object matches the domain type, not the Prisma type |

### Test File Template

```typescript
import { PrismaClient } from '@prisma/client';
import { profileRepository } from '../profileRepository';
import { ConcurrencyError } from '@/lib/errors';

const prisma = new PrismaClient();

function assertDevDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  if (
    databaseUrl.includes('prod') ||
    databaseUrl.includes('production') ||
    databaseUrl.includes('test') ||
    databaseUrl.includes('staging')
  ) {
    throw new Error(
      'Repository integration tests must only run against the dev database. ' +
      `Current DATABASE_URL appears to be non-dev: ${databaseUrl.substring(0, 50)}...`
    );
  }
}

beforeAll(() => {
  assertDevDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  await prisma.profile.deleteMany();
});

describe('profileRepository', () => {
  it('creates a profile and returns the domain object', async () => {
    const profile = await profileRepository.create({
      supabaseUserId: 'test-supabase-id',
      displayName: 'Test User',
      email: 'test@example.com',
    });

    expect(profile.id).toBeDefined();
    expect(profile.supabaseUserId).toBe('test-supabase-id');
    expect(profile.displayName).toBe('Test User');
    expect(profile.version).toBe(1);
  });

  it('throws ConcurrencyError when updating with stale version', async () => {
    const profile = await profileRepository.create({
      supabaseUserId: 'test-supabase-id',
      displayName: 'Test User',
      email: 'test@example.com',
    });

    await expect(
      profileRepository.update(profile.id, { displayName: 'Updated' }, 999)
    ).rejects.toThrow(ConcurrencyError);
  });

  // ... more tests per the "What to Test" table above
});
```

### Running Repository Integration Tests

Run repository integration tests separately from unit tests to avoid accidentally hitting the database during fast unit test runs:

```bash
# Run all repository integration tests
npx jest --testPathPattern='__tests__/.*\\.integration\\.test\\.ts$'

# Run a specific repository's tests
npx jest --testPathPattern='profileRepository.integration.test'
```

### Key Rules

- **Real database, no mocks** — Tests use Prisma Client connected to the real development database.
- **Dev database only** — Every test file must include the `assertDevDatabase()` guard. Tests must refuse to run if the `DATABASE_URL` points to test, staging, or production.
- **Clean up after every test** — Use `afterEach` to remove all test data. No test data survives between tests.
- **No dependency on seed data** — Tests must create all the data they need. Do not assume seed data exists.
- **Integration test suffix** — Files must be named `*.integration.test.ts` to distinguish them from unit tests.
- **Foreign key order** — Clean up tables in reverse dependency order.

---

## Review Checklist

Before considering persistence changes complete:

- [ ] `./design/database/schema.md` has been updated and approved by a human.
- [ ] `prisma/schema.prisma` matches the approved schema document exactly.
- [ ] No `enum` types are used in the Prisma schema.
- [ ] Every mutable table has a `version` column with `@default(1)`.
- [ ] Every mutable table has `id`, `version`, `createdAt`, and `updatedAt` columns.
- [ ] Database has been reset: `npx prisma db push --force-reset`.
- [ ] Seed file has been updated and run: `npx prisma db seed`.
- [ ] A repository class exists for every table (or a shared utility for read-only tables).
- [ ] Every repository `update` and `delete` method enforces optimistic locking.
- [ ] Domain ↔ database mapping functions exist in the repository — domain types never reference Prisma types.
- [ ] `ConcurrencyError` is thrown on version mismatch and caught by API route handlers as `409 Conflict`.
- [ ] Table and column naming conventions are followed (PascalCase models, snake_case mapped names).
- [ ] The schema document's change log has been updated.
- [ ] Repository integration tests exist in a `__tests__` folder next to each repository.
- [ ] Every integration test file includes the `assertDevDatabase()` guard.
- [ ] Every integration test cleans up all test data in `afterEach`.
- [ ] Integration tests cover create, read, update (correct + stale version), delete (correct + stale version), not found, and domain mapping.
