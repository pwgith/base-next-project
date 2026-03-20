# Create Use Case

## Purpose

Guide the creation of a new use case document following the project's specification standards.

## Required Reading

Before creating a use case, review the following instruction files **in order**:

1. **`.github/instructions/useCase.instructions.md`** — Primary reference. Defines the use case template, folder structure, ID scheme, writing guidelines, and actor conventions. Follow this file exactly.
2. **`.github/instructions/codingStandard.instructions.md`** — Supplies naming conventions (camelCase filenames and folders) and project structure rules that apply to use case files.
3. **`.github/instructions/feature.instructions.md`** — Explains the traceability model between use cases and Gherkin feature files. Understand the `## Features` section that must appear in every use case and how back-linking works.
4. **`.github/instructions/uiDesign.instructions.md`** — Describes the design system and UI mockup conventions. Use cases may reference mockups in `./design/ui/` via the `## UI Reference` section.

## Steps

1. Read each instruction file listed above.
2. Check `./specification/useCases/actors.md` for the current list of actors. If the file does not exist or the required actor is missing, create or update it first.
3. Determine the correct actor folder under `./specification/useCases/` (e.g., `student/`, `teacher/`). Create the folder if it does not exist.
4. Assign the next sequential use case ID for the actor using the `UC-[ACTOR_PREFIX]-[NNN]` format.
5. Create the use case file using **camelCase** naming inside the actor folder.
6. Populate the file using the full template from `useCase.instructions.md`, filling in every section. Set **Status** to `Draft` and use today's date for **Created** and **Last Updated**.
7. Leave the `## Features` table with placeholder rows — it will be populated when feature files are created later.

## Inputs

When invoking this prompt, provide:

- **Actor** — Which actor is performing the use case (e.g., Student, Teacher).
- **Goal** — A short description of what the actor wants to accomplish.
- **Context** *(optional)* — Any additional details, business rules, or constraints.
- **UI Mockup** *(optional)* — Path to an existing HTML mockup in `./design/ui/` if one exists.
