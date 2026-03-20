```markdown
# Implement Service and Domain

## Purpose

Guide the implementation of the domain model and application service layers for a feature. This prompt covers: domain types, pure domain functions (business rules), input validation utilities, and application service methods that orchestrate domain and persistence calls.

## Required Reading

Before implementing domain and service code, review the following instruction files **in order**:

1. **`.github/instructions/domain.instructions.md`** — Primary reference for the domain layer. Defines purity rules (no I/O, no mutation), domain type conventions, domain error classes, function naming, export style, file organisation, and domain unit test requirements. Follow this file exactly.
2. **`.github/instructions/applicationService.instructions.md`** — Primary reference for the application service layer. Defines the service method structure, input validation and sanitisation rules, threat checking, authorisation pattern, optimistic locking orchestration, error classes, cross-module coordination, and service test requirements. Follow this file exactly.
3. **`.github/instructions/architecture.instructions.md`** — Defines the overall Service–Domain–Repository pattern, layer rules (what each layer may and must not depend on), module boundaries, and the data-flow walkthrough. Every implementation decision must conform to this architecture.
4. **`.github/instructions/persistence.instructions.md`** — Defines the repository interfaces the application service will call. Understanding what the repositories provide is essential for writing correct orchestration code.
5. **`.github/instructions/codingStandard.instructions.md`** — Supplies naming conventions (camelCase files, PascalCase types, camelCase functions), TypeScript rules, and project structure.

## Steps

### Phase 1 — Understand the Requirements

1. Read each instruction file listed above.
2. Read the **application design document** for this feature (in `./design/application/`). Focus on:
   - The **Business Rules Implementation** table — maps each rule to a module and function.
   - The **Sequence Diagrams** — shows the data flow through service → domain → repository.
   - The **Data Model** section — defines the domain types to implement.
   - The **Error Handling Strategy** table — maps each exception to its detection point and error type.
3. Read the **use case** for this feature. Identify every business rule, alternative flow, and exception flow that the domain and service must enforce.
4. Read the **feature file** to understand the acceptance criteria — particularly the edge cases and error scenarios.
5. Read the **existing repository files** for tables this feature uses, to understand what data the service can load and persist.

### Phase 2 — Define Domain Types

6. Identify every entity the domain needs to represent. Check whether types already exist in the module's types file — do not duplicate.
7. For new entities, define domain type interfaces in the module's types file (e.g., `src/modules/core/coreTypes.ts` or `src/modules/profile/profileTypes.ts`):
   - Use `PascalCase` for interface names.
   - Include `id`, `version`, `createdAt`, `updatedAt` on every persisted entity type.
   - Use TypeScript union types for enumerated values (not raw `string`).
   - Define separate `Create[Entity]Input` and `Update[Entity]Input` types for write operations.
8. Verify the domain types are independent of Prisma types — no imports from `@prisma/client`.

### Phase 3 — Implement Domain Functions

9. Create or update the domain file for the entity (e.g., `src/modules/core/domain/planDomain.ts`).
10. For each business rule in the use case's **Business Rules** section and the design's **Business Rules Implementation** table, implement a domain function:
    - Name the function after the **business action** (e.g., `archivePlan`, `calculateFloorArea`, `assignRoofHeight`).
    - Accept the current entity and any additional inputs as parameters.
    - Apply the business rule.
    - Return the **complete updated entity** as a new object — never mutate the input.
    - The `version` field passes through unchanged.
    - Throw `DomainError` (from `@/lib/errors`) when a business rule is violated.
11. Implement any **calculation functions** as pure functions (e.g., `calculateWallArea(length, height)` in `src/lib/`).
12. Use **named exports** — no wrapping classes unless shared state is genuinely required.
13. Verify every function:
    - Has no imports from Prisma, Next.js, Supabase, Stripe, or any I/O library.
    - Returns a new object — does not mutate the input.
    - Returns the complete entity, not a partial set of fields.

### Phase 4 — Write Domain Unit Tests

14. Create a test file at `src/modules/[module]/domain/__tests__/[entity]Domain.test.ts` (or alongside the domain file).
15. For each domain function, write tests covering:
    - **Happy path** — valid inputs produce the correct output.
    - **Business rule enforcement** — invalid inputs throw `DomainError` with a descriptive message.
    - **Immutability** — the input object is not modified (assert `input.field === originalValue` after calling the function).
    - **Version passthrough** — the version in the output equals the version in the input.
    - **Calculations** — computed fields are mathematically correct.
    - **Edge cases** — boundary values, empty arrays, minimum/maximum inputs.
16. Run domain tests:
    ```bash
    npx jest --testPathPattern='domain'
    ```
17. Fix all failures before proceeding.

### Phase 5 — Implement Validation Utilities

18. Identify every input field the application service will receive. For each field, determine:
    - Required or optional?
    - Type (string, number, boolean, UUID, email, etc.)?
    - String: maximum length? Needs HTML stripping?
    - Number: positive only? Range constraints?
19. Add or extend validation helper functions in `src/lib/validation.ts`:
    - `sanitiseString(value, maxLength)` — trims, strip HTML, checks length.
    - `validatePositiveNumber(value, fieldName)` — type-checks and range-checks.
    - `validateEmail(value)` — format validation.
    - `validateUuid(value)` — format validation.
    - Use `ValidationError` (from `@/lib/errors`) for all failures.
20. Create a dedicated per-input validation function for each service method's input shape (e.g., `validateUpdatePlanInput(input)`). This function:
    - Extracts only known fields (never spreads the raw input).
    - Calls the appropriate validation helpers for each field.
    - Returns a clean, typed, sanitised input object.

### Phase 6 — Implement Application Services

21. Create or update the application service file for the module (e.g., `src/modules/core/services/analyseService.ts`).
22. For each use case flow (main, alternative, exception) implement a service function following the standard structure **in this exact order**:

    ```
    1. Validate & sanitise all input
    2. Load current state from repository
    3. Authorise (verify ownership / entitlement)
    4. Call domain function(s) with current state + sanitised input
    5. Persist updated state via repository (passing expectedVersion)
    6. Return result
    ```

23. Enforce these rules for every service function:
    - **`userId` comes from the verified JWT** — never from the request body.
    - **Validate first** — no repository or domain call happens before input is validated.
    - **Never spread raw input** — only pass explicitly extracted, validated fields.
    - **Throw `NotFoundError`** when a required record is not found.
    - **Throw `AuthorisationError`** when the user does not own or cannot access the resource.
    - **Let `ConcurrencyError` propagate** — do not catch it in the service.
    - **Let `DomainError` propagate** — do not catch it in the service.
    - **No Prisma imports** — all database access goes through repository functions.
    - **No HTTP / Next.js imports** — the service is framework-agnostic.

24. For use cases that span multiple modules, import the other module's service or repository as needed and coordinate in the owning module's service.

### Phase 7 — Write Application Service Unit Tests

25. Create a test file at `src/modules/[module]/services/__tests__/[name]Service.test.ts` (or alongside the service file).
26. Mock all repository imports and domain function imports using `jest.mock()`.
27. For each service function, write tests covering:
    - **Validation runs first** — confirm the repository is never called when input is invalid.
    - **Validation rejects bad data** — wrong type, missing required fields, strings too long, HTML injection attempts.
    - **Not found handling** — `NotFoundError` when repository returns `null`.
    - **Authorisation** — `AuthorisationError` when the resource belongs to a different user.
    - **Domain receives correct data** — assert domain mock was called with the right current state and sanitised input.
    - **Repository receives correct data and version** — assert the update mock was called with the domain result and the loaded record's version.
    - **Error propagation** — `ConcurrencyError` and `DomainError` propagate to the caller.
28. Run service tests:
    ```bash
    npx jest --testPathPattern='Service'
    ```
29. Fix all failures before proceeding.

### Phase 8 — Verify End-to-End Wiring

30. Confirm the API route handler (in `src/app/api/`) correctly:
    - Calls `authService.verifyToken(request)` and passes the resulting `userId` to the service.
    - Passes the raw request body to the service (not pre-processed).
    - Catches `ValidationError` → returns `400`.
    - Catches `NotFoundError` → returns `404`.
    - Catches `AuthorisationError` → returns `403`.
    - Catches `ConcurrencyError` → returns `409`.
    - Catches unknown errors → returns `500` with a generic message.
31. Trace the full data flow from API route → service → domain → repository for the main use case flow and confirm each handoff is correct.

## Key Rules

- **Domain functions are pure.** No I/O, no mutation, no infrastructure imports. Same input always gives same output.
- **Service validates everything.** Input is sanitised before any domain or repository call.
- **userId from JWT only.** Never trust the client to supply their own identity.
- **One layer, one job.** Business rules live in the domain. Orchestration lives in the service. Data access lives in repositories.
- **Complete records, not diffs.** Domain functions return the full updated entity.
- **Version passes through the domain unchanged.** Only the repository increments it.
- **Errors propagate.** `ConcurrencyError` and `DomainError` are not caught by the service — the API route handler deals with them.
- **No Prisma in services or domain.** All database access goes through repositories.
- **Tests are layer-appropriate.** Domain tests have zero mocks. Service tests mock repos and domain.

## Inputs

When invoking this prompt, provide:

- **Use case** — Path to the use case file (e.g., `specification/useCases/user/analyseFloorPlan.md`).
- **Application design document** — Path to the design doc (e.g., `design/application/analyseFloorPlan.md`).
- **Module** — Which module owns this feature (e.g., `core`, `profile`).
- **Feature file** *(optional)* — Path to the Gherkin feature file for additional acceptance criteria detail.
- **Scope** *(optional)* — Limit to a subset if needed (e.g., "domain only", "service only", "validation utilities only").
- **Additional context** *(optional)* — Any constraints, pre-existing types, or implementation decisions already made.
```
