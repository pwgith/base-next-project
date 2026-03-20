# Update Subscription Plan Prices

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-ADM-001                     |
| **Actor**        | Admin                          |
| **Priority**     | Medium                         |
| **Status**       | Draft                          |
| **Created**      | 2026-03-09                     |
| **Last Updated** | 2026-03-09                     |

## Summary

The admin updates the unit price of one or more subscription plans directly in the Stripe Dashboard. Because the application fetches plan prices from the Stripe API at runtime, the updated prices are automatically reflected in the app for all users without any code change or redeployment.

## Preconditions

- The admin has access to the Stripe Dashboard for the application's Stripe account.
- The application is configured to fetch plan prices from the Stripe API using the `STRIPE_SECRET_KEY` environment variable.
- The Stripe products for the Hobby and Investor plans are already created in Stripe and linked to the application via their Stripe Price IDs.

## Trigger

The admin decides to change the monthly price of one or more subscription tiers (e.g., to reflect a promotional rate, a market-rate adjustment, or a correction).

## Main Flow (Happy Path)

1. The admin opens the Stripe Dashboard and navigates to the Products section.
2. The admin locates the product representing the subscription plan to update (e.g., "Hobby").
3. The admin creates a new price for the product at the desired amount and currency (e.g., AUD A$3.00 / month), and archives the old price.
4. The admin updates the application's configuration (e.g., environment variable or database record) to reference the new Stripe Price ID for the relevant plan, if Price IDs have changed.
5. A user views the subscription plans page in the application.
6. The application fetches the current price for each plan from the Stripe API using the configured Price ID.
7. The system displays the price returned by Stripe against each plan.
8. The user sees the updated price, matching what was set in the Stripe Dashboard.

## Alternative Flows

### Price Change Without a New Price ID

- **Branches from**: Step 3 of Main Flow
- The admin edits the existing price's metadata or description but does not create a new Price object (e.g., updating a display label only).
- No application configuration change is required.
- Continues at Step 5.

## Exception Flows

### Stripe API Unavailable at Page Load

- **Triggered at**: Step 6 of Main Flow
- The application cannot reach the Stripe API to fetch the current price.
- The system displays an error state or cached/fallback values, and logs the failure.
- The subscription plans page may be unavailable or show degraded information until Stripe connectivity is restored.

### Misconfigured Price ID

- **Triggered at**: Step 6 of Main Flow
- The Price ID configured in the application does not match any active price in Stripe (e.g., the old price was archived without updating the config).
- The Stripe API returns an error for the lookup.
- The system logs the configuration error and surfaces an appropriate error to the user.

## Postconditions

- The subscription plans page displays the price currently configured in Stripe for each plan.
- No application code changes or redeployments are required for a price change to be visible to users.

## Business Rules

- Plan prices are **not hardcoded** in the application. The application always retrieves prices from the Stripe API at runtime.
- Stripe is the **single source of truth** for subscription plan prices.
- All prices are displayed in Australian Dollars (AUD), formatted as `A$X.XX / month`.
- The application must always display the **currently active** Stripe price for each plan, not any archived or draft price.
- The Free plan has no Stripe price; it is displayed as `A$0 / month` by convention.

## UI Reference

None at this time.

## Features

| Feature ID | Scenario IDs | Description                                           |
|------------|--------------|-------------------------------------------------------|
| F-010      | S-099        | Plan prices are sourced from Stripe and auto-update   |
