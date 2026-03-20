# Use Case Instructions

## Overview

Use cases capture the interactions between actors (user types, external systems) and the application. They describe **what** the system does from the user's perspective, not **how** it is implemented. Each use case documents a single goal an actor wants to achieve.

---

## File Location & Organisation

- All use cases live under `./specification/useCases/`.
- **One file per use case** — keep each use case self-contained and focused.
- **Group use cases into folders by actor (user type)**. Each folder is named after the actor it relates to.
- Filenames use **camelCase** per the project coding standard.

### Folder Structure Example

```
specification/
  useCases/
    student/
      solveEquation.md
      viewSolutionHistory.md
      submitProblem.md
    teacher/
      assignProblem.md
      reviewStudentProgress.md
    admin/
      manageUsers.md
      configureSettings.md
```

> If a use case involves multiple actors, place it under the **primary actor's** folder and reference the secondary actors within the document.

---

## Use Case Template

Every use case file should follow this structure:

```markdown
# [Use Case Title]

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-[ACTOR]-[NNN]               |
| **Actor**        | [Primary actor]                |
| **Priority**     | High / Medium / Low            |
| **Status**       | Draft / Review / Approved      |
| **Created**      | YYYY-MM-DD                     |
| **Last Updated** | YYYY-MM-DD                     |

## Summary

A one- or two-sentence description of what the actor wants to accomplish.

## Preconditions

- List conditions that must be true before this use case can begin.

## Trigger

What event or action initiates this use case.

## Main Flow (Happy Path)

1. Step-by-step description of the primary success scenario.
2. Each step describes either a user action or a system response.
3. Use the format: "The [actor] does X" or "The system does Y".

## Alternative Flows

### [Alt Flow Name]

- **Branches from**: Step [N] of Main Flow
- Description of what happens differently and how control resumes.

## Exception Flows

### [Exception Name]

- **Triggered at**: Step [N] of Main Flow
- What error or exceptional condition occurs and how the system handles it.

## Postconditions

- List conditions that are true after the use case completes successfully.

## Business Rules

- Any business rules or constraints that govern this use case.

## UI Reference

Link to the relevant HTML mockup in `./design/ui/` if one exists.

## Features

Trace to Gherkin feature files that implement this use case (maintained as features are created):

| Feature ID | Scenario IDs          | Description                     |
|------------|-----------------------|---------------------------------|
| F-NNN      | S-NNN, S-NNN          | [Brief feature description]     |

## Notes

Any additional context, open questions, or assumptions.
```

---

## Writing Guidelines

### Clarity
- Write in simple, direct language — avoid technical jargon.
- Each step should describe a single action or response.
- Use the actor's name (e.g., "The student", "The teacher") not pronouns.

### Scope
- A use case should represent **one complete goal** the actor wants to achieve.
- If a use case grows beyond ~15 main flow steps, consider splitting it into smaller use cases and linking them.

### Granularity
- Avoid implementation details — describe **what** happens, not **how** the code works.
- Do not reference specific UI elements by name; instead describe the information and choices presented to the actor.
- Exception: you may reference design system concepts (e.g., "an error alert is displayed") to link intent to the UI design instructions.

### Identifiers
- Use a consistent ID scheme: `UC-[ACTOR_PREFIX]-[NNN]` (e.g., `UC-STU-001`, `UC-TCH-001`, `UC-ADM-001`).
- Assign IDs sequentially within each actor group.

### Cross-References
- When one use case depends on or extends another, reference it by ID and title.
- Example: "This use case extends [UC-STU-001 Solve Equation](../student/solveEquation.md)."

### Traceability
- Link to the corresponding UI mockup in `./design/ui/` when available.
- Link to related business rules or requirements if maintained separately.

---

## Actors

Before writing use cases, define the actors for the project. Maintain an actor list in `./specification/useCases/actors.md`:

```markdown
# Actors

| Actor     | Description                                        |
|-----------|----------------------------------------------------|
| Student   | A user who interacts with the app to solve problems |
| Teacher   | A user who assigns and reviews work                 |
| Admin     | A user who manages system configuration and users   |
| System    | Automated processes (e.g., scheduled jobs, APIs)    |
```

> Update this list whenever a new actor type is introduced. Each actor should have a corresponding folder under `./specification/useCases/`.

---

## Review Workflow

1. **Draft** — Author writes the use case and self-reviews against this template.
2. **Review** — Share with stakeholders or team for feedback. Update status to `Review`.
3. **Approved** — Incorporate feedback, finalise, and set status to `Approved`.
4. Approved use cases serve as the specification for implementation and testing.

---

## Tips

- Start with the most critical or highest-risk use cases first.
- Write the main flow before worrying about alternatives and exceptions.
- Use cases are living documents — update them as requirements evolve.
- Keep use cases technology-agnostic; they should survive a framework change.
