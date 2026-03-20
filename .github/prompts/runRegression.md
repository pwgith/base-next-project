# Run Regression

## Purpose

Run the full suite of Cucumber business tests against the running application, one feature file at a time. Fix any failures before moving to the next feature. Produce a master checklist of results.

## Required Reading

Before starting, read **`.github/instructions/regression.instructions.md`** — it defines the exact rules for how to run tests, fix failures, align fixes with design, and track progress. Follow it exactly.

## Steps

### 1. Prepare the Environment

1. Read `regression.instructions.md`.
2. Check whether the dev server is already running (look for a `.next/dev/lock` error if you try to start it). If not running, start it as a background process: `npm run dev`.
3. Wait for the server to be ready before running any tests.

### 2. Initialise the Master Checklist

Create a `manage_todo_list` with one entry per feature file, using the feature tag as the ID. Initial status: `not-started`.

Feature files to cover (in order):

| Feature | Tag |
|---|---|
| `analyseFloorPlan.feature` | `@F-001` |
| `authentication/signUp.feature` | `@F-002` |
| `authentication/login.feature` | `@F-003` |
| `authentication/logout.feature` | `@F-004` |
| `authentication/changePassword.feature` | `@F-005` |
| `authentication/resetPassword.feature` | `@F-006` |
| `authentication/changeEmailAddress.feature` | `@F-007` |
| `authentication/accessProtectedRoute.feature` | `@F-008` |
| `authentication/userMenu.feature` | `@F-009` (verify tag before running) |
| `subscription/viewSubscriptionPlans.feature` | verify tag before running |
| `subscription/upgradeSubscription.feature` | verify tag before running |
| `subscription/downgradeSubscription.feature` | verify tag before running |
| `subscription/cancelSubscription.feature` | verify tag before running |
| `subscription/processStripeWebhook.feature` | verify tag before running |

To verify an unknown tag: `grep -m1 "@F-" specification/features/<path>.feature`

### 3. Run Each Feature (repeat for every feature in the checklist)

1. Mark the feature as `in-progress` in the checklist.
2. Run:
   ```powershell
   npx tsx ./node_modules/@cucumber/cucumber/bin/cucumber-js --tags "@F-NNN" --format progress 2>&1
   ```
3. Read the terminal output immediately after the command returns.
4. **If all scenarios pass:** mark as `completed` in the checklist. Move to the next feature.
5. **If any scenario fails:** see Step 4 below.

### 4. Fix Failures (for each failing scenario)

1. Read the full failure message from the terminal output.
2. Identify the failing scenario ID (`@S-NNN`).
3. Determine whether the **test is wrong** or the **software is wrong** (see `regression.instructions.md`).
4. Before making any code change, cross-check the intended behaviour against:
   - The feature file (source of truth)
   - The relevant use case (`specification/useCases/`, traced via `@UC-*` tag on the feature)
   - The UI design mockup (`design/ui/`) if the fix involves UI
   - The architecture instructions (`.github/instructions/architecture.instructions.md`)
   - The application design (`design/application/`) if the fix involves services or domain
5. Fix **either** the software **or** the test — never both at the same time.
6. If a specification or design document is incorrect or inconsistent, it may be corrected — but record what was changed, in which file, and why, in the checklist notes.
7. Re-run the **full feature** after each fix to confirm no regressions: use the same command as Step 3.
8. Repeat until all scenarios in the feature pass.
9. Mark the feature as `completed` in the checklist. Move to the next feature.

### 5. Final Summary

After all features have been run and all failures resolved, provide a summary:
- Total scenarios run
- Features that passed on first run
- Features that required fixes, and a brief description of what was fixed
- Any items flagged for human review
- Any specification or design documents that were modified

## Key Rules (from regression.instructions.md)

- **One feature at a time — never in parallel.**
- **Use `npx`, never `npm run`** for cucumber invocations.
- **Do not redirect output to files** — read directly from terminal output.
- **Do not pass a feature file path** as a CLI argument alongside `--tags` — use `--tags` only.
- **Do not fix test and software simultaneously.**
- **Flag any design or specification changes** in the checklist.
- To stop the dev server: `npm run stop`
