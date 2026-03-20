# Database Design Instructions

## Overview

The database schema design is maintained as a living document that reflects the current state of the database. It must be updated **before** any database change is implemented and requires **human review and approval** before implementation can proceed.

**Key principle**: The schema design document is the single source of truth for the database structure. No database change (new table, new column, relationship change, constraint change) may be implemented until the design document has been updated and approved.

---

## File Location & Naming

- The database schema design lives at `./design/database/schema.md`.
- There is **one schema file** for the entire application — not one per feature.

### Folder Structure

```
design/
  application/          # Application design documents
  database/             # Database design
    schema.md           # The database schema design document
  ui/                   # HTML mockups
```

---

## Document Template

The schema design document must follow this structure:

```markdown
# Database Schema

## Metadata

| Field            | Value         |
|------------------|---------------|
| **Status**       | Draft / Approved |
| **Last Updated** | YYYY-MM-DD    |
| **Reviewed By**  | [Name]        |

## Schema Diagram

[Mermaid diagram — see Diagram Rules below]

## Table Definitions

[Detailed table definitions — see Table Definitions below]

## Change Log

[Record of all schema changes — see Change Log below]
```

---

## Schema Diagram

The schema diagram is a **Mermaid flowchart** that shows all tables, their fields, and the relationships between them.

### Diagram Rules

- Use `graph LR` (left-to-right) or `graph TD` (top-down) — whichever is more readable for the current schema size.
- **Do not use** the Mermaid `erDiagram` syntax — it has inconsistent rendering support. Use a standard flowchart with simple line joins instead.
- Each table is a node with its fields listed inside.
- Relationships are shown as labelled lines between table nodes.
- Include the relationship cardinality in the label text (e.g. "1 to many", "1 to 1").

### Diagram Example

````mermaid
graph LR
    auth_users["<b>auth.users</b><br/>(Supabase managed)<br/>─────────────<br/>id: UUID PK"]

    profile["<b>profile</b><br/>─────────────<br/>id: UUID PK<br/>supabaseUserId: UUID UNIQUE<br/>displayName: TEXT<br/>email: TEXT<br/>version: INT<br/>createdAt: TIMESTAMP<br/>updatedAt: TIMESTAMP"]

    reference_data["<b>reference_data</b><br/>─────────────<br/>id: UUID PK<br/>category: TEXT<br/>code: TEXT<br/>label: TEXT<br/>sortOrder: INT<br/>isActive: BOOLEAN<br/>─────────────<br/>UNIQUE(category, code)"]

    auth_users -- "1 to 1 (supabaseUserId)" --> profile
````

### Diagram Conventions

- **Bold** the table name using `<b>` tags.
- Separate the table name from fields with a line of dashes (`─────────────`).
- Show the data type and key constraints inline (e.g. `id: UUID PK`, `email: TEXT NOT NULL`).
- Show unique constraints and composite keys below a separator line.
- For tables managed by external systems (e.g. `auth.users`), include a note indicating they are externally managed and only show the fields referenced by the application.
- Use `-->` for standard relationships and include the relationship type and foreign key in the label.

---

## Table Definitions

Below the diagram, provide a detailed definition for each application-owned table. Use this format:

```markdown
### [table_name]

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Application-generated primary key |
| ... | ... | ... | ... |

**Relationships:**
- `columnName` → `other_table.column` (relationship type)

**Notes:**
- Any additional context (e.g. "Created on first login via upsert", "Populated from seed file, read-only at runtime").
```

### Rules

- Every application-owned table must have a definition section.
- Every column must be listed with its type, constraints, and a brief description.
- Every foreign key relationship must be documented.
- Every mutable table must include the `version` column for optimistic locking (per `architecture.instructions.md`).
- External tables (e.g. `auth.users`) do not need a full definition — reference them in the diagram and note which fields the application uses.

---

## Change Log

The document must include a change log that records every schema modification:

```markdown
## Change Log

| Date | Change | Reason | Approved By |
|------|--------|--------|-------------|
| 2026-03-05 | Initial schema — profile, reference_data tables | Project setup | [Name] |
| ... | ... | ... | ... |
```

- Every row represents a single logical change (e.g. "Added subscription table", "Added status column to profile").
- The **Approved By** column must be filled in by a human reviewer before implementation.

---

## Change Workflow

Database changes follow a strict approval workflow:

1. **Update the schema document** — Modify the diagram, table definitions, and change log in `./design/database/schema.md` to reflect the proposed change.
2. **Human review** — The updated document must be reviewed and approved by a human before any implementation begins. The reviewer's name is recorded in the change log.
3. **Implement** — Only after approval, proceed with the Prisma schema change and migration (following the persistence instructions).

> **AI agents**: When a task requires a database change, update the schema design document and **stop**. Present the proposed changes to the user for review. Do not proceed with Prisma schema changes, migration generation, or repository code until the user has explicitly approved the schema design.

---

## Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| `architecture.instructions.md` | Defines the persistence strategy (Prisma, optimistic locking, Supabase PostgreSQL). The schema design must conform to these architectural constraints. |
| `applicationDesign.instructions.md` | Feature design documents define the data model interfaces. The schema design is the database-level realisation of those interfaces. |
| Prisma schema (`prisma/schema.prisma`) | The Prisma schema is the implementation of this design. It must match the approved schema document. |
| Persistence instructions *(separate file)* | Will define the workflow for implementing approved schema changes (Prisma schema, migrations, repositories, seed data). |

---

## Review Checklist

Before considering a schema change ready for human review:

- [ ] The Mermaid diagram has been updated to reflect the change.
- [ ] All new/modified tables have complete table definitions with every column documented.
- [ ] All relationships are shown in the diagram and documented in the table definitions.
- [ ] Every mutable table includes a `version` column for optimistic locking.
- [ ] Timestamps (`createdAt`, `updatedAt`) are included on mutable tables where appropriate.
- [ ] The change log has a new entry describing the change and its reason.
- [ ] The change is consistent with the architecture defined in `architecture.instructions.md`.
- [ ] Column names follow the project naming convention (camelCase).
- [ ] Table names follow the project naming convention (snake_case).
