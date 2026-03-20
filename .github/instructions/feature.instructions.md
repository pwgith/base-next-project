# Feature File Instructions

## Overview

Feature files translate use cases into executable Gherkin specifications. They bridge the gap between business requirements (use cases) and the system under test. Each feature file describes a cohesive set of scenarios that specify how the system behaves, using concrete examples.

**Key principle**: Features *support* use cases. Every scenario must trace back to a use case, and every use case should be covered by one or more scenarios.

---

## File Location & Organisation

- All feature files live under `./specification/features/`.
- Filenames use **camelCase** per the project coding standard (e.g., `solveLinearEquation.feature`).
- Group scenarios into feature files where they are **logically related** — typically by a single system capability or behaviour area.
- Use **folders for feature decomposition** only when an area has **more than one feature file**. A single feature file sits directly under `features/` without a wrapper folder.
- If a feature file exceeds **400 lines**, split it into smaller, focused feature files.

### Folder Structure Example

```
specification/
  features/
    authentication/
      login.feature
      passwordReset.feature
      registration.feature
    solveEquation.feature          # single file — no folder needed
    solutionHistory/
      viewHistory.feature
      exportHistory.feature
```

---

## Traceability: Use Case ↔ Feature ↔ Scenario

### Unique Identifiers

Every feature and scenario receives a unique ID embedded as a **tag**:

| Element  | ID Format                      | Example          |
|----------|--------------------------------|------------------|
| Feature  | `@F-[NNN]`                     | `@F-001`         |
| Scenario | `@S-[NNN]`                     | `@S-001`         |

- Feature IDs are globally unique across the project.
- Scenario IDs are globally unique across the project.
- Assign IDs sequentially.

### Linking to Use Cases

Each feature file **must** tag the use case(s) it supports:

```gherkin
@F-003 @UC-STU-001
Feature: Solve linear equation
  As a student
  I want to submit a linear equation and see the solution
  So that I can check my work
```

Each scenario **must** tag the specific use case flow it covers:

```gherkin
  @S-007 @UC-STU-001
  Scenario: Solve a simple one-variable equation
    Given the student has entered the equation "2x + 4 = 10"
    When the student submits the equation
    Then the solution "x = 3" is displayed
```

### Back-linking from Use Cases

When a feature or scenario is created, **add the feature and scenario IDs back to the originating use case** in a new `## Features` section:

```markdown
## Features

| Feature ID | Scenario IDs       | Description                    |
|------------|--------------------|--------------------------------|
| F-003      | S-007, S-008, S-009 | Solve linear equation feature |
```

This creates a **bidirectional trace**: use case → features → scenarios and back.

---

## Writing Gherkin

### Feature Structure

```gherkin
@F-[NNN] @UC-[ACTOR]-[NNN]
Feature: [Short descriptive name]
  As a [actor]
  I want to [action]
  So that [benefit]

  Background:
    # Only if shared setup applies to ALL scenarios in this file.
    Given [common precondition]

  @S-[NNN] @UC-[ACTOR]-[NNN]
  Scenario: [Descriptive name of one specific behaviour]
    Given [precondition with concrete example]
    When [action with concrete example]
    Then [expected outcome with concrete example]
```

### Specification by Example

Write scenarios with **concrete, realistic values** — not abstract descriptions. The example *is* the specification.

**Good — concrete example, gets to the point:**
```gherkin
  @S-012 @UC-STU-001
  Scenario: Solve equation with negative result
    Given the student has entered the equation "3x + 15 = 6"
    When the student submits the equation
    Then the solution "x = -3" is displayed
```

**Bad — abstract, vague, no real example:**
```gherkin
  Scenario: Solve equation with negative result
    Given the student has entered an equation that results in a negative number
    When the student submits the equation
    Then the correct negative solution is displayed
```

### One Thing Per Scenario

Each scenario must test **one specific behaviour or outcome**. If you find yourself writing many `And` steps that verify different things, split into separate scenarios.

**Good — focused:**
```gherkin
  @S-013 @UC-STU-001
  Scenario: Reject equation with no variable
    Given the student has entered "5 + 3 = 8"
    When the student submits the equation
    Then the error "Equation must contain a variable" is displayed
```

**Bad — testing multiple things:**
```gherkin
  Scenario: Validate equation input
    Given the student has entered "5 + 3 = 8"
    When the student submits the equation
    Then the error "Equation must contain a variable" is displayed
    And the input field is highlighted in red
    And the submit button is disabled
    And the error count is incremented
    And the error is logged
```

### Keep Scenarios Lean

- Remove steps that don't contribute to the point of the scenario.
- Don't describe UI navigation in detail — focus on the **what**, not the **how**.
- Avoid setup noise. If context is obvious, don't over-specify it.

**Good — no noise:**
```gherkin
  @S-014 @UC-STU-002
  Scenario: View solution history shows recent problems
    Given the student has previously solved "x + 1 = 5" and "2x = 10"
    When the student views their solution history
    Then the history contains "x + 1 = 5" and "2x = 10"
```

**Bad — noisy with irrelevant detail:**
```gherkin
  Scenario: View solution history shows recent problems
    Given the student opens the browser
    And the student navigates to the home page
    And the student logs in with username "student1" and password "pass123"
    And the student waits for the dashboard to load
    And the student has previously solved "x + 1 = 5"
    And the student has previously solved "2x = 10"
    When the student clicks on the history tab
    And the history page loads
    Then the history list contains 2 items
    And the first item shows "x + 1 = 5"
    And the second item shows "2x = 10"
```

### Scenario Outlines

Use `Scenario Outline` with `Examples` tables when the same behaviour applies to multiple inputs. This keeps things DRY without sacrificing clarity.

```gherkin
  @S-015 @UC-STU-001
  Scenario Outline: Solve simple equations
    Given the student has entered the equation "<equation>"
    When the student submits the equation
    Then the solution "<solution>" is displayed

    Examples:
      | equation      | solution |
      | x + 3 = 7     | x = 4    |
      | 2x = 10        | x = 5    |
      | x - 4 = 0      | x = 4    |
```

### Background

Use `Background` only when **every scenario in the file** shares the same precondition. Keep it minimal — one or two steps at most.

```gherkin
  Background:
    Given the student is logged in
```

If only some scenarios need shared setup, repeat the `Given` step in those scenarios instead.

---

## Splitting Feature Files

Split a feature file when:

1. It exceeds **400 lines**.
2. Scenarios within it cover **clearly distinct sub-topics** that can stand alone.
3. The file is hard to navigate or understand.

When splitting:
- Create a folder named after the feature area.
- Move the original file into the folder and rename as needed.
- Each new file retains its own `@F-[NNN]` tag — assign new feature IDs for the split files.
- Update use case back-links to reflect the new feature IDs.

---

## Tags Summary

| Tag | Purpose | Applied to |
|---|---|---|
| `@F-[NNN]` | Unique feature identifier | Feature |
| `@S-[NNN]` | Unique scenario identifier | Scenario / Scenario Outline |
| `@UC-[ACTOR]-[NNN]` | Traces to originating use case | Feature and Scenario |
| `@wip` | Work in progress — not yet complete | Feature or Scenario |
| `@manual` | Requires manual testing | Scenario |
| `@smoke` | Part of the smoke test suite | Scenario |

---

## Review Checklist

Before considering a feature file complete:

- [ ] Every scenario has a unique `@S-[NNN]` tag.
- [ ] The feature has a unique `@F-[NNN]` tag.
- [ ] All scenarios and the feature tag the originating use case (`@UC-*`).
- [ ] The originating use case has been back-linked with the feature and scenario IDs.
- [ ] Each scenario tests **one thing**.
- [ ] Scenarios use **concrete examples** with realistic values.
- [ ] No noise steps — every step contributes to the point.
- [ ] File is under 400 lines.
- [ ] Scenarios are understandable by a non-technical stakeholder.

---

## Implementation Workflow

When implementing multiple feature files, follow this strict sequence:

1. **One feature at a time.** Implement all application code, API routes, service functions, and step definitions for a single feature file before moving to the next.
2. **Run the tests.** Execute `npx cucumber-js --tags "@F-NNN"` for the current feature and confirm all scenarios pass.
3. **All green before moving on.** Do not start implementing the next feature until every scenario in the current feature is passing.
4. **Repeat.** Move to the next feature file and repeat from step 1.

This ensures each feature is fully working and verified before complexity increases. It also makes failures easier to diagnose — if a test breaks, the cause is in the most recently implemented code.

---

## Tips

- Write the feature-level `As a / I want / So that` first to anchor the purpose.
- Draft the happy path scenario before edge cases and error scenarios.
- Read each scenario aloud — if it sounds awkward it probably needs simplifying.
- Feature files are a communication tool, not just a test artifact. Keep them readable.
- When in doubt, favour more scenarios with fewer steps over fewer scenarios with many steps.
