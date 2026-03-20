# Regression Testing Instructions

## Two Modes of Running Tests

### Full Regression

Run every feature file in order, **one at a time**. Fix all failures before moving to the next feature. Use the Master Checklist to track progress.

### Targeted Regression

When working on a specific feature, run only that feature's tag. Do not run other features. Fix failures in that feature until it is fully green, then stop.

---

## Running Tests

- Always use `npx` — not `npm run` — to invoke cucumber. npm does not pass CLI arguments reliably.
- **Do not use shell output redirection** (e.g. `> file.txt` or `2>&1 > file.txt`). This triggers VS Code file-write approval prompts which interrupt the process.
- **Do** use Cucumber's built-in `--format json:<file>` flag. This writes directly via Cucumber's own file writer (no shell redirection, no VS Code prompt) and is the correct way to capture structured failure details.
- To kill the dev server: `npm run stop`
- Check if the dev server is already running before trying to start it. Look for `.next/dev/lock` errors — if present, a server is already up.
- The cucumber config in `cucumber.mjs` already sets `paths` to `specification/features/**/*.feature`. **Do not** also pass a feature file path as a CLI argument — it will be merged (not overridden) and cause duplicate runs. Use `--tags` to scope runs instead.

## Stripe CLI (Payment Features)

Before running any payment-related feature (`@F-011`, `@F-012`, `@F-013`, `@F-014`), the Stripe CLI must be running in a **background terminal**:

```powershell
npm run stripe-cli
```

This runs `stripe listen --forward-to localhost:3000/api/subscription/webhook`. It:
- Forwards real Stripe webhook events to the local dev server.
- Prints the `STRIPE_WEBHOOK_SECRET` value for your `.env.local` (copy it in if it differs).

**The CLI must remain running for the full duration of a payment test run.** Without it, webhook events from Stripe will never reach the local server and subscription state will not be updated.

### Do not mock or skip webhook callbacks

When a test scenario requires a webhook callback (e.g. `checkout.session.completed`, `customer.subscription.updated`), **do not bypass the webhook pathway** by seeding state directly via the setup API instead. The Stripe CLI is there specifically to handle these callbacks in the test environment. Tests that skip the webhook path do not verify that the actual integration works end-to-end.

## Command Format

Always run with **two formatters**: `progress` for a compact pass/fail summary in the terminal, and `json` to write structured results to a file for failure analysis. The two formatters are independent — `progress` goes to stdout, `json` writes to the file.

```powershell
npx tsx ./node_modules/@cucumber/cucumber/bin/cucumber-js --tags "@F-NNN" --format progress --format json:cucumber-results.json 2>&1
```

## Reading Failure Details

Terminal output (even with `2>&1`) is capped at ~60 KB and will be truncated when Cucumber prints full stack traces. **Never rely on terminal output alone for failure details.** After any run that exits with code 1:

1. Read `cucumber-results.json` directly with PowerShell to extract only the failed steps:

```powershell
$json = Get-Content cucumber-results.json -Raw | ConvertFrom-Json
$json | ForEach-Object { $_.elements } | ForEach-Object {
  $scenario = $_
  $failed = $scenario.steps | Where-Object { $_.result.status -eq 'failed' }
  if ($failed) {
    Write-Host "FAILED: $($scenario.name) [$($scenario.id)]"
    $failed | ForEach-Object {
      Write-Host "  Step: $($_.keyword)$($_.name)"
      Write-Host "  Error: $($_.result.error_message.Substring(0, [Math]::Min(800, $_.result.error_message.Length)))"
    }
  }
}
```

2. This gives you the scenario name, failing step, and the first 800 characters of the error message — enough to diagnose almost every failure without truncation.
3. If 800 characters is not enough for a particular error, increase the `Substring` length or read the raw JSON file directly with `read_file`.

## Feature File → Tag Reference

`*` = requires Stripe CLI (`npm run stripe-cli`) to be running first.

| Feature File | Tag | Stripe CLI |
|---|---|---|
| `analyseFloorPlan.feature` | `@F-001` | |
| `authentication/signUp.feature` | `@F-002` | |
| `authentication/login.feature` | `@F-003` | |
| `authentication/logout.feature` | `@F-004` | |
| `authentication/changePassword.feature` | `@F-005` | |
| `authentication/resetPassword.feature` | `@F-006` | |
| `authentication/changeEmailAddress.feature` | `@F-007` | |
| `authentication/accessProtectedRoute.feature` | `@F-008` | |
| `authentication/userMenu.feature` | `@F-009` | |
| `subscription/viewSubscriptionPlans.feature` | `@F-010` | |
| `subscription/upgradeSubscription.feature` | `@F-011` | `*` |
| `subscription/downgradeSubscription.feature` | `@F-012` | `*` |
| `subscription/cancelSubscription.feature` | `@F-013` | `*` |
| `subscription/processStripeWebhook.feature` | `@F-014` | `*` |

## Fixing Failed Tests

- When a test fails, first determine: **is the test correct and the software wrong, or is the test wrong?**
- Fix software OR fix the test — never both at the same time. Changing both simultaneously makes it impossible to know which change resolved the issue.
- After fixing, re-run the full feature file to confirm no regressions were introduced.

## Aligning Software Fixes with Design

Before making any code change to fix a failing test, cross-check the intended behaviour against all relevant specification artefacts:

1. **Feature file** (`specification/features/`) — the scenario is the source of truth for what the software must do.
2. **Use case** (`specification/useCases/`) — understand the main flow, alternative flows, exception flows, and business rules that the scenario is exercising. The `@UC-*` tag on the feature file identifies the relevant use case.
3. **UI design** (`design/ui/`) — if the fix involves a UI element, check the HTML mockup to confirm the correct structure, labels, and component behaviour before changing any page or component.
4. **Architecture** (`.github/instructions/architecture.instructions.md`) — ensure the fix respects the layered design (Service–Domain–Repository), module boundaries, and authentication flow. Do not violate layer boundaries to make a test pass.
5. **Application design** (`design/application/`) — if the fix touches a service or domain concept, verify it aligns with the application design document for that feature.

If a fix would require deviating from any of the above, stop and flag it for human review rather than guessing.

If a design document or specification is itself wrong or internally inconsistent, it **may** be corrected — but this must be explicitly flagged. Record what was changed, in which file, and why, in the session checklist. Do not silently update specifications as a side effect of fixing a test failure.

## Master Checklist (Full Regression Only)

For full regression, use a `manage_todo_list` to track each feature file. Include:
- Feature name and tag
- Status: not-started | in-progress | passed | failed | fixed
- Any failing scenario IDs and their fix status

Resume from the checklist if the session is interrupted.

For targeted regression, no checklist is needed — just run the single feature and fix until green.

## Inefficiencies to Avoid

- Do not `sleep` or wait arbitrary durations before reading results — read terminal output immediately after the command returns.
- Do not use shell redirection (`>`, `>>`) to write output to files — use `--format json:<file>` instead.
- Do not rely on terminal output alone for failure details — it is truncated at ~60 KB. Always parse `cucumber-results.json` for failures.
- Do not start the dev server if it is already running.