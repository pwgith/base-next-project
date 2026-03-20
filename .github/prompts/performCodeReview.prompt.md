# Perform Code Review

## Purpose

Review a feature's implementation for correctness, architectural conformance, coding standard compliance, and alignment with the specification. Produce a prioritised list of findings and fix any blocking issues before signing off.

## Required Reading

Before starting the review, read each of the following instruction files to establish the evaluation criteria:

1. **`.github/instructions/codingStandard.instructions.md`** — Naming conventions (camelCase files, PascalCase components/interfaces, UPPER_SNAKE_CASE constants), TypeScript rules (strict mode, no `any`, explicit return types on exports), React patterns (functional components, named exports, `"use client"` boundaries), and error handling standards. Every finding that violates these rules is a **style issue**.
2. **`.github/instructions/architecture.instructions.md`** — The Service–Domain–Repository layered pattern, module boundaries (Auth, Profile, Subscription, Core), layer dependency rules, Supabase JWT authentication flow, optimistic locking contract, and Stripe payment integration. Every finding that crosses a layer or module boundary incorrectly is an **architecture violation**.
3. **`.github/instructions/applicationDesign.instructions.md`** — The format and content of application design documents in `./design/application/`. Use the relevant design document as the primary source of truth for modules, component hierarchy, sequence diagrams, data model, API routes, auth approach, and error handling strategy. Deviations from the approved design are **design conformance issues**.
4. **`.github/instructions/persistence.instructions.md`** — Prisma conventions, repository-per-table pattern, optimistic locking implementation, and domain ↔ database mapping rules.
5. **`.github/instructions/domain.instructions.md`** — Pure domain functions, immutability, domain types, and domain error patterns.
6. **`.github/instructions/applicationService.instructions.md`** — Input validation and sanitisation, authorisation checks, orchestration responsibilities, and optimistic locking workflow.
7. **`.github/instructions/api.instructions.md`** — The two API classes (UI API and Public REST API), their authentication mechanisms, response envelopes, error mapping, route handler pattern, and security controls. Review all API route handlers against these rules.
8. **`.github/instructions/ui.instructions.md`** — Server vs client component boundaries, form state machine (idle/loading/success/error), loading and error state files, accessibility requirements, and design system usage. Review all pages and components against these rules.
9. **`.github/instructions/next.js.instructions.md`** — App Router conventions, server/client component boundaries, data fetching patterns, and route handler responsibilities.
10. **`.github/instructions/uiDesign.instructions.md`** — The design system's component classes, colour palette, typography scale, spacing system, and responsive breakpoints.
11. **`.github/instructions/feature.instructions.md`** — Gherkin feature format and traceability model. Use the feature file to verify the implementation covers all scenarios.
12. **`.github/instructions/useCase.instructions.md`** — Use case structure. Verify all main, alternative, and exception flows are implemented.

---

## Steps

### Phase 1 — Establish Context

1. Identify the feature being reviewed. Confirm there is a corresponding:
   - Application design document in `./design/application/`
   - Use case file in `./specification/useCases/`
   - Feature file in `./specification/features/`
   - UI mockup in `./design/ui/`
2. Read each instruction file listed in **Required Reading**.
3. Read the application design document for the feature. This is the primary technical reference — all implementation decisions are evaluated against it.
4. Read the use case file and feature file to understand the required flows and acceptance criteria.
5. Study the HTML mockup in `./design/ui/` to understand the intended layout, interactive states, and data presented.

### Phase 2 — Architecture & Layer Review

6. Verify layer dependencies conform to the rules in `architecture.instructions.md`:
   - UI components do not import from Application Service, Domain, or Repository directly.
   - API Route Handlers verify the Supabase JWT and delegate to the Application Service — they do not call repositories directly.
   - Application Services orchestrate Domain and Repository — they do not contain raw SQL or UI logic.
   - Domain functions are pure — no I/O, no Prisma calls, no HTTP calls.
   - Repositories use Prisma only — no business logic inside them.
7. Verify module boundaries are respected (Auth, Profile, Subscription, Core do not import each other's internals).
8. Verify optimistic locking is implemented correctly wherever the design document requires it.
9. Verify Supabase JWT validation is present on every protected API route.

### Phase 3 — Application Design Conformance

10. Compare the implemented modules, components, and files against the design document's planned folder structure and component hierarchy.
11. Check that each API route matches the method, path, request shape, and response shape specified in the design.
12. Check that the data model (TypeScript interfaces and types) matches the design document's data model section.
13. Check that error handling follows the strategy documented in the design (typed error responses, user-friendly messages, no stack trace exposure).
14. For Stripe integration specifically:
    - Verify webhook signature verification is in place (`stripe.webhooks.constructEvent`).
    - Verify webhook events are idempotent (duplicate events do not corrupt state).
    - Verify no Stripe secret keys are exposed to the client.
    - Verify the correct environment variables are used (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).

### Phase 4 — Coding Standard Review

> **Fix as you go**: Fix each coding standard infraction immediately when you find it — do not defer them to Phase 7. Re-read the changed file after each fix to confirm correctness before moving on.

15. Check file and folder naming follows camelCase (e.g. `userProfile.tsx`, `apiHelpers.ts`).
16. Check TypeScript:
    - `strict` mode is enabled in `tsconfig.json`.
    - No `any` types — use `unknown` with type guards where needed.
    - Exported functions and public methods have explicit return types.
    - `interface` used for object shapes; `type` used for unions and utility types.
17. Check React/Next.js conventions:
    - Functional components only, with typed props interfaces.
    - Named exports for all non-page components; default exports only for page/layout files.
    - `"use client"` directive used only where browser APIs, event handlers, or hooks are needed.
    - Non-serialisable values (functions, class instances) are not passed from Server to Client Components.
18. Check error handling: no silently swallowed errors, user-facing messages do not expose internals.
19. Check Tailwind usage: no inline `style` attributes, design system component classes used correctly.

### Phase 5 — UI & Specification Conformance

20. Compare the rendered page structure against the HTML mockup in `./design/ui/`. Focus on:
    - Data displayed (field names, labels, values shown to the user).
    - Interactive states (default, loading, success, error).
    - Form inputs, validation messages, and submission behaviour.
    - Navigation and routing (links, redirects, back behaviour).
    - **Do not fail the review on pixel-perfect styling differences** — minor Tailwind class variations are acceptable.
21. If a major UI discrepancy is found (missing sections, wrong data shown, incorrect flow):
    a. Update the relevant HTML mockup in `./design/ui/` to reflect the actual implemented behaviour (or the correct intended behaviour if the implementation is wrong).
    b. Re-read the use case and feature file to verify they are consistent with the updated mockup.
    c. If the use case or feature file is inconsistent, note it as a **specification gap** — do not silently ignore it.
22. Verify all Gherkin scenarios in the feature file have a corresponding implementation path. Flag any scenarios not covered.
23. Verify all main, alternative, and exception flows from the use case are handled in the implementation.

### Phase 6 — Security Review

24. Verify no secrets or API keys are hard-coded. All external credentials must come from environment variables.
25. Verify all user-supplied input is validated and sanitised before use (SQL injection, XSS, command injection).
26. Verify authorisation checks are performed server-side — never rely on client-supplied identity claims.
27. Verify Stripe webhook payloads are verified with `stripe.webhooks.constructEvent` before processing.
28. Verify no internal error details, stack traces, or database error messages are surfaced to the client.

### Phase 7 — Produce Findings & Fix

29. Compile findings into a prioritised list using the severity levels below:

    | Severity | Criteria | Action required |
    |---|---|---|
    | **Blocking** | Architecture violation, security vulnerability, missing auth/authorisation, data corruption risk | Must fix before sign-off |
    | **Major** | Design conformance failure, missing use case flow, Stripe webhook issue, exposed secret | Fix in this session |
    | **Minor** | Coding standard violation, naming error, missing return type, incorrect component export | Fix in this session |
    | **Note** | Styling deviation, minor wording difference, non-material UI mismatch | Log and defer |

30. Fix all **Blocking** and **Major** findings immediately. **Minor** coding standard findings should already be fixed (see Phase 4) — apply any remaining Minor fixes unless they require large-scale refactoring.
31. After fixes: re-read the changed files to verify the fixes are correct and no new issues have been introduced.
32. Run the relevant feature's Cucumber tests to confirm no regressions:
    ```powershell
    npx tsx ./node_modules/@cucumber/cucumber/bin/cucumber-js --tags "@F-NNN" --format progress 2>&1
    ```
33. Summarise the review outcome: findings by severity, fixes applied, any deferred notes, and a sign-off statement confirming the implementation is ready (or not ready) for merge.