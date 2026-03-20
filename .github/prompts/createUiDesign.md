# Create UI Design

## Purpose

Guide the creation of standalone HTML mockup files that stakeholders can open in a browser to review the look and feel of a page before any application code is written.

## Required Reading

Before creating a UI mockup, review the following instruction files **in order**:

1. **`.github/instructions/uiDesign.instructions.md`** — Primary reference. Defines the design system, component library, colour palette, typography, spacing, responsive breakpoints, mockup file template, naming conventions, and requirements. Follow this file exactly.
2. **`.github/instructions/useCase.instructions.md`** — Describes use case structure and flows. The mockup must faithfully represent the interactions described in the originating use case (main flow, alternative flows, exception flows).
3. **`.github/instructions/codingStandard.instructions.md`** — Supplies naming conventions (camelCase filenames) and project structure rules that apply to mockup files.
4. **`.github/instructions/feature.instructions.md`** — Provides Gherkin scenarios with concrete example data. Use the realistic values from scenario steps and `Examples` tables as sample data in the mockup.

## Steps

1. Read each instruction file listed above.
2. Read the use case file provided as input. Identify the actor, main flow, alternative flows, exception flows, and any UI-relevant business rules.
3. If feature files exist for the use case, read them to extract concrete sample data from scenarios and `Examples` tables.
4. Create the mockup HTML file under `./design/ui/` using **camelCase** naming (e.g., `calculatePercentage.html`, `convertUnits.html`).
5. Use the mockup file template from `uiDesign.instructions.md` as the starting point. Include:
   - Tailwind CSS via CDN.
   - Inter font from Google Fonts.
   - Design system component classes (`.btn`, `.form-card`, `.feature-grid`, etc.) implemented in a `<style>` block using Tailwind `@apply`.
6. Build the page markup to cover:
   - **Main flow** — The primary UI state showing inputs, actions, and expected output.
   - **Alternative flows** — Any alternate states or variations visible in the UI (e.g., different input modes).
   - **Exception flows** — Error states, validation messages, and empty states using the appropriate alert components.
   - **Loading states** — Use the design system's loading spinner where the UI would wait for a result.
7. Populate the mockup with **realistic sample data** derived from feature file scenarios. Avoid lorem ipsum.
8. Add optional vanilla JavaScript to simulate interactions that help convey the intended user experience (e.g., toggling states, showing/hiding results, sample calculations). Do **not** implement real application logic.
9. Verify the mockup is **self-contained** — it must be viewable by opening the file directly in a browser with no build step or server.
10. Verify **responsive behaviour** — the mockup must work at mobile (320px), tablet (768px), and desktop (1024px+) breakpoints.
11. Verify **accessibility** — proper semantic HTML, ARIA labels, keyboard navigation, and sufficient colour contrast.
12. Update the originating use case's `## UI Reference` section with the path to the new mockup file (e.g., `./design/ui/calculatePercentage.html`).

## Inputs

When invoking this prompt, provide:

- **Use case** — Path to the use case file the mockup is based on (e.g., `specification/useCases/user/calculatePercentage.md`).
- **Page name** *(optional)* — Override the default filename if the page does not map one-to-one with the use case.
- **Additional context** *(optional)* — Any extra design direction, content notes, or constraints.
