```markdown
# Implement Persistence

## Purpose

Guide the implementation of the persistence layer for a feature — updating `schema.prisma`, resetting the database, updating seed data, and creating or modifying repository classes. This prompt is run **after** the database schema design has been approved.

## Required Reading

Before implementing persistence, review the following instruction files **in order**:

1. **`.github/instructions/persistence.instructions.md`** — Primary reference. Defines Prisma schema rules (no enums, optimistic locking, naming conventions), the repository pattern (one per table, CRUD + optimistic locking), domain ↔ database mapping, seed file conventions, repository integration test requirements, and the database synchronisation workflow. Follow this file exactly.
2. **`.github/instructions/databaseDesign.instructions.md`** — Defines the schema design document. The approved `./design/database/schema.md` is the source of truth — `schema.prisma` must match it exactly.
3. **`.github/instructions/architecture.instructions.md`** — Defines the overall persistence strategy: Prisma as the sole data access layer, optimistic locking on every mutable record, no Prisma types leaking into domain or service layers.
4. **`.github/instructions/domain.instructions.md`** — Defines domain types. Repositories map between Prisma types and domain types — understanding domain types is essential to writing correct mapping functions.
5. **`.github/instructions/codingStandard.instructions.md`** — Supplies naming conventions (PascalCase Prisma models, snake_case via `@map`/`@@map`, camelCase TypeScript) and project structure rules.

## Prerequisite

**The database schema design (`./design/database/schema.md`) must be approved before starting.** If it is not yet approved, use the `createDatabaseDesign.md` prompt first and obtain human sign-off before continuing here.

## Steps

### Phase 1 — Read the Approved Schema

1. Read each instruction file listed above.
2. Read the approved schema at `./design/database/schema.md`. This is the definitive specification — every table, column, type, and constraint must be faithfully reproduced in `schema.prisma`.
3. Read the **domain types** for the modules affected by this change (e.g. `src/modules/profile/profileTypes.ts`). Understand what the repositories will need to map to.
4. Read any **existing repository files** that will be modified, to understand current patterns before changing them.

### Phase 2 — Update the Prisma Schema

5. Open `prisma/schema.prisma`.
6. For each new or modified table in the approved schema:
   - Add or update the Prisma model to match the schema document exactly.
   - Use `PascalCase` for model names, `camelCase` for field names.
   - Map every model to its snake_case table name with `@@map("table_name")`.
   - Map every field to its snake_case column name with `@map("column_name")` where the camelCase and snake_case differ.
   - Use `String` for all enumerated value columns — **never use Prisma `enum`**.
   - Include `version Int @default(1)`, `createdAt DateTime @default(now())`, and `updatedAt DateTime @updatedAt` on every mutable model.
   - Define `@id`, `@unique`, `@@unique`, `@relation`, and `@default` decorators as required by the schema.
7. Verify that `schema.prisma` matches `schema.md` exactly — every column, type, constraint, and relationship.

### Phase 3 — Reset the Database

8. Run the full reset workflow:
   ```bash
   npx prisma db push --force-reset
   ```
9. Confirm the command completes without errors. If there are errors, fix the Prisma schema and repeat.
10. Run `npx prisma generate` to regenerate the Prisma Client.

### Phase 4 — Update the Seed File

11. Open `prisma/seed.ts`.
12. If this change introduces new `reference_data` entries, add upsert statements for each new item following the existing pattern.
13. If seed data for other tables is required (e.g. baseline records), add upserts — **never inserts** — so the seed is idempotent.
14. Run the seed file:
    ```bash
    npx prisma db seed
    ```
15. Confirm the seed completes without errors.

### Phase 5 — Create or Update Repository Classes

16. For each new table, create a repository file following the location convention:
    - Tables owned by the `profile` module → `src/modules/profile/[table]Repository.ts`
    - Tables owned by the `core` module → `src/modules/core/repositories/[table]Repository.ts`
    - Follow the pattern from `persistence.instructions.md` exactly.
17. For each repository, implement the standard interface:
    - `findById(id: string): Promise<T | null>`
    - `create(data: CreateInput): Promise<T>`
    - `update(id: string, data: UpdateInput, expectedVersion: number): Promise<T>` — with optimistic locking
    - `delete(id: string, expectedVersion: number): Promise<void>` — with optimistic locking
    - Additional query methods as needed by the application services (e.g. `findByUserId`, `findMany`).
18. Implement the optimistic locking pattern in every `update` and `delete`:
    - Use `updateMany` (or `deleteMany`) with `WHERE id = $id AND version = $expectedVersion`.
    - Increment `version` by 1 in the update data.
    - If `count === 0`, throw `ConcurrencyError`.
    - Wrap in a `prisma.$transaction()`.
19. Implement domain ↔ database mapping functions (`mapToDomain`, `mapToCreateInput`) in the repository file.
    - The return type of every public repository method must be a domain type — never a Prisma type.
    - No Prisma types leak out of the repository.
20. For existing repositories being modified, update mapping functions and queries to reflect schema changes.

### Phase 6 — Write Repository Integration Tests

21. Create a test file at `src/modules/[module]/[table]Repository/__tests__/[table]Repository.integration.test.ts` (or alongside the repository if using the flat module structure).
22. Follow the integration test rules from `persistence.instructions.md`:
    - Include the `assertDevDatabase()` guard at the top — the test must refuse to run against non-dev databases.
    - Use `afterAll` to disconnect Prisma.
    - Use `afterEach` to delete all test data in reverse foreign-key-dependency order.
    - Cover: create, read by ID, update with correct version, update with stale version (expect `ConcurrencyError`), delete with correct version, delete with stale version (expect `ConcurrencyError`), not found, domain mapping correctness.
23. Run the integration tests:
    ```bash
    npx jest --testPathPattern='\.integration\.test\.ts$'
    ```
24. Fix any failures before proceeding.

### Phase 7 — Update the Schema Document Change Log

25. Return to `./design/database/schema.md` and update the Change Log entry for this change:
    - Set the implementation date.
    - Note that `schema.prisma`, repositories, seed file, and integration tests are now in sync.

## Key Rules

- **Schema document first.** Never touch `schema.prisma` without an approved `schema.md` change.
- **Nuke and recreate.** Use `npx prisma db push --force-reset` — do not create migration files.
- **No Prisma enums.** Use `String` fields with application-level validation.
- **Optimistic locking on every write.** `update` and `delete` must check and increment `version`.
- **No Prisma types in public API.** All repository methods return domain types.
- **Dev database only for integration tests.** The `assertDevDatabase()` guard is mandatory.
- **Clean up after each test.** `afterEach` must delete all test data.
- **Seed is idempotent.** Use upserts, never raw inserts.

## Inputs

When invoking this prompt, provide:

- **Approved schema document** — Confirm that `./design/database/schema.md` has been approved (or provide the path if different).
- **Module** — Which module owns the new/changed tables (e.g., `profile`, `core`).
- **Tables affected** — List the tables being added or modified.
- **Domain types** *(optional)* — Path to the existing domain types file, if already defined.
- **Additional context** *(optional)* — Any constraints, special query requirements, or seeding notes.
```
