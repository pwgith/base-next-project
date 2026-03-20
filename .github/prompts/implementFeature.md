# Implement Feature

## Purpose

Guide the implementation of a feature in Next.js by translating the specification (use case, Gherkin feature file) and UI mockup into working application code, and then verifying it by creating and running Cucumber + Playwright business tests against the running application.

## Required Reading

Before implementing a feature, review the following instruction files **in order**:

1. **`.github/instructions/architecture.instructions.md`** — Defines the overall system architecture: layered design (Service–Domain–Repository), module boundaries (Auth, Profile, Subscription, Core), authentication flow, persistence strategy (Prisma, optimistic locking), payment integration (Stripe), environment variables, and error handling. Every implementation decision must conform to this architecture.
2. **`.github/instructions/applicationDesign.instructions.md`** — Defines the application design document format. Read the corresponding design document in `./design/application/` for this feature first — it contains the planned modules, component hierarchy, sequence diagrams, folder structure, data model, API design, auth approach, secrets, and error handling strategy. The implementation must follow this design.
3. **`.github/instructions/databaseDesign.instructions.md`** — Defines the database schema design workflow and the `./design/database/schema.md` source of truth. If this feature requires new or changed tables, verify the schema has been approved before implementing persistence code.
4. **`.github/instructions/persistence.instructions.md`** — Defines Prisma conventions, the repository-per-table pattern, optimistic locking implementation, domain ↔ database mapping, and the pre-go-live database sync workflow. Follow this file exactly when creating or modifying repositories, Prisma schema, or seed data.
5. **`.github/instructions/domain.instructions.md`** — Defines the domain model layer: pure business logic functions, immutability rules, domain types, domain errors, and domain unit testing. Follow this file exactly when implementing business rules.
6. **`.github/instructions/applicationService.instructions.md`** — Defines the application service layer: input validation and sanitisation, threat checking, authorisation, orchestration of domain and persistence, optimistic locking workflow, and service testing. Follow this file exactly when implementing application services.
7. **`.github/instructions/api.instructions.md`** — Defines the two classes of API (UI API and Public REST API), their authentication mechanisms (Supabase JWT and OAuth 2.0), folder structure (`/api/` vs `/api/v1/`), REST conventions, response envelopes, error handling, versioning, pagination, DTOs, and security controls. Follow this file exactly when creating or modifying API route handlers.
8. **`.github/instructions/ui.instructions.md`** — Defines how UI pages and components are implemented: server vs client component boundaries, the form state machine (idle/loading/success/error), how to call UI APIs from client components, loading and error states (`loading.tsx`, `error.tsx`), accessibility requirements, and design system usage. Follow this file exactly when building pages and components.
9. **`.github/instructions/next.js.instructions.md`** — Defines the App Router conventions, component patterns, server/client boundaries, data fetching, error handling, and project scaffold. Follow this file exactly when creating routes, pages, layouts, and components.
10. **`.github/instructions/codingStandard.instructions.md`** — Supplies naming conventions, TypeScript rules, React component patterns, project structure, and testing guidelines. All implementation code must conform to these standards.
11. **`.github/instructions/uiDesign.instructions.md`** — Defines the design system, component classes, colour palette, typography, spacing, and responsive breakpoints. The implementation must faithfully reproduce the visual design from the HTML mockup using the design system's Tailwind classes.
12. **`.github/instructions/feature.instructions.md`** — Describes the Gherkin feature format and traceability model. Use the scenarios and example data to understand the expected behaviour and edge cases the implementation must support.
13. **`.github/instructions/useCase.instructions.md`** — Describes the use case structure, flows, and business rules. The implementation must satisfy every flow (main, alternative, exception) documented in the use case.
14. **`.github/instructions/businessTest.instructions.md`** — Defines the test architecture (four-layer model), folder structure, step definition conventions, Application class design, Page Object rules, integration test requirements, and the step-by-step test implementation workflow. Follow this file exactly when creating tests.

## Steps

### Phase 1 — Understand the Specification

1. Read each instruction file listed above.
2. Read the **application design** document in `./design/application/` for this feature. This is the primary technical reference — it defines the modules, component hierarchy, sequence diagrams, folder structure, data model, API routes, state management, auth, secrets, and error handling strategy. The implementation must follow this design.
3. Read the **use case** file provided as input. Identify the actor, main flow, alternative flows, exception flows, business rules, and postconditions.
4. Read the **feature file(s)** linked to the use case. Extract the scenarios, example data, and expected outcomes — these define the acceptance criteria the implementation must satisfy.
5. Read the **HTML mockup** linked to the use case (in `./design/ui/`). Study the layout, component structure, interactive states (default, loading, result, error), and responsive behaviour.

### Phase 2 — Plan the Implementation

6. Review the application design document's planned folder structure and component hierarchy. Validate that the plan is still correct and adjust if needed.
7. **Persistence gate** — If this feature requires new or changed database tables:
   - Verify `./design/database/schema.md` has been updated and approved for the required tables.
   - Follow `persistence.instructions.md` to update `schema.prisma`, run `npx prisma db push --force-reset`, and re-seed with `npx prisma db seed`.
   - Create or update the repository file(s) for each affected table, following the repository-per-table pattern.
   - Do not proceed to Phase 3 until the persistence layer is in place and verified.
8. Plan the implementation:
   - Identify the **route(s)** needed under `src/app/` (page, layout, loading, error files).
   - Identify **components** to extract into `src/components/` or `src/components/ui/` for reusability.
   - Identify any **types/interfaces** to define in `src/types/`.
   - Identify any **utility functions** or **business logic** to place in `src/lib/`.
   - Identify any **custom hooks** to place in `src/hooks/`.
   - Identify any **constants** to place in `src/constants/`.

### Phase 3 — Implement the Application Code

9. Implement the feature:
   - Create the page route under `src/app/` following App Router conventions (`page.tsx` with default export).
   - Build components as **functional components** with typed props interfaces. Use **named exports** for non-page components.
   - Translate the HTML mockup's Tailwind classes and design system components into React/JSX, preserving the visual design exactly.
   - Implement all interactive behaviour: form handling, input validation, state transitions (default → loading → result/error), and calculations.
   - Handle all **alternative flows** (e.g., switching modes, recalculating) and **exception flows** (e.g., validation errors, empty states) from the use case.
   - Use `"use client"` only for components that require client-side interactivity (event handlers, state, effects). Keep components server-rendered by default.
   - Ensure **accessibility**: semantic HTML, ARIA attributes, keyboard navigation, and focus management matching the mockup.
   - Ensure **responsive behaviour**: mobile-first design working at 320px, 768px, and 1024px+ breakpoints.
10. Verify the application starts and the page renders without errors.

### Phase 4 — Set Up the Test Infrastructure

11. Ensure test dependencies are installed (`@cucumber/cucumber`, `playwright`, `jest`).
12. If `./test/support/world.ts` does not exist, create the Cucumber World configuration per `businessTest.instructions.md`.
13. If `./test/support/application.ts` does not exist, create the Application class skeleton with `launch()` and `close()` methods.
14. Create the step definition file under `./test/step-definitions/` — one file per feature, named `[featureName].steps.ts`.

### Phase 5 — Implement and Run Tests (one step at a time)

Follow the strict step-by-step workflow from `businessTest.instructions.md`. **Do not skip ahead** — each step must pass before moving to the next.

For each Gherkin step in the feature file:

15. **Write the step definition** for the next unimplemented Gherkin step, delegating to the Application class. Keep it thin — no Playwright calls, no complex logic.
16. **Implement or extend the Application class method** needed by that step. Name the method after the business action, not the UI interaction.
17. **Write or extend the Application class integration test** in `./test/support/application.integration.test.ts`. The test must exercise the method against the real running application — **no mocks**.
18. **Run the integration test.** Fix until it passes.
19. **If a new Page Object method or locator is needed:**
    - Use the **Playwright MCP server** to navigate to the page and inspect the DOM.
    - Determine the correct, stable locators for each element.
    - Define each locator **exactly once** on the Page Object class.
    - Implement the Page Object method.
20. **Run the Cucumber scenario** up to the current step. Fix until it passes.
21. **Move to the next Gherkin step.** Repeat from step 15.

### Phase 6 — Full Verification

22. Run the **full feature** (`npx cucumber-js --tags "@F-NNN"`) to confirm all scenarios pass end-to-end.
23. Run the **full Application integration test suite** to check for regressions.
24. Verify against the feature file scenarios — every scenario and example row should produce the documented expected outcome.
25. Verify against the use case — every flow (main, alternative, exception) and business rule should be supported.
26. Verify against the mockup — the implemented UI should visually match the HTML mockup at all breakpoints.
27. Run through the **review checklist** from `businessTest.instructions.md`.

## Key Rules

- **Feature files are the tests.** Do not copy them — Cucumber reads from `./specification/features/`.
- **One feature at a time.** When multiple feature files must be implemented, implement each feature file completely (application code + tests passing) before starting the next. Never batch features.
- **One step at a time.** Within a feature, implement, test, pass, then move on.
- **All tests must pass before moving to the next feature.** Run `npx cucumber-js --tags "@F-NNN"` and confirm every scenario is green before proceeding.
- **Step definitions are glue only.** They delegate to the Application class — no Playwright, no logic.
- **Application class methods are business-level.** Good: `uploadFloorPlan()`. Bad: `clickUploadButton()`.
- **Page Object locators are defined once.** Never duplicate a locator.
- **Locators come from Playwright MCP.** Never guess. Always inspect the running application.
- **Integration tests have no mocks.** They drive the real application.
- **Run tests after every change.** Never batch changes without verifying.
- **All tests must pass before the feature is considered complete.**

## Inputs

When invoking this prompt, provide:

- **Use case** — Path to the use case file (e.g., `specification/useCases/user/calculatePercentage.md`).
- **Feature file** *(optional)* — Path to the feature file if not discoverable from the use case's `## Features` table.
- **UI Mockup** *(optional)* — Path to the HTML mockup if not linked in the use case's `## UI Reference` section.
- **Scope** *(optional)* — Limit to specific flows if you do not want full implementation (e.g., "main flow only", "UI shell without logic", "tests only").
- **Additional context** *(optional)* — Any extra technical constraints, API details, or implementation notes.
