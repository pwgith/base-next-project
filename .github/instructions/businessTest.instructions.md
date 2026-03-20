````instructions
# Business Test Instructions

## Overview

Business tests are end-to-end tests that verify the application behaves as specified by the Gherkin feature files. They use **Cucumber** for test orchestration and **Playwright** for browser automation. The feature files under `./specification/features/` are the single source of truth — they are executed directly by Cucumber, not copied or duplicated.

**Key principle**: Business tests prove the system meets the use case requirements. The Gherkin scenarios *are* the tests. Step definitions, the Application class, and Page Objects exist solely to make those scenarios executable.

---

## Technology Stack

| Tool | Purpose |
|---|---|
| **Cucumber.js** (`@cucumber/cucumber`) | Gherkin test runner — reads `.feature` files and binds them to step definitions |
| **Playwright** (`@playwright/test`) | Browser automation — drives the application UI |
| **Jest** | Integration tests for the Application class |

---

## Folder Structure

```
test/
  step-definitions/          # Cucumber step definitions (one file per feature)
  support/
    application.ts           # Application class — business-level API for driving the app
    application.integration.test.ts  # Jest integration tests for Application class
    pages/                   # Page Object files (one per page/view)
    world.ts                 # Cucumber World configuration
  test-data/                 # Test fixture files (images, JSON, etc.)
specification/
  features/                  # Gherkin feature files (executed directly by Cucumber)
```

- **Do not copy** feature files into the `test/` folder. Configure Cucumber to read from `./specification/features/`.
- Filenames use **camelCase** per the project coding standard.

---

## Architecture

The test architecture has four layers. Each layer has a single responsibility and only talks to the layer directly below it.

```
Feature files  (.feature)
       ↓
Step definitions  (test/step-definitions/)
       ↓
Application class  (test/support/application.ts)
       ↓
Page Objects  (test/support/pages/)
       ↓
Playwright  (browser)
```

### Layer Rules

| Layer | Responsibility | Allowed Dependencies |
|---|---|---|
| **Feature files** | Describe business behaviour in Gherkin | — (no code) |
| **Step definitions** | Map Gherkin steps to Application class calls | Application class only |
| **Application class** | Provide business-level methods (e.g., `importPlan()`, `getPlanAnalysis()`) | Page Objects only |
| **Page Objects** | Encapsulate page structure and Playwright locators | Playwright API only |

- Step definitions must **never** use Playwright directly.
- The Application class must **never** contain locators or CSS selectors.
- Page Objects must **never** contain business logic or assertions about business rules.

---

## Feature Files

Feature files under `./specification/features/` are the tests. They are not generated — they already exist as part of the specification.

- Configure Cucumber's `features` path to point to `./specification/features/**/*.feature`.
- Each feature file tags its scenarios with `@F-NNN`, `@S-NNN`, and `@UC-*` identifiers.
- Use Cucumber tag expressions to run specific scenarios: `npx cucumber-js --tags "@F-001"`.

---

## Step Definitions

### File Location & Naming

- All step definitions live under `./test/step-definitions/`.
- **One file per feature** — the step definition file mirrors the feature file name (e.g., feature `analyseFloorPlan.feature` → step definitions in `analyseFloorPlan.steps.ts`).
- Filenames use **camelCase** with a `.steps.ts` suffix.

### Writing Step Definitions

- Each step definition delegates to the **Application class**. Keep step definition functions thin — no Playwright calls, no complex logic.
- Use Cucumber expressions (not regular expressions) for readability.
- Share state between steps via the Cucumber **World** object.

```ts
import { Given, When, Then } from "@cucumber/cucumber";
import { Application } from "../support/application";

Given("the User is on the Plans page", async function () {
  const app: Application = this.app;
  await app.navigateToPlans();
});

When("the User uploads {string}", async function (fileName: string) {
  const app: Application = this.app;
  await app.uploadFloorPlan(fileName);
});

Then("the total floor area is {float} sq m", async function (expected: number) {
  const app: Application = this.app;
  const actual = await app.getTotalFloorArea();
  assert.strictEqual(actual, expected);
});
```

### Step Reuse

- Write steps generically enough to be reused across scenarios within the same feature.
- If identical steps are needed across multiple features, extract them into a `common.steps.ts` file.

---

## Application Class

The Application class is the central orchestrator for driving the application under test. It provides **business-level methods** — named after what the user wants to do, not how the UI works.

### Responsibilities

1. **Launch the application** — start the Next.js dev server (or connect to a running instance) and open a Playwright browser.
2. **Expose business operations** — methods like `importPlan()`, `getPlanAnalysis()`, `downloadJson()`, `navigateToPlans()`.
3. **Delegate to Page Objects** — each business method coordinates one or more Page Object calls to drive the UI.
4. **Manage lifecycle** — handle browser setup, teardown, and navigation state.

### File Location

- `./test/support/application.ts`

### Example

```ts
import { Browser, BrowserContext, Page, chromium } from "playwright";
import { PlansPage } from "./pages/plansPage";
import { AnalysisResultsPage } from "./pages/analysisResultsPage";

export class Application {
  private browser!: Browser;
  private context!: BrowserContext;
  private page!: Page;
  private plansPage!: PlansPage;
  private analysisResultsPage!: AnalysisResultsPage;

  async launch(): Promise<void> {
    this.browser = await chromium.launch();
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    this.plansPage = new PlansPage(this.page);
    this.analysisResultsPage = new AnalysisResultsPage(this.page); 
  }

  async close(): Promise<void> {
    await this.browser.close();
  }

  async navigateToPlans(): Promise<void> {
    await this.plansPage.goto();
  }

  async uploadFloorPlan(fileName: string, roofHeight?: number): Promise<void> {
    await this.plansPage.uploadFile(fileName);
    if (roofHeight !== undefined) {
      await this.plansPage.setRoofHeight(roofHeight);
    }
    await this.plansPage.confirmUpload();
  }

  async getTotalFloorArea(): Promise<number> {
    return await this.analysisResultsPage.getTotalFloorArea();
  }

  async downloadJson(): Promise<string> {
    return await this.analysisResultsPage.downloadJson();
  }
}
```

### Method Naming

- Name methods after the **business action**, not the UI interaction.
- Good: `importPlan()`, `getPlanAnalysis()`, `downloadSpreadsheet()`
- Bad: `clickUploadButton()`, `fillInRoofHeightInput()`, `waitForTable()`

---

## Application Class Integration Tests

Every method on the Application class must have a corresponding **integration test** that drives the real application — **no mocks**.

### File Location

- `./test/support/application.integration.test.ts`

### Rules

1. Use **Jest** as the test runner.
2. Each test exercises one Application class method against the running application.
3. **No mocks** — these tests verify the Application class actually drives the UI correctly.
4. Launch the application in a `beforeAll` hook and close it in `afterAll`.
5. **Run after every change** to the Application class to catch regressions immediately.

### Example

```ts
import { Application } from "./application";

describe("Application", () => {
  let app: Application;

  beforeAll(async () => {
    app = new Application();
    await app.launch();
  });

  afterAll(async () => {
    await app.close();
  });

  it("navigateToPlans — opens the Plans page", async () => {
    await app.navigateToPlans();
    // Verify we're on the plans page
  });

  it("uploadFloorPlan — uploads a plan and triggers analysis", async () => {
    await app.navigateToPlans();
    await app.uploadFloorPlan("test/test-data/3bed-house.png");
    const totalArea = await app.getTotalFloorArea();
    expect(totalArea).toBeGreaterThan(0);
  });

  it("downloadJson — downloads analysis as JSON", async () => {
    const jsonPath = await app.downloadJson();
    expect(jsonPath).toBeTruthy();
  });
});
```

### Workflow

```
Edit Application class method
        ↓
Run integration test for that method
        ↓
   Pass? → Continue
   Fail? → Fix before proceeding
```

---

## Page Objects

Page Objects encapsulate every interaction with a single page or view. They hide Playwright locators and DOM structure from the rest of the test code.

### File Location & Naming

- All Page Objects live under `./test/support/pages/`.
- One file per page or major view (e.g., `plansPage.ts`, `analysisResultsPage.ts`).
- Filenames use **camelCase** per the coding standard.
- Class names use **PascalCase** (e.g., `PlansPage`, `AnalysisResultsPage`).

### Locator Rules

- **Define every locator exactly once** as a property or getter on the Page Object class.
- Never duplicate a locator — if two methods need the same element, they reference the same locator property.
- Use Playwright's recommended locator strategies in priority order:
  1. `getByRole()` — accessible role + name
  2. `getByLabel()` — form labels
  3. `getByText()` — visible text
  4. `getByTestId()` — `data-testid` attributes
  5. CSS/XPath selectors — last resort only

### Generating Page Objects

When creating or updating a Page Object, use the **Playwright MCP server** to:

1. Navigate to the target page in the running application.
2. Inspect the page to identify the correct locators for each interactive element.
3. Verify that the chosen locators are stable and unique.
4. Generate the locator definitions for the Page Object file.

**Do not guess locators.** Always use the Playwright MCP server to determine the actual page structure and confirm locator accuracy before writing the Page Object.

### Example

```ts
import { Page, Locator } from "playwright";

export class PlansPage {
  private readonly page: Page;

  // --- Locators (defined once) ---
  readonly uploadDropZone: Locator;
  readonly fileInput: Locator;
  readonly roofHeightInput: Locator;
  readonly analyseButton: Locator;
  readonly imagePreview: Locator;
  readonly validationError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.uploadDropZone = page.getByRole("button", { name: /click or drag/i });
    this.fileInput = page.locator('input[type="file"]');
    this.roofHeightInput = page.getByLabel("Default Roof Height");
    this.analyseButton = page.getByRole("button", { name: "Analyse Floor Plan" });
    this.imagePreview = page.locator("#previewArea");
    this.validationError = page.locator("#roofHeightError");
  }

  async goto(): Promise<void> {
    await this.page.goto("/plans");
  }

  async uploadFile(fileName: string): Promise<void> {
    await this.fileInput.setInputFiles(fileName);
  }

  async setRoofHeight(height: number): Promise<void> {
    await this.roofHeightInput.clear();
    await this.roofHeightInput.fill(String(height));
  }

  async confirmUpload(): Promise<void> {
    await this.analyseButton.click();
  }
}
```

---

## Cucumber World Configuration

Set up the Cucumber World to hold the Application instance and manage lifecycle.

### File Location

- `./test/support/world.ts`

### Example

```ts
import { setWorldConstructor, Before, After } from "@cucumber/cucumber";
import { Application } from "./application";

class CustomWorld {
  app!: Application;
}

setWorldConstructor(CustomWorld);

Before(async function (this: CustomWorld) {
  this.app = new Application();
  await this.app.launch();
});

After(async function (this: CustomWorld) {
  await this.app.close();
});
```

---

## Implementation Workflow

When implementing business tests for a feature file, follow this strict step-by-step process.

### Step-by-Step Execution

1. **Pick the first unimplemented step** in the feature file.
2. **Write the step definition** in the appropriate `.steps.ts` file, delegating to the Application class.
3. **Implement (or extend) the Application class method** needed by that step.
4. **Run the Application class integration test** for that method. Fix until it passes.
5. **If a new Page Object method is needed**, use the Playwright MCP server to determine locators, then implement the method. Define each locator exactly once.
6. **Run the Cucumber scenario** up to the current step. Fix until it passes.
7. **Move to the next step.** Repeat from step 1.

```
For each Gherkin step:
  Write step definition
      ↓
  Implement Application method
      ↓
  Run Application integration test → must pass
      ↓
  Implement Page Object method (use Playwright MCP for locators)
      ↓
  Run Cucumber scenario → current step must pass
      ↓
  Next step
```

**Do not skip ahead.** Each step must pass before moving to the next. This ensures every layer is verified incrementally and bugs are caught at the point of introduction.

### After All Steps Pass

- Run the **full feature** to confirm all scenarios pass end-to-end.
- Run the **full Application integration test suite** to check for regressions.

---

## Test Data

- Test fixture files (images, JSON, sample files) live under `./test/test-data/`.
- Reference test data files by relative path from the project root: `test/test-data/3bed-house.png`.
- Test data file names must match those used in the feature file scenarios exactly.

---

## Running Tests

### Cucumber (business tests)

> **Important**: Always use `npx tsx` to invoke Cucumber directly. Do **not** use `npm run test:cucumber -- --tags ...` — npm does not reliably forward arguments containing `@` to the underlying script on Windows/PowerShell, resulting in 0 scenarios being found.

```bash
# Run all business tests
npx tsx ./node_modules/@cucumber/cucumber/bin/cucumber-js

# Run a specific feature by tag
npx tsx ./node_modules/@cucumber/cucumber/bin/cucumber-js --tags "@F-001"

# Run a specific scenario by tag
npx tsx ./node_modules/@cucumber/cucumber/bin/cucumber-js --tags "@S-003"
```

### Application Integration Tests (Jest)

```bash
# Run Application class integration tests
npx jest test/support/application.integration.test.ts
```

---

## Stripe Webhook Testing

Scenarios that test subscription state changes driven by Stripe events must exercise the **real webhook handler** — never bypass it by seeding the database directly.

### Stripe CLI

Before running any payment-related tests, start the Stripe CLI in a background terminal:

```powershell
npm run stripe-cli
```

This forwards real Stripe webhook events to `localhost:3000/api/subscription/webhook`. The CLI prints the `STRIPE_WEBHOOK_SECRET` value — copy it into `.env.local` if it differs.

### Sending test webhooks

Webhook step definitions POST signed events directly to the local webhook endpoint using `stripe.webhooks.generateTestHeaderString`. This exercises the full webhook handler code path, including signature verification, idempotency checks, and DB updates.

```ts
async function sendWebhook(eventPayload: Record<string, unknown>): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const payload = JSON.stringify(eventPayload);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": header },
    body: payload,
  });
}
```

### checkout.session.completed events

The `checkout.session.completed` handler reads the plan from `session.metadata.priceId` (set by `createCheckoutSession` in the application service). This avoids a separate `stripe.subscriptions.retrieve()` API call and makes webhook tests self-contained — no real Stripe subscription ID is needed.

When writing a test step that sends a `checkout.session.completed` event:

1. Set `metadata.profileId` to the user's profile ID (retrieved from the test subscription-state API by customer ID after setup).
2. Set `metadata.priceId` to the Stripe price ID for the target plan (from `process.env.STRIPE_PRICE_ID_HOBBY` etc.).
3. Set `subscription` to any stable test string (e.g. `"sub_test_f014"`) — it is stored as `stripeSubscriptionId` but not retrieved.

```ts
const event = {
  id: `evt_test_checkout_${Date.now()}`,
  object: "event",
  type: "checkout.session.completed",
  data: {
    object: {
      id: `cs_test_${Date.now()}`,
      mode: "subscription",
      customer: customerId,
      subscription: "sub_test_f014",
      metadata: { profileId, priceId: process.env.STRIPE_PRICE_ID_HOBBY },
    },
  },
};
const res = await sendWebhook(event);
```

### Do not bypass the webhook handler

Never apply the expected post-webhook state directly via the setup API to make a test pass. If doing so is tempting, it means the real webhook path is broken and that's the bug to fix.

```ts
// ❌ WRONG — bypasses the webhook handler entirely
const res = await fetch(SETUP_URL, { body: JSON.stringify({ users: [{ subscription: { plan: "hobby" } }] }) });

// ✅ CORRECT — exercises the real handler
const res = await sendWebhook(checkoutSessionCompletedEvent);
```

### Stripe customer + subscription IDs in webhook tests

- Use `"cus_ABC123"` (or any stable fake string) as the Stripe customer ID stored in the test DB record. The webhook handler looks up the subscription by `metadata.profileId`, not by customer ID, so a real Stripe customer is not needed.
- Use any stable fake string for the Stripe subscription ID (e.g. `"sub_test_f014"`). It is written to the DB as `stripeSubscriptionId` but never retrieved via the Stripe API in the `checkout.session.completed` path.
- For `customer.subscription.updated` and `customer.subscription.deleted` events, the full subscription object is included in the event payload — use `buildStripeSubscription()` to construct it.

### Checklist for webhook scenarios

- [ ] The step definition calls `sendWebhook()` — not the setup API.
- [ ] `STRIPE_WEBHOOK_SECRET` is set in `.env.local`.
- [ ] The `checkout.session.completed` payload includes `metadata.profileId` and `metadata.priceId`.
- [ ] `profileId` is captured from the subscription-state API after test user setup.
- [ ] The Stripe CLI is running for the full test session.

---

## Review Checklist

Before considering a business test complete:

- [ ] Every scenario in the feature file has corresponding step definitions.
- [ ] Step definitions delegate to the Application class — no direct Playwright calls.
- [ ] The Application class exposes business-level methods only — no locators, no UI detail.
- [ ] Every Application class method has a passing integration test (no mocks).
- [ ] Page Objects define each locator exactly once.
- [ ] Locators were determined using the Playwright MCP server, not guessed.
- [ ] Each step was implemented and verified individually before proceeding to the next.
- [ ] All scenarios pass when run via Cucumber.
- [ ] All Application integration tests pass.
- [ ] Test data files in `test/test-data/` match the filenames used in feature scenarios.

---

## Tips

- Keep step definitions as thin as possible — they are glue, not logic.
- Name Application methods from the user's perspective, not the developer's.
- If a Page Object grows beyond ~200 lines, consider splitting it into component objects (e.g., `UploadForm`, `ResultsTable`) composed by the parent Page Object.
- Run tests frequently — after every single change, not in batches.
- When a test fails, fix it before writing more code. Never leave a broken step behind.
````
