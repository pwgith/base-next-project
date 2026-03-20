# Project Instructions

## Purpose

This is the master instruction file. It explains how all project instruction files fit together, when to use each one, and the order in which work should proceed. **Read this file first before doing any work on the project.**

---

## Before You Start — Required Reading

Before beginning **any** task, confirm you have read and understood the relevant instruction files. Follow this protocol:

1. **Always read this file first** to understand which instructions apply to your task.
2. **Read every instruction file listed as relevant** to the task at hand (see the table and workflow below).
3. **Confirm** that you have read and understood the applicable instructions before writing any output. State which files you have read by name.

> **AI agents**: Before starting work, list the instruction files you have read and briefly confirm your understanding of the key rules from each. Do not begin producing deliverables until this confirmation step is complete.

---

## Instruction Files

All instruction files live in `.github/instructions/`. Each file covers a specific concern:

| File | Purpose | When to use |
|---|---|---|
| `instructions.md` | **This file.** Master index and workflow guide. | Always — read first for every task. |
| `architecture.instructions.md` | System architecture — layered design (Service–Domain–Repository), module boundaries (Auth, Profile, Subscription, Core), authentication flow (Supabase), persistence strategy (Prisma, optimistic locking), payment integration (Stripe), environment variables, and error handling. | Any task that involves building, designing, or reviewing application code or application design documents. |
| `codingStandard.instructions.md` | Naming conventions, TypeScript rules, project structure, imports, testing, git, linting, and all general coding practices. | Any task that involves writing or reviewing code, creating files, or naming anything. |
| `uiDesign.instructions.md` | Design system — Tailwind component classes, colour palette, typography, spacing, responsive breakpoints, animations, and HTML mockup requirements. | Designing UI, creating mockups, building front-end components, or reviewing visual output. |
| `useCase.instructions.md` | Use case authoring — template, structure, actor definitions, ID scheme, traceability to features and UI mockups. | Writing, reviewing, or updating use cases. |
| `feature.instructions.md` | Gherkin feature file authoring — scenario writing, specification by example, unique IDs, traceability back to use cases, file organisation. | Writing, reviewing, or updating feature/scenario specifications. |
| `next.js.instructions.md` | Next.js best practices — App Router, Server/Client Components, data fetching, API routes, metadata, middleware, performance, security, deployment. | Building or reviewing Next.js application code. |
| `applicationDesign.instructions.md` | Application design document format — template, writing guidelines, diagram conventions, review checklist. | Creating or reviewing feature-level application design documents in `./design/application/`. |
| `databaseDesign.instructions.md` | Database schema design — Mermaid diagram conventions, table definitions, change log, and human-approval workflow. The schema document must be updated and approved before any database change is implemented. | Any task that adds or modifies database tables, columns, relationships, or constraints. |
| `persistence.instructions.md` | Persistence layer — Prisma schema rules (no enums, optimistic locking), repository pattern, database synchronisation workflow, pre-go-live reset strategy, domain–database mapping, seed file conventions, repository integration tests. | Implementing or modifying the persistence layer — repositories, Prisma schema, seed files, database resets. |
| `domain.instructions.md` | Domain model — pure business logic functions, no I/O, immutable transformations, domain types, domain errors, domain unit testing. | Implementing or modifying domain logic — business rule functions, domain types, domain tests. |
| `applicationService.instructions.md` | Application service layer — orchestration of domain and persistence, input validation and sanitisation, threat checking, authorisation, optimistic locking workflow, error translation, service testing. | Implementing or modifying application services that coordinate use cases. |
| `api.instructions.md` | API design and implementation — two classes of API (UI API using Supabase JWT, Public REST API using OAuth 2.0), folder structure, REST conventions, response envelopes, error handling, versioning, pagination, DTOs, and security controls. | Creating or modifying any API route handler under `src/app/api/`. |
| `openApiSpec.instructions.md` | OpenAPI specification authoring — folder structure, naming, schema organisation, response envelope mapping, authentication documentation, binary response handling, and review checklist for `specification/openApiSpecs/`. | Creating or updating OpenAPI spec files that document the Public REST API. |
| `ui.instructions.md` | UI implementation — server vs client component boundaries, form state machine, calling UI APIs from client components, loading and error states, accessibility requirements, design system usage. | Building or modifying UI pages and components. |
| `businessTest.instructions.md` | Business test architecture — four-layer model, Cucumber/Playwright conventions, step definitions, Application class, Page Objects, integration tests. | Writing or reviewing Cucumber + Playwright business tests. |
| `apiSpecTest.instructions.md` | API spec integration tests — Jest tests under `test/api-spec/` that validate the running API conforms to the OpenAPI specs. No mocks, real HTTP requests, response shape validation. | Writing or reviewing API spec integration tests. |

---

## Project Structure Overview

```
.github/
  instructions/             # All instruction files (this folder)
specification/
  useCases/                 # Use case documents grouped by actor
  features/                 # Gherkin feature files grouped by area
design/
  application/              # Application design documents
  database/                 # Database schema design
  ui/                       # HTML mockups (one per UI page)
src/                        # Application source code (Next.js)
```

---

## Workflow — How the Instructions Fit Together

Work flows through these phases. Each phase has a primary instruction file, but the coding standard applies at all times.

### Phase 1: Specification

**Goal**: Define what the system should do.

1. **Define actors** — Create `specification/useCases/actors.md` listing all user types.
   - Follow: `useCase.instructions.md`

2. **Write use cases** — One file per use case, grouped by actor under `specification/useCases/`.
   - Follow: `useCase.instructions.md`, `codingStandard.instructions.md` (file naming)

3. **Write feature files** — Translate use cases into Gherkin scenarios under `specification/features/`.
   - Follow: `feature.instructions.md`, `useCase.instructions.md` (for traceability IDs)
   - Back-link feature/scenario IDs into the originating use cases.

### Phase 2: Design

**Goal**: Define what the system looks like.

4. **Create UI mockups** — One self-contained HTML file per page under `design/ui/`.
   - Follow: `uiDesign.instructions.md`, `codingStandard.instructions.md` (file naming)
   - Link mockups from the relevant use cases (`## UI Reference` section).

### Phase 2.5: Application Design

**Goal**: Translate specification and UI mockups into a concrete technical plan.

4b. **Create application design documents** — One document per feature area under `design/application/`.
   - Follow: `architecture.instructions.md` (system-wide constraints), `applicationDesign.instructions.md` (document format)
   - Reference use cases, feature files, and UI mockups.

4c. **Update database schema design** — If the feature requires database changes, update `design/database/schema.md`.
   - Prompt: `createDatabaseDesign.md`
   - Follow: `databaseDesign.instructions.md`, `architecture.instructions.md` (persistence strategy)
   - **Stop and get human approval** before proceeding to implementation.

### Phase 3: Implementation

**Goal**: Build the system — persistence first, then domain/service, then UI.

5a. **Implement the persistence layer** — Update `schema.prisma`, reset the database, update seed data, create/update repositories and integration tests.
   - Prompt: `implementPersistence.md`
   - Prerequisite: database schema design approved.
   - Follow: `persistence.instructions.md`, `databaseDesign.instructions.md`

5b. **Implement the domain and service layers** — Define domain types, implement pure domain functions, write validation utilities, implement application service methods, write domain unit tests and service unit tests.
   - Prompt: `implementServiceDomain.md`
   - Prerequisite: persistence layer in place.
   - Follow: `domain.instructions.md`, `applicationService.instructions.md`, `architecture.instructions.md`

5c. **Build the Next.js UI and API routes** — Implement pages, components, hooks, and API route handlers.
   - Prompt: `implementFeature.md`
   - Prerequisite: domain and service layers complete.
   - Follow: `api.instructions.md`, `ui.instructions.md`, `architecture.instructions.md`, `next.js.instructions.md`, `codingStandard.instructions.md`, `uiDesign.instructions.md`

### Phase 4: Verification

**Goal**: Confirm the system works as specified.

6. **Test against feature files** — Use the Gherkin scenarios as the acceptance criteria.
   - Follow: `feature.instructions.md`, `codingStandard.instructions.md` (testing section)

### Phase 5: API Documentation

**Goal**: Document the Public REST API surface with OpenAPI specs.

7. **Create or update OpenAPI specs** — After routes are implemented and tested, document them under `specification/openApiSpecs/`.
   - Prompt: `createOpenApiSpec.md`
   - Prerequisite: route handlers implemented and passing business tests.
   - Follow: `openApiSpec.instructions.md`, `api.instructions.md`

### Phase 6: API Spec Testing

**Goal**: Verify the running API conforms to the OpenAPI specifications.

8. **Write API spec integration tests** — Jest tests under `test/api-spec/` that make real HTTP requests and validate responses against the OpenAPI spec.
   - Prompt: `createApiSpecTests.md`
   - Prerequisite: OpenAPI specs written (Phase 5).
   - Follow: `apiSpecTest.instructions.md`, `openApiSpec.instructions.md`, `api.instructions.md`

---

## Prompts

Prompts live in `.github/prompts/` and provide step-by-step guidance for each task. Use the matching prompt when starting work on a task type:

| Task | Prompt |
|------|--------|
| Write a use case | `createUseCase.md` |
| Write a Gherkin feature file | `createFeature.md` |
| Create a UI mockup | `createUiDesign.md` |
| Create an application design document | `createApplicationDesign.md` |
| Design or update the database schema | `createDatabaseDesign.md` |
| Implement the persistence layer | `implementPersistence.md` |
| Implement domain and application service | `implementServiceDomain.md` |
| Implement a full feature (UI + API + tests) | `implementFeature.md` |
| Write Cucumber + Playwright business tests | `createBusinessTests.md` |
| Create or update OpenAPI specs | `createOpenApiSpec.md` |
| Write API spec integration tests | `createApiSpecTests.md` |

---

## Which Instructions Apply to Each Task?

| Task | Required reading |
|---|---|
| Writing a use case | `useCase.instructions.md`, `codingStandard.instructions.md` |
| Writing feature/scenario files | `feature.instructions.md`, `useCase.instructions.md`, `codingStandard.instructions.md` |
| Creating a UI mockup | `uiDesign.instructions.md`, `codingStandard.instructions.md` |
| Creating an application design | `architecture.instructions.md`, `applicationDesign.instructions.md`, `codingStandard.instructions.md` |
| Changing the database schema | `databaseDesign.instructions.md`, `persistence.instructions.md`, `architecture.instructions.md` |
| Building a page or component | `architecture.instructions.md`, `next.js.instructions.md`, `codingStandard.instructions.md`, `uiDesign.instructions.md` |
| Implementing domain logic | `domain.instructions.md`, `architecture.instructions.md`, `codingStandard.instructions.md` |
| Implementing an application service | `applicationService.instructions.md`, `domain.instructions.md`, `persistence.instructions.md`, `architecture.instructions.md`, `codingStandard.instructions.md` |
| Creating an API route | `architecture.instructions.md`, `applicationService.instructions.md`, `persistence.instructions.md`, `next.js.instructions.md`, `codingStandard.instructions.md` |
| Writing tests | `architecture.instructions.md`, `businessTest.instructions.md`, `codingStandard.instructions.md`, `feature.instructions.md` |
| Writing OpenAPI specs | `openApiSpec.instructions.md`, `api.instructions.md`, `codingStandard.instructions.md` |
| Writing API spec tests | `apiSpecTest.instructions.md`, `openApiSpec.instructions.md`, `api.instructions.md`, `codingStandard.instructions.md` |
| Reviewing any deliverable | All files relevant to the deliverable type |
| Starting a new task (any) | `instructions.md` (this file) + applicable files from above |

---

## Key Rules (Quick Reference)

These rules come from the individual instruction files. Refer to the source file for full detail.

- **File naming**: camelCase everywhere (`codingStandard.instructions.md`).
- **One file per concern**: one use case per file, one feature per logical group, one mockup per page.
- **Traceability**: use cases link to features (IDs), features link back to use cases (tags), mockups are referenced from use cases.
- **Specification by example**: Gherkin scenarios use concrete values, test one behaviour, stay lean.
- **Architecture first**: all implementation must conform to the layered Service–Domain–Repository pattern and module boundaries (`architecture.instructions.md`).
- **Database changes require approval**: update the schema design document and get human sign-off before implementing any database change (`databaseDesign.instructions.md`).
- **Domain functions are pure**: no I/O, no mutation, no infrastructure imports — receive data, apply rules, return new data (`domain.instructions.md`).
- **Application services validate everything**: all input is sanitised, type-checked, length-limited, and stripped of HTML before reaching the domain or database (`applicationService.instructions.md`).
- **No Prisma enums**: use String columns with application-level validation instead (`persistence.instructions.md`).
- **Server Components by default**: only add `"use client"` when necessary (`next.js.instructions.md`).
- **Design system first**: use the defined Tailwind component classes; don't invent ad-hoc styles (`uiDesign.instructions.md`).
- **No application code in mockups**: HTML + Tailwind CDN + vanilla JS only (`uiDesign.instructions.md`).
- **Feature files ≤ 400 lines**: split if larger (`feature.instructions.md`).
- **Run Cucumber with `npx`, not `npm run`**: when passing `--tags` or any other CLI argument, invoke Cucumber directly via `npx tsx ./node_modules/@cucumber/cucumber/bin/cucumber-js --tags "@F-NNN"`. Using `npm run test:cucumber -- --tags ...` fails on Windows/PowerShell because npm does not reliably forward arguments containing `@` to the underlying script (`businessTest.instructions.md`).

---

## Adding New Instructions

When a new concern arises that doesn't fit an existing file:

1. Create a new `.instructions.md` file in `.github/instructions/`.
2. Use camelCase for the filename.
3. Add an entry to the table in this file with purpose and usage guidance.
4. Update the "Which Instructions Apply" matrix if needed.
