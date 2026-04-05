# Downgrade Subscription

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-013                     |
| **Actor**        | User                           |
| **Priority**     | Medium                         |
| **Status**       | Draft                          |
| **Created**      | 2026-03-06                     |
| **Last Updated** | 2026-04-04                     |

## Summary

A signed-in user on a paid plan requests a downgrade to a lower subscription tier via the Stripe Customer Portal. Stripe manages the scheduling of the downgrade to take effect at the end of the current paid billing period, so the user retains their current plan's features until then. The application is notified of the scheduled change via a Stripe webhook.

## Preconditions

- The user is signed in with an active session (see [UC-USR-004 Login](./login.md)).
- The user is currently on a paid plan (Light or Full).
- The target plan is lower than the user's current plan.
- The user has viewed the subscription plans page (see [UC-USR-011 View Subscription Plans](./viewSubscriptionPlans.md)).

## Trigger

The user selects the "Manage Billing" action from the subscription plans page, which opens the Stripe Customer Portal where they choose to change to a lower-tier plan.

## Main Flow (Happy Path)

1. The user selects the "Manage Billing" action on the subscription plans page.
2. The system creates a Stripe Customer Portal session (server-side) and redirects the user to the Stripe-hosted portal.
3. The user selects the option to change their subscription plan within the Stripe Customer Portal.
4. The user selects the desired lower-tier plan and confirms the change in the Stripe Customer Portal.
5. Stripe schedules the downgrade to take effect at the end of the current billing period and confirms the change to the user within the portal UI.
6. Stripe delivers a `customer.subscription.updated` webhook event to the application (see [UC-SYS-001 Process Stripe Webhook](../system/processStripeWebhook.md)) indicating the scheduled plan change.
7. The application records the scheduled downgrade: the target plan and the effective date (end of current billing period).
8. The user returns to the application via the portal's return URL.
9. The subscription plans page reflects the pending scheduled downgrade and its effective date.
10. The user's current plan and features remain unchanged until the effective date.

## Alternative Flows

### User Returns Without Making a Change

- **Branches from**: Step 3 of Main Flow
- The user opens the Stripe Customer Portal but does not confirm a plan change.
- The user returns to the application via the portal's return URL.
- No changes are made. The user's plan and any prior scheduled changes are unchanged.

### Downgrade to Free Tier

- **Branches from**: Step 4 of Main Flow
- The user selects the Free plan as their target in the Customer Portal.
- As there is no "Free" plan in Stripe, this is treated as a subscription cancellation at the end of the current billing period; the user will be moved to Free when the subscription expires.
- The flow continues identically: Stripe reports the cancellation, the webhook is processed, and the system schedules the revert to Free.

### Downgrade Already Scheduled

- **Branches from**: Step 3 of Main Flow
- The Stripe Customer Portal shows the user the existing pending plan change.
- The user may update the target plan or leave the existing schedule unchanged.
- If the user changes the target plan, a new `customer.subscription.updated` event is delivered to the application, replacing the prior scheduled change.

## Exception Flows

### Downgrade Not Permitted

- **Triggered at**: Step 1 of Main Flow
- If the user is on the Free plan, no "Manage Billing" downgrade option is displayed and this use case cannot be initiated.

### Stripe API Unavailable

- **Triggered at**: Step 2 of Main Flow
- If the system cannot create a Customer Portal session (e.g., Stripe API error), it displays an error message and does not redirect the user.
- The user's current plan remains unchanged.

## Postconditions

- A scheduled downgrade is recorded in the application (sourced from the Stripe webhook) for the target plan, effective at the end of the current billing period.
- The user's current plan and features remain active until the effective date.
- At the effective date, Stripe automatically switches the user to the new plan and delivers a `customer.subscription.updated` webhook event, which the application processes to update the local subscription state (see [UC-SYS-001 Process Stripe Webhook](../system/processStripeWebhook.md)).

## Business Rules

- Downgrades are managed by **Stripe** and take effect at the **end of the current paid billing period**, not immediately.
- The billing period end date is sourced from Stripe; the application does not calculate it independently.
- The user retains full access to their current plan's features until the downgrade takes effect.
- Only one pending downgrade may be scheduled at a time; a new downgrade request in the Stripe Customer Portal replaces any existing scheduled downgrade.
- A user may not downgrade to a plan equal to or higher than their current plan; upgrades are handled by [UC-USR-012 Upgrade Subscription](./upgradeSubscription.md).
- **Free is the lowest permitted tier.** A user on the Free plan cannot downgrade further. The "Manage Billing" action is not displayed to Free plan users.
- The application never directly modifies the Stripe subscription; all plan changes are made through the Stripe Customer Portal or Stripe Checkout and confirmed via webhook.

## UI Reference

See `design/ui/subscriptionPlans.html`.

## Features

| Feature ID | Scenario IDs                       | Description            |
|------------|------------------------------------|------------------------|
| F-012      | S-075, S-076, S-077, S-078, S-079 | Downgrade subscription |

## Notes

- The automated process that applies the scheduled downgrade at the period end date is owned entirely by Stripe; the application simply receives a webhook notification when it occurs.
- If the user upgrades their plan before the scheduled downgrade takes effect, the pending downgrade is automatically cancelled by Stripe and a corresponding webhook event is delivered to the application.
- "Downgrading to Free" is modelled as a subscription cancellation in Stripe (since there is no paid "Free" plan in Stripe); the user reverts to Free when the subscription ends.
