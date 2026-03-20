```markdown
# Create Database Design

## Purpose

Guide the creation or update of the database schema design document at `./design/database/schema.md`. This document is the single source of truth for the database structure and must be completed and **approved by a human** before any implementation proceeds.

## Required Reading

Before designing or updating the database schema, review the following instruction files **in order**:

1. **`.github/instructions/databaseDesign.instructions.md`** — Primary reference. Defines the schema document template, Mermaid diagram conventions, table definition format, change log requirements, and the human-approval gate. Follow this file exactly.
2. **`.github/instructions/architecture.instructions.md`** — Defines the overall system architecture including the standard column conventions every mutable table must follow (`id`, `version`, `createdAt`, `updatedAt`), the no-enum rule, the optimistic locking strategy, and the reference data pattern.
3. **`.github/instructions/persistence.instructions.md`** — Defines Prisma schema rules (no enums, String columns, naming conventions) and the database synchronisation workflow. Understanding these rules ensures the schema design will translate cleanly to a Prisma schema.
4. **`.github/instructions/codingStandard.instructions.md`** — Supplies naming conventions (camelCase filenames, snake_case table/column names mapped via Prisma `@map`).

## Steps

### Phase 1 — Understand What Needs to Change

1. Read each instruction file listed above.
2. Read the **application design document** triggering this schema change (in `./design/application/`). Identify every table the feature reads from or writes to.
3. Read the **use case** and **feature files** if provided. Identify the data the feature needs to persist, the entities involved, and the relationships between them.
4. Read the **current schema document** at `./design/database/schema.md` (if it exists). Understand the existing tables, columns, and relationships before making changes.

### Phase 2 — Design the Schema Changes

5. For each new table required, determine:
   - **Table name** — snake_case, singular or plural per domain convention.
   - **Columns** — Every mutable table must include `id` (UUID PK), `version` (INT DEFAULT 1), `createdAt`, and `updatedAt`. Add domain-specific columns.
   - **Data types** — Use `TEXT` for strings, `INTEGER` for whole numbers, `DECIMAL` for monetary/precise decimals, `BOOLEAN` for flags, `TIMESTAMP` for dates/times, `UUID` for identifiers.
   - **Constraints** — NOT NULL, UNIQUE, foreign keys, composite unique constraints.
   - **No enums** — Store enumerated values as `TEXT` with application-level validation. Do not use database enum types.

6. For each modified existing table, determine:
   - Which columns are being added, changed, or removed.
   - Whether existing data will be affected (note any data migration concerns, even if pre-go-live resets make migrations unnecessary now).
   - Whether foreign key constraints change.

7. For enumerated values, determine whether they belong in:
   - **`reference_data` table** — If they need labels, sort orders, or may be managed by admin users.
   - **Application-level TypeScript types only** — If they are fixed code values that will never change (e.g., status codes).

8. Design all **relationships** between tables:
   - Identify the owning side of each relationship.
   - Determine cardinality (one-to-one, one-to-many, many-to-many).
   - Plan foreign key columns and their NOT NULL / nullable status.

### Phase 3 — Update the Schema Document

9. Open (or create) `./design/database/schema.md`.
10. Update the **Mermaid diagram** (`graph LR` or `graph TD`) to reflect the new state of the schema:
    - Add new tables as nodes with their fields listed inside.
    - Update existing table nodes with any column changes.
    - Add or update relationship lines with cardinality labels.
    - Follow the diagram conventions from `databaseDesign.instructions.md` exactly (bold table names, separator lines, inline type annotations).
11. Update the **Table Definitions** section:
    - Add a definition block for every new table.
    - Update existing definition blocks for any changed tables.
    - Include: purpose, all columns (type, constraints, description), primary key, foreign keys, unique constraints, and indexes.
12. Add an entry to the **Change Log** with today's date, a description of what changed, and set **Reviewed By** to blank (pending human approval).
13. Set the document **Status** to `Draft`.
14. Set **Last Updated** to today's date.

### Phase 4 — Request Human Approval

15. Present the completed schema changes to the human for review. Summarise:
    - What tables are new.
    - What tables have changed and how.
    - Any data concerns or trade-offs in the design.
16. **Stop and wait for approval.** Do not proceed to any implementation step until the human explicitly approves the schema design.
17. Once approved, update the **Reviewed By** field and set **Status** to `Approved`.
18. Record the approval in the Change Log.

## Key Rules

- **Design before implement.** The schema document must be approved before `schema.prisma`, repositories, or any other implementation file is touched.
- **One schema file.** All tables for the entire application live in `./design/database/schema.md` — not one file per feature.
- **No enums.** Store enumerated values as `TEXT`. Never use database enum types.
- **Standard columns on every mutable table.** `id`, `version`, `createdAt`, `updatedAt` — no exceptions.
- **Human approval is mandatory.** Do not bypass the approval gate, even for small changes.
- **Mermaid flowchart only.** Use `graph LR` or `graph TD`. Do not use `erDiagram`.
- **Reference data for lookup values.** Use the `reference_data` table for values with labels, sort orders, or togglable active status.

## Inputs

When invoking this prompt, provide:

- **Feature or change description** — What the schema change supports (e.g., "add floor plan and room tables for the analyse floor plan feature").
- **Application design document** *(optional)* — Path to the design doc that triggered this schema change.
- **Use case / feature files** *(optional)* — For context on what data the feature needs.
- **Constraints or decisions already made** *(optional)* — Any pre-decided column names, types, or relationships.
```
