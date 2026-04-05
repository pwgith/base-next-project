# View Subscription Plans

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-011                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-06                     |
| **Last Updated** | 2026-04-04                     |


## Summary

A signed-in user views the available subscription plans — Free, Light, and Full — along with their features and usage limits, and can see which plan they are currently on.

## Preconditions

- The user is signed in with an active session (see [UC-USR-004 Login](./login.md)).

## Trigger

The user navigates to the subscription or billing section of the application.

## Main Flow (Happy Path)

1. The user navigates to the subscription plans page.
2. The system displays all three available plans: Free, Light, and Full.
3. For each plan the system shows:
   - The plan name and price (or "Free" for the free tier).
   - The features included in the plan.
   - Usage limits that apply (e.g., number of analyses per month) or "Unlimited" where no limit applies.
4. The system highlights the plan the user is currently subscribed to.
5. For each plan that is different from the user's current plan, the system shows an action to switch to that plan.
6. The user reviews the plans.

## Alternative Flows

### User Is on Free Plan

- **Branches from**: Step 4 of Main Flow
- The system indicates the user is on the Free plan.
- Upgrade actions are shown for the Light and Full plans.
- No downgrade or cancel action is shown.
- Selecting an upgrade action initiates [UC-USR-012 Upgrade Subscription](./upgradeSubscription.md).

### User Is on a Paid Plan

- **Branches from**: Step 4 of Main Flow
- The system retrieves the user's current subscription details from Stripe, including the plan name, current billing period start date, and next billing date.
- The system displays the current plan, billing start date, and next renewal date sourced from Stripe.
- If higher-tier plans exist above the current plan, upgrade actions are shown.
- A "Manage Billing" action is shown, which opens the Stripe Customer Portal where the user can downgrade, cancel, or update payment details (see [UC-USR-013 Downgrade Subscription](./downgradeSubscription.md) and [UC-USR-014 Cancel Subscription](./cancelSubscription.md)).
- Selecting an upgrade action initiates [UC-USR-012 Upgrade Subscription](./upgradeSubscription.md).

### Pending Downgrade or Cancellation Exists

- **Branches from**: Step 4 of Main Flow
- If Stripe reports a scheduled downgrade or cancellation at the end of the current billing period, the system displays the pending change and its effective date alongside the current plan.
- The user may still open the Stripe Customer Portal to review or reverse the scheduled change.

## Exception Flows

### Page Unavailable

- **Triggered at**: Step 1 of Main Flow
- If the subscription page cannot be loaded, the system displays an error message and invites the user to try again.

## Postconditions

- The user has viewed the plan information. No state has changed.

## Business Rules

- The three subscription tiers are **Free**, **Light**, and **Full**, in ascending order.
- Every new account starts on the **Free** plan by default.
- **Free is the lowest tier**; a user can never be placed on a plan below Free.
- Each tier provides access to a defined set of features and usage limits as specified in the feature configuration.
- Some features are available on all tiers (possibly with different limits); others are restricted to higher tiers.
- The Free tier has no cost and no billing cycle.
- Paid tiers (Light, Full) are billed on a recurring cycle managed by Stripe, starting from the initial subscription date.
- Billing details (current period start, current period end, next billing date) are sourced directly from the Stripe API at page load time; the application does not duplicate this data locally.
- Downgrade, cancellation, and payment method management for paid plans are performed in the **Stripe Customer Portal**, not within the application UI.

## UI Reference

See `design/ui/subscriptionPlans.html`.

## Features

| Feature ID | Scenario IDs                                             | Description               |
|------------|----------------------------------------------------------|---------------------------|
| F-010      | S-068, S-069, S-070, S-071, S-084, S-085, S-086, S-097, S-099 | View subscription plans   |

## Notes

- The exact feature matrix (which features are available or limited per tier) will be defined in a separate feature configuration document.
- This use case is purely informational; all plan-change actions delegate to dedicated use cases or redirect to the Stripe Customer Portal.
- Billing data is fetched from the Stripe API server-side on each page load to ensure accuracy; no local caching of billing dates is performed.
