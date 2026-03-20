# Create Application Design

## Purpose

Guide the creation of a high-level application design document that translates a feature's specification (use case, Gherkin feature file) and UI mockup into a concrete technical plan — covering modules, components, sequence diagrams, folder structure, data model, API design, authentication, secret management, and everything needed to begin implementation.

## Required Reading

Before creating an application design, review the following instruction files **in order**:

1. **`.github/instructions/architecture.instructions.md`** — Defines the overall system architecture: layered design (Service–Domain–Repository), module boundaries (Auth, Profile, Subscription, Core), authentication flow, persistence strategy (Prisma, optimistic locking), payment integration (Stripe), environment variables, and error handling. The feature design must conform to this architecture — use the prescribed layers, respect module boundaries, and follow the established patterns.
2. **`.github/instructions/applicationDesign.instructions.md`** — Primary reference for document format. Defines the application design document template, writing guidelines, diagram conventions, review checklist, and the `./design/application/` folder structure. Follow this file exactly.
3. **`.github/instructions/databaseDesign.instructions.md`** — Defines the database schema design workflow and the `./design/database/schema.md` source of truth. If the feature requires new or changed tables, the schema must be designed and approved here before the application design is finalised.
4. **`.github/instructions/persistence.instructions.md`** — Defines Prisma conventions, the repository-per-table pattern, optimistic locking implementation, domain ↔ database mapping, and the pre-go-live database sync workflow. Reference this when designing the Persistence Dependencies section of the application design.
5. **`.github/instructions/domain.instructions.md`** — Defines the domain model layer: pure business logic functions, immutability rules, domain types, domain errors, and testing. Reference this when designing the Business Rules Implementation section.
6. **`.github/instructions/applicationService.instructions.md`** — Defines the application service layer: input validation, threat checking, authorisation, orchestration of domain and persistence. Reference this when designing the API routes, data flow, and error handling.
7. **`.github/instructions/useCase.instructions.md`** — Describes use case structure, flows (main, alternative, exception), business rules, and postconditions. Every flow and rule must be accounted for in the design.
8. **`.github/instructions/feature.instructions.md`** — Describes the Gherkin feature format and traceability model. Use the scenarios and example data to understand the expected behaviour, edge cases, and acceptance criteria the design must support.
9. **`.github/instructions/uiDesign.instructions.md`** — Defines the design system, component classes, and responsive breakpoints. Study the HTML mockup to understand the UI structure, interactive states, and component decomposition.
10. **`.github/instructions/next.js.instructions.md`** — Defines App Router conventions, server/client boundaries, data fetching patterns, API routes, middleware, environment variables, and performance best practices. All architectural decisions must align with this file.
11. **`.github/instructions/codingStandard.instructions.md`** — Supplies naming conventions, TypeScript rules, project structure, import ordering, and error handling patterns. The design must follow these standards.
12. **`.github/instructions/businessTest.instructions.md`** — Defines the four-layer test architecture. Understanding the test layers helps inform the design — particularly the separation between business logic (testable in isolation) and UI orchestration (testable via Page Objects).

## Steps

### Phase 1 — Understand the Specification

1. Read each instruction file listed above.
2. Read the **use case** file provided as input. Identify the actor, main flow, alternative flows, exception flows, business rules, postconditions, and any notes about future extensibility.
3. Read the **feature file(s)** linked to the use case. Extract the scenarios, example data, and expected outcomes — these define the acceptance criteria the design must support.
4. Read the **HTML mockup** linked to the use case (in `./design/ui/`). Study:
   - The layout and component structure.
   - Interactive states (default, loading, result, error).
   - Form inputs, file uploads, dynamic content areas.
   - Responsive behaviour at mobile, tablet, and desktop breakpoints.
   - Any JavaScript interactions that hint at client-side state management.

### Phase 2 — Identify Architectural Concerns

5. Determine **authentication & authorisation** requirements:
   - Does the feature require the user to be logged in?
   - Are there role-based access controls?
   - If auth is needed, identify the auth method (session cookies, JWT, OAuth) and which routes need protection.
   - If no auth is required, note this explicitly in the design.

6. Determine **external service dependencies**:
   - Does the feature call an external API (e.g., AI/vision service, payment gateway)?
   - What libraries are needed for file generation, parsing, or processing?
   - For each dependency, identify authentication method, rate limits, and error handling.

7. Determine **secrets & environment variables**:
   - List every API key, secret, or configuration value the feature needs.
   - Classify each as server-only or client-exposed (`NEXT_PUBLIC_`).
   - Plan how secrets are stored and accessed (`.env.local`, validated via `src/lib/env.ts`).

8. Determine **data persistence** requirements:
   - Does the feature need a database, or is it stateless per request?
   - If new or changed tables are required, update `./design/database/schema.md` per `databaseDesign.instructions.md` and get approval **before** finalising this design.
   - Reference `persistence.instructions.md` for repository-per-table pattern, optimistic locking, and Prisma conventions.
   - Are analysis results cached or persisted?
   - Document any open questions about persistence.

### Phase 3 — Design the Architecture

9. **Map use case flows to modules:**
   - For each main flow step, identify which module (page, component, service, lib, API route) is responsible.
   - For each alternative flow, identify where it branches and what module handles it.
   - For each exception flow, identify where the error is detected and how it reaches the user.

10. **Design the component hierarchy:**
    - Decompose the UI mockup into a tree of React components.
    - Decide the server/client boundary — mark each component as Server or Client.
    - Push `"use client"` as low in the tree as possible.
    - Identify shared/reusable components that belong in `src/components/ui/`.

11. **Design the data model:**
    - Define TypeScript interfaces for the core domain objects.
    - Define request/response shapes for API routes.
    - Define error response shapes.

12. **Design the API routes:**
    - For each server-side operation, define the route path, HTTP method, request body, response shape, and error cases.
    - Keep route handlers thin — delegate to service modules.

13. **Design state management:**
    - Identify what client-side state the feature needs.
    - Map out state transitions (e.g., idle → uploading → analysing → results → error).
    - Decide where state lives (component state, context, URL params).

14. **Map business rules to modules:**
    - For every business rule in the use case, identify the module and function responsible for enforcing it.
    - Pure calculation logic goes in `src/lib/` for easy unit testing.
    - Constants (e.g., default values) go in `src/constants/`.

15. **Map error handling:**
    - For every exception flow, define: where the error is detected, what the user sees, and how it is implemented technically.
    - Include both client-side validation errors and server-side failures.

16. **Draw sequence diagrams:**
    - Create a Mermaid sequence diagram for the main flow showing the full data path from user action to displayed result.
    - Create additional diagrams for significant alternative or error flows.
    - Include all participants: User, Client Components, API Routes, Services, External APIs.

17. **Plan the folder structure:**
    - List every file to be created, organised per the project structure from the coding standard.
    - Include pages, components, hooks, services, lib, types, constants, and API routes.

### Phase 4 — Document the Design

18. Create the application design file under `./design/application/` using **camelCase** naming.
19. Populate the file using the full template from `applicationDesign.instructions.md`, filling in every section.
20. Set **Status** to `Draft` and use today's date for **Created** and **Last Updated**.
21. Document any **open questions** — unresolved technical decisions that need input before or during implementation.
22. Document any **assumptions and constraints** that affect the design.

### Phase 5 — Review

23. Run through the **review checklist** from `applicationDesign.instructions.md`:
    - Every use case flow is accounted for.
    - Every business rule is mapped to a module.
    - Sequence diagrams cover the main flow at minimum.
    - Folder structure lists every file.
    - Data model is defined.
    - API routes are documented.
    - Auth is addressed.
    - Secrets and env vars are listed.
    - External dependencies are documented.
    - State management is described.
    - Error handling covers every exception flow.
    - Open questions are captured.
24. Verify the design supports every scenario in the feature file — trace each scenario to the modules that implement it.
25. Verify the design aligns with the UI mockup — every visual element in the mockup should map to a component in the hierarchy.

## Key Rules

- **Design before implement.** The application design must exist before implementation code is written.
- **High-level, not line-by-line.** Describe modules and their responsibilities, not method implementations.
- **Every flow is accounted for.** Main, alternative, and exception flows from the use case must all appear in the design.
- **Every business rule is mapped.** The business rules table creates a direct trace from spec to code module.
- **Sequence diagrams are mandatory.** At least one covering the main flow.
- **Auth is always addressed.** Even if the answer is "none required."
- **Secrets are always documented.** Even if the answer is "none needed."
- **Open questions are welcome.** It is better to document unknowns than to make silent assumptions.
- **Use Mermaid for diagrams.** Keeps diagrams version-controlled and editable.
- **Follow project conventions.** Naming, structure, and patterns from the coding standard and Next.js instructions.

## Inputs

When invoking this prompt, provide:

- **Use case** — Path to the use case file (e.g., `specification/useCases/user/analyseFloorPlan.md`).
- **Feature file** *(optional)* — Path to the feature file if not discoverable from the use case's `## Features` table.
- **UI Mockup** *(optional)* — Path to the HTML mockup if not linked in the use case's `## UI Reference` section.
- **Scope** *(optional)* — Limit to specific concerns if you do not want the full design (e.g., "API design only", "component hierarchy only", "auth and secrets only").
- **Additional context** *(optional)* — Any extra technical constraints, infrastructure details, or decisions already made.
