# Create Business Tests

## Purpose

Guide the implementation of Cucumber + Playwright business tests for a Gherkin feature file. Business tests prove the application meets the use case requirements by executing the feature file scenarios against the running application.

## Required Reading

Before implementing business tests, review the following instruction files **in order**:

1. **`.github/instructions/businessTest.instructions.md`** — Primary reference. Defines the test architecture (four-layer model), folder structure, step definition conventions, Application class design, Page Object rules, integration test requirements, the step-by-step implementation workflow, and the review checklist. Follow this file exactly.
2. **`.github/instructions/architecture.instructions.md`** — Defines the system architecture: layered design (Service–Domain–Repository), module boundaries, authentication flow, and persistence strategy. Understanding the architecture helps you write tests that exercise the correct application layers and anticipate the expected data flow.
3. **`.github/instructions/feature.instructions.md`** — Describes the Gherkin feature file format, scenario IDs, and traceability tags. The feature file is the test — understand its structure before writing step definitions.
4. **`.github/instructions/useCase.instructions.md`** — Provides the originating use case with main flow, alternative flows, exception flows, and business rules. Use this to understand the business intent behind each scenario.
5. **`.github/instructions/codingStandard.instructions.md`** — Supplies naming conventions (camelCase filenames, PascalCase classes) and TypeScript rules that apply to all test code.
6. **`.github/instructions/uiDesign.instructions.md`** — Describes the design system and UI component classes. Useful context when determining Page Object locators, but **do not guess locators** — always use the Playwright MCP server.
7. **`.github/instructions/next.js.instructions.md`** — Describes the application framework. Useful for understanding how to launch the app for testing.

## Steps

Follow the strict step-by-step workflow defined in `businessTest.instructions.md`. **Do not skip ahead** — each step must pass before moving to the next.

### Setup (once per feature)

1. Read each instruction file listed above.
2. Read the **feature file** provided as input. Identify all scenarios, their IDs, and the Gherkin steps.
3. Read the **use case** the feature traces to (via the `@UC-*` tag) for business context.
4. If the HTML mockup exists in `./design/ui/`, review it for UI structure context.
5. Ensure test dependencies are installed (`@cucumber/cucumber`, `playwright`, `jest`).
6. If `./test/support/world.ts` does not exist, create the Cucumber World configuration per `businessTest.instructions.md`.
7. If `./test/support/application.ts` does not exist, create the Application class skeleton with `launch()` and `close()` methods.
8. Create the step definition file under `./test/step-definitions/` — one file per feature, named `[featureName].steps.ts`.

### Per-Step Implementation (repeat for each Gherkin step)

9. **Write the step definition** for the next unimplemented Gherkin step, delegating to the Application class. Keep it thin — no Playwright calls, no complex logic.
10. **Implement or extend the Application class method** needed by that step. Name the method after the business action, not the UI interaction.
11. **Write or extend the Application class integration test** in `./test/support/application.integration.test.ts`. The test must exercise the method against the real running application — **no mocks**.
12. **Run the integration test.** Fix until it passes.
13. **If a new Page Object method or locator is needed:**
    - Use the **Playwright MCP server** to navigate to the page and inspect the DOM.
    - Determine the correct, stable locators for each element.
    - Define each locator **exactly once** on the Page Object class.
    - Implement the Page Object method.
14. **Run the Cucumber scenario** up to the current step. Fix until it passes.
15. **Move to the next Gherkin step.** Repeat from step 9.

### After All Steps Pass

16. Run the **full feature** (`npx cucumber-js --tags "@F-NNN"`) to confirm all scenarios pass end-to-end.
17. Run the **full Application integration test suite** to check for regressions.
18. Run through the **review checklist** from `businessTest.instructions.md`.

## Key Rules

- **Feature files are the tests.** Do not copy them — Cucumber reads from `./specification/features/`.
- **One step at a time.** Implement, test, pass, then move on.
- **Step definitions are glue only.** They delegate to the Application class — no Playwright, no logic.
- **Application class methods are business-level.** Good: `uploadFloorPlan()`. Bad: `clickUploadButton()`.
- **Page Object locators are defined once.** Never duplicate a locator.
- **Locators come from Playwright MCP.** Never guess. Always inspect the running application.
- **Integration tests have no mocks.** They drive the real application.
- **Run tests after every change.** Never batch changes without verifying.

## Inputs

When invoking this prompt, provide:

- **Feature file** — Path to the feature file to implement tests for (e.g., `specification/features/analyseFloorPlan.feature`).
- **Scope** *(optional)* — Limit to specific scenarios if you do not want full coverage (e.g., `"@S-001 to @S-005 only"`, `"happy path only"`).
- **Additional context** *(optional)* — Any extra detail about the application state, test environment, or constraints.
