# Cancel Subscription

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-014                     |
| **Actor**        | User                           |
| **Priority**     | Medium                         |
| **Status**       | Draft                          |
| **Created**      | 2026-03-06                     |
| **Last Updated** | 2026-03-06                     |

## Summary

A signed-in user on a paid plan cancels their subscription via the Stripe Customer Portal. Stripe schedules the cancellation to take effect at the end of the current paid billing period. The application is notified via a Stripe webhook and updates the local subscription state. The subscription remains active until the period ends, after which it automatically reverts to the Free plan.

## Preconditions

- The user is signed in with an active session (see [UC-USR-004 Login](./login.md)).
- The user is currently on a paid plan (Hobby or Investor) that is active and not already scheduled for cancellation.
- The user has viewed the subscription plans page (see [UC-USR-011 View Subscription Plans](./viewSubscriptionPlans.md)).

## Trigger

The user selects the "Manage Billing" action from the subscription plans page, which opens the Stripe Customer Portal where they choose to cancel their subscription.

## Main Flow (Happy Path)

1. The user selects the "Manage Billing" action on the subscription plans page.
2. The system creates a Stripe Customer Portal session (server-side) and redirects the user to the Stripe-hosted portal.
3. The user selects the cancellation option within the Stripe Customer Portal.
4. Stripe displays confirmation details showing the current plan and the date it will end.
5. The user confirms the cancellation in the Stripe Customer Portal.
6. Stripe schedules the cancellation at the end of the current billing period and confirms to the user within the portal UI that no further payments will be taken.
7. Stripe delivers a `customer.subscription.updated` (or `customer.subscription.deleted`) webhook event to the application (see [UC-SYS-001 Process Stripe Webhook](../system/processStripeWebhook.md)).
8. The application records the cancellation and the scheduled revert-to-Free date (end of current billing period).
9. The user returns to the application via the portal's return URL.
10. The subscription plans page reflects the pending cancellation and its effective date.
11. The user continues to have full access to their current plan's features until the period end date.

## Alternative Flows

### User Returns Without Cancelling

- **Branches from**: Step 3 of Main Flow
- The user opens the Stripe Customer Portal but does not confirm cancellation.
- The user returns to the application via the portal's return URL.
- No changes are made. The user's subscription continues as normal.

### Cancellation Already Pending

- **Branches from**: Step 1 of Main Flow
- If Stripe already reports a pending cancellation (sourced at page load), the subscription plans page informs the user that a cancellation is already scheduled and shows the effective date.
- The user may still open the Stripe Customer Portal to reverse the cancellation if desired.

## Exception Flows

### Cancellation Not Permitted

- **Triggered at**: Step 1 of Main Flow
- If the user is on the Free plan, the "Manage Billing" cancel option is not presented.

### Stripe API Unavailable

- **Triggered at**: Step 2 of Main Flow
- If the system cannot create a Customer Portal session (e.g., Stripe API error), it displays an error message and does not redirect the user.
- The user's subscription remains unchanged.

## Postconditions

- The cancellation is recorded in the application (sourced from the Stripe webhook); no further payments will be charged.
- The user's current paid plan remains active until the billing period end date.
- On the billing period end date, Stripe finalises the cancellation and delivers a webhook event; the application updates the user's plan to Free (see [UC-SYS-001 Process Stripe Webhook](../system/processStripeWebhook.md)).

## Business Rules

- Cancellation does **not** take effect immediately; it is scheduled by Stripe to run to the end of the current paid billing period.
- After the period ends, the account reverts to the **Free** plan automatically, driven by a Stripe webhook event processed by the application.
- No refund is issued for the remaining days on the current billing period.
- No future payment is taken once cancellation is confirmed.
- The user may choose to re-subscribe at any time before or after the cancellation takes effect, which initiates [UC-USR-012 Upgrade Subscription](./upgradeSubscription.md).
- If an upgrade is applied before the cancellation takes effect, Stripe automatically removes the pending cancellation; the application processes the corresponding webhook event.
- The application never directly modifies the Stripe subscription; all cancellations are performed through the Stripe Customer Portal and confirmed via webhook.

## UI Reference

None at this time.

## Features

| Feature ID | Scenario IDs                        | Description           |
|------------|-------------------------------------|-----------------------|
| F-013      | S-080, S-081, S-082, S-083          | Cancel subscription   |

## Notes

- The automated revert of the account to Free at period end is owned entirely by Stripe and triggers a webhook event that the application processes (see [UC-SYS-001 Process Stripe Webhook](../system/processStripeWebhook.md)).
- "Re-subscribing" after cancellation follows the same path as [UC-USR-012 Upgrade Subscription](./upgradeSubscription.md), redirecting to Stripe Checkout.
