```instructions
# Application Design Instructions

## Overview

An application design document captures the high-level technical architecture for a feature before any implementation begins. It translates the **use case** (what the system does), the **feature file** (how behaviour is verified), and the **UI mockup** (what the user sees) into a concrete plan showing modules, components, data flow, folder structure, and any infrastructure concerns such as authentication or secret management.

**Key principle**: The design document is the bridge between specification and implementation. It contains everything a developer needs to start coding — and nothing they would need to guess.

**Prerequisite**: Every application design must conform to the system architecture defined in `architecture.instructions.md`. The architecture prescribes the layered Service–Domain–Repository pattern, module boundaries (Auth, Profile, Subscription, Core), authentication via Supabase JWT, persistence via Prisma with optimistic locking, and payment via Stripe. Feature designs must work within these constraints — not redefine them.

**Persistence rule**: The persistence layer (Prisma schema, repositories) is designed at the table level, not the use-case level. If a feature requires new or changed tables, the database design (`./design/database/schema.md`) must be updated and approved **before** the application design is finalised. The application design references the tables it depends on but does not define them — see `persistence.instructions.md` and `databaseDesign.instructions.md` for the schema workflow.

---

## File Location & Naming

- All application design documents live under `./design/application/`.
- **One file per feature area** — the design document covers the full scope of a use case or closely related group of use cases.
- Filenames use **camelCase** per the project coding standard (e.g., `analyseFloorPlan.md`, `userAuthentication.md`).

### Folder Structure

```
design/
  application/          # Application design documents
    analyseFloorPlan.md
    userAuthentication.md
  ui/                   # HTML mockups (existing)
    analyseFloorPlan.html
```

---

## Document Template

Every application design document should follow this structure:

```markdown
# [Feature Name] — Application Design

## Metadata

| Field            | Value                                     |
|------------------|-------------------------------------------|
| **Use Case**     | [UC-ID — Title](link to use case file)    |
| **Feature**      | [F-NNN — Title](link to feature file)     |
| **UI Mockup**    | [link to mockup file](link)               |
| **Status**       | Draft / Review / Approved                 |
| **Created**      | YYYY-MM-DD                                |
| **Last Updated** | YYYY-MM-DD                                |

## Summary

A brief (2–4 sentence) description of what this feature does and the key technical decisions it requires.

## Modules & Components

### High-Level Module Map

A list or diagram of the major modules involved:

- **Pages / Routes** — Next.js pages and layouts under `src/app/`.
- **UI Components** — Reusable presentation components under `src/components/`.
- **Hooks** — Custom React hooks under `src/hooks/`.
- **Services** — API clients and external service integrations under `src/services/`.
- **Lib / Utilities** — Business logic, calculations, and helper functions under `src/lib/`.
- **Types** — Shared TypeScript interfaces and types under `src/types/`.
- **Constants** — Application-wide constants under `src/constants/`.
- **API Routes** — Backend route handlers under `src/app/api/`.

For each module, provide:

| Module | Path | Responsibility |
|--------|------|----------------|
| [Name] | `src/[path]` | [What it does] |

### Component Hierarchy

Describe the component tree for the feature's primary page(s). Identify which components are Server Components and which require `"use client"`.

```
PageComponent (Server)
├── LayoutShell (Server)
├── UploadForm (Client — event handlers, state)
│   ├── FileDropZone (Client)
│   ├── RoofHeightInput (Client)
│   └── SubmitButton (Client)
├── AnalysisResults (Server or Client)
│   ├── AnnotatedFloorPlan (Server)
│   ├── TotalFloorArea (Server)
│   └── RoomCard (Server)
│       ├── RoomDiagram (Server)
│       └── MeasurementTable (Server)
└── DownloadActions (Client — event handlers)
```

## Sequence Diagrams

Provide Mermaid sequence diagrams for the key flows. At minimum, cover:

1. **Main flow** — The happy path from user action to result.
2. **Error flows** — How errors propagate and are displayed.
3. **Any async / API flows** — Client ↔ API ↔ external service interactions.

Use Mermaid syntax:

    ```mermaid
    sequenceDiagram
        participant U as User
        participant P as Page (Client)
        participant A as API Route
        participant S as Service
        U->>P: Upload floor plan
        P->>A: POST /api/analyse
        A->>S: analyseFloorPlan(image, roofHeight)
        S-->>A: AnalysisResult
        A-->>P: JSON response
        P-->>U: Display results
    ```

## Folder Structure

Show the planned folder and file structure for this feature. Include every file that will be created or modified.

```
src/
  app/
    plans/
      page.tsx              # Plans page (upload + results)
      loading.tsx           # Loading state
      error.tsx             # Error boundary
    api/
      analyse/
        route.ts            # POST — analyse floor plan
  components/
    uploadForm.tsx
    analysisResults.tsx
    roomCard.tsx
    roomDiagram.tsx
    measurementTable.tsx
    annotatedFloorPlan.tsx
    downloadActions.tsx
  hooks/
    useFloorPlanAnalysis.ts
  lib/
    areaCalculations.ts     # Wall, floor, ceiling area formulas
    roomLabelling.ts        # Label assignment logic
  services/
    floorPlanService.ts     # External API / AI integration
  types/
    floorPlan.ts            # Room, Wall, AnalysisResult interfaces
  constants/
    defaults.ts             # DEFAULT_ROOF_HEIGHT, etc.
```

## Data Model

Define the key TypeScript interfaces and types the feature introduces.

```typescript
interface Room {
  name: string;
  width: number;   // metres
  length: number;  // metres
  height: number;  // metres
  floorArea: number;
  ceilingArea: number;
  walls: Wall[];
  totalWallArea: number;
}

interface Wall {
  label: string;   // "Wall A", "Wall B", etc.
  length: number;  // metres
  height: number;  // metres
  area: number;    // sq m
}

interface AnalysisResult {
  rooms: Room[];
  totalFloorArea: number;
  annotatedImageUrl: string;
}
```

## API Design

For each API route the feature requires, document:

| Method | Path | Request Body | Response | Description |
|--------|------|-------------|----------|-------------|
| POST | `/api/analyse` | `{ image: File, roofHeight: number }` | `{ data: AnalysisResult }` | Analyse uploaded floor plan |

Include error response shapes:

```typescript
// 400 — Validation error
{ error: { message: "Unsupported file format...", code: "INVALID_FORMAT" } }

// 500 — Processing failure
{ error: { message: "Unable to process this floor plan...", code: "ANALYSIS_FAILED" } }
```

## Persistence Dependencies

List every database table this feature reads from or writes to. Do **not** define the table schema here — that belongs in `./design/database/schema.md`. Instead, reference the tables and note how the feature uses them.

| Table | Access | Purpose |
|-------|--------|--------|
| `profile` | Read | Load user profile for display name |
| `plan` | Read / Write | Create and update floor plans |
| `room` | Read / Write | Store analysed room data |
| `reference_data` | Read | Load trade types for dropdown |

If this feature requires **new tables or schema changes**:

1. Update `./design/database/schema.md` first.
2. Get human approval on the schema change.
3. Then finalise this application design.

Reference: `persistence.instructions.md` for the full persistence workflow.

## State Management

Describe how client-side state is managed for this feature:

- What state is held and where (component state, context, URL params).
- State transitions (e.g., idle → uploading → analysing → results → error).
- How state is reset (e.g., new upload clears previous results).

## Authentication & Authorisation

If the feature requires authentication or role-based access:

- **Auth method** — How users authenticate (e.g., session cookies, JWT, OAuth provider).
- **Protected routes** — Which routes require authentication.
- **Middleware** — Any Next.js middleware needed for auth guards.
- **Authorisation rules** — Which actors can access which operations.

If no auth is required, state: "No authentication required for this feature."

## Secrets & Environment Variables

List every environment variable and secret the feature needs:

| Variable | Purpose | Server / Client | Example |
|----------|---------|-----------------|---------|
| `API_SECRET_KEY` | Authenticate with floor plan analysis API | Server only | `sk-abc123...` |
| `NEXT_PUBLIC_MAX_UPLOAD_MB` | Max upload size shown in UI | Client | `10` |

Document:

- Where secrets are stored (`.env.local`, hosting platform secret manager).
- How secrets are accessed in code (`process.env.VAR_NAME` via a validated `src/lib/env.ts` module).
- Which variables must **never** be exposed to the client (no `NEXT_PUBLIC_` prefix).

## External Dependencies & Integrations

List any external services, APIs, or third-party libraries the feature depends on:

| Dependency | Purpose | Type |
|------------|---------|------|
| OpenAI Vision API | Analyse floor plan images | External API |
| `xlsx` npm package | Generate spreadsheet downloads | Library |
| `file-saver` | Trigger client-side file downloads | Library |

For each external API, note:

- Authentication method.
- Rate limits or quotas.
- Fallback / error handling strategy.

## Business Rules Implementation

Map each business rule from the use case to the module responsible for enforcing it:

| Business Rule | Module | Implementation Notes |
|---------------|--------|---------------------|
| Default roof height is 2.4 m | `src/constants/defaults.ts` | Exported constant `DEFAULT_ROOF_HEIGHT` |
| Wall area = length × height | `src/lib/areaCalculations.ts` | Pure function `calculateWallArea()` |
| Ceiling area = floor area | `src/lib/areaCalculations.ts` | Pure function `calculateCeilingArea()` |
| Room labels: original or "Room A/B/C" | `src/lib/roomLabelling.ts` | Pure function `assignRoomLabels()` |

## Error Handling Strategy

Map each exception flow from the use case to how it is handled technically:

| Exception | Detection Point | User Feedback | Technical Detail |
|-----------|----------------|---------------|-----------------|
| Unsupported format | Client-side validation | Error alert below upload | Check file extension before upload |
| Analysis failure | API route catch block | Error alert with retry | Return 500 with `ANALYSIS_FAILED` code |
| No rooms detected | Service response check | Error alert with suggestion | Return 200 with empty rooms + error message |
| Invalid roof height | Client-side validation | Inline field error | Validate > 0 and numeric before submit |

## Assumptions & Constraints

List any technical assumptions or constraints that affect the design:

- All rooms are assumed rectangular (no L-shaped rooms in v1).
- Image analysis relies on an external AI service with per-request latency.
- Maximum upload size is constrained by hosting platform limits.

## Open Questions

List any unresolved technical decisions that need input:

- [ ] Which AI/vision API to use for floor plan analysis?
- [ ] Should analysis results be persisted to a database or kept in-memory only?
- [ ] What is the maximum acceptable response time for analysis?

## Notes

Any additional technical context, references, or implementation hints.
```

---

## Writing Guidelines

### Scope

- The design document covers **one feature area** end-to-end. It should contain everything needed to implement the feature without referring back to the use case for technical decisions.
- Keep the document **high-level** — describe what modules exist and what they do, not the line-by-line implementation. The purpose is to guide implementation, not replace it.
- If a feature is large, split into multiple design documents by sub-feature area and cross-reference them.

### Diagrams

- Use **Mermaid** syntax for all diagrams (sequence, component, flowchart). This keeps diagrams version-controlled and editable as text.
- Every design document must include at least one sequence diagram covering the main flow.
- Component hierarchy can be shown as a tree (text-based) or as a Mermaid diagram.

### Traceability

- Every module and component in the design must trace back to a use case flow, business rule, or exception flow.
- The business rules implementation table and error handling strategy table create direct links from specification to code.
- Reference the use case, feature file, and mockup in the Metadata section.

### Technology Decisions

- When the design introduces a new library, API, or pattern not already established in the project, explain **why** it was chosen and what alternatives were considered.
- Do not introduce unnecessary dependencies — prefer built-in Next.js / React capabilities.

### Consistency

- Follow naming conventions from the coding standard (camelCase files, PascalCase classes, UPPER_SNAKE_CASE constants).
- Follow the project structure from the coding standard and Next.js instructions.
- Use the design system component classes from the UI design instructions when describing UI structure.

---

## Review Checklist

Before considering an application design document complete:

- [ ] Every use case flow (main, alternative, exception) has a corresponding module or component responsible for implementing it.
- [ ] Every business rule is mapped to a specific module with implementation notes.
- [ ] At least one sequence diagram covers the main flow.
- [ ] The folder structure shows every file to be created.
- [ ] Data model interfaces are defined with TypeScript types.
- [ ] API routes are documented with request/response shapes and error cases.
- [ ] Authentication requirements are addressed (even if "none required").
- [ ] All environment variables and secrets are listed with their scope (server/client).
- [ ] External dependencies are listed with their purpose and error handling strategy.
- [ ] State management approach is described with state transitions.
- [ ] Error handling strategy maps every exception flow to technical handling.
- [ ] Open questions are documented for any unresolved decisions.
- [ ] The document follows the project coding standard naming conventions.
- [ ] The document is stored in `./design/application/` with a camelCase filename.

---

## Tips

- Start with the sequence diagrams — they force you to think through the data flow before getting lost in component details.
- The component hierarchy section is particularly useful for deciding the server/client boundary early.
- Keep the data model section minimal but precise — define the interfaces that will be shared across modules.
- The business rules implementation table is the most direct connection between spec and code — review it carefully.
- Use the open questions section liberally. It is better to acknowledge unknowns than to silently make assumptions.
- Update the design document as decisions are made during implementation — it is a living reference, not a throwaway artefact.
```
