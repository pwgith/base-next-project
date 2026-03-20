# Create Feature

## Purpose

Guide the creation of Gherkin feature files from existing use case documents, following the project's specification standards and traceability model.

## Required Reading

Before creating a feature, review the following instruction files **in order**:

1. **`.github/instructions/feature.instructions.md`** — Primary reference. Defines the feature file template, Gherkin conventions, ID scheme, folder structure, scenario writing guidelines, and the review checklist. Follow this file exactly.
2. **`.github/instructions/useCase.instructions.md`** — Describes use case structure, flows, and the `## Features` back-link table that must be updated when features are created.
3. **`.github/instructions/codingStandard.instructions.md`** — Supplies naming conventions (camelCase filenames and folders) and project structure rules that apply to feature files.

## Steps

1. Read each instruction file listed above.
2. Read the use case file provided as input. Identify the use case ID, actor, main flow, alternative flows, exception flows, and business rules.
3. Scan `./specification/features/` to determine the next sequential feature ID (`@F-[NNN]`) and scenario ID (`@S-[NNN]`) that are available.
4. Create the feature file under `./specification/features/` using **camelCase** naming. If the feature area already has multiple feature files, place them in a folder named after the area. A single feature file sits directly under `features/` without a wrapper folder.
5. Write the feature-level description using `As a / I want / So that`, derived from the use case summary and actor.
6. Draft scenarios covering:
   - **Main flow (happy path)** — At least one scenario for the primary success path. Use `Scenario Outline` with an `Examples` table when the same behaviour applies to multiple inputs.
   - **Alternative flows** — One or more scenarios for each alternative flow in the use case.
   - **Exception flows** — One or more scenarios for each exception flow in the use case.
   - **Business rules** — Scenarios that demonstrate key business rules if not already covered above.
7. Assign each scenario a unique `@S-[NNN]` tag and tag it with the originating use case ID (`@UC-[ACTOR]-[NNN]`).
8. Ensure every scenario uses **concrete, realistic values** (specification by example) and tests **one specific behaviour**.
9. Update the originating use case's `## Features` table with the new feature ID, scenario IDs, and a brief description — creating the bidirectional trace.
10. Run through the review checklist from `feature.instructions.md` before considering the feature file complete.

## Inputs

When invoking this prompt, provide:

- **Use case** — Path to the use case file to generate features from (e.g., `specification/useCases/user/calculatePercentage.md`).
- **Scope** *(optional)* — Limit to specific flows if you do not want full coverage (e.g., "main flow only", "exception flows only").
- **Additional context** *(optional)* — Any extra detail or constraints to guide scenario creation.
