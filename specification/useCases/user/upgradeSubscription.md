# Upgrade Subscription

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-012                     |
| **Actor**        | User                           |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-06                     |
| **Last Updated** | 2026-03-06                     |

## Summary

A signed-in user upgrades their subscription to a higher tier (e.g., Free → Hobby, Free → Investor, or Hobby → Investor). For upgrades from the Free plan, the user is redirected to the Stripe Checkout hosted page to enter payment details. For upgrades between paid plans, the user is redirected to the Stripe Customer Portal. The upgrade takes effect immediately upon successful payment, and the subscription is managed by Stripe thereafter.

## Preconditions

- The user is signed in with an active session (see [UC-USR-004 Login](./login.md)).
- The user is currently on a plan lower than the target plan.
- The user has reviewed the available plans (see [UC-USR-011 View Subscription Plans](./viewSubscriptionPlans.md)).

## Trigger

The user selects the upgrade action for a higher-tier plan on the subscription plans page.

## Main Flow (Happy Path) — Upgrade from Free Plan

1. The user selects the upgrade action for the desired higher-tier plan.
2. The system creates a Stripe Checkout session (server-side), specifying the Stripe Price ID for the selected plan and the user's profile.
3. The system redirects the user to the Stripe-hosted Checkout page.
4. The user reviews the plan and pricing summary displayed by Stripe Checkout.
5. The user enters their payment details and confirms the subscription in Stripe Checkout.
6. Stripe processes the payment and, on success, redirects the user back to the application's success callback URL.
7. The application's success page confirms the upgrade and displays the user's new plan.
8. In parallel, Stripe delivers a `checkout.session.completed` webhook event to the application (see [UC-SYS-001 Process Stripe Webhook](../system/processStripeWebhook.md)), which updates the subscription record with the Stripe subscription ID and new plan.
9. The user now has access to the features and limits of the new plan.

## Alternative Flow — Upgrade Between Paid Plans (e.g., Hobby → Investor)

- **Branches from**: Step 1 of Main Flow
- Instead of Stripe Checkout, the system creates a Stripe Customer Portal session for the user.
- The system redirects the user to the Stripe Customer Portal where they can change their plan.
- The user selects the higher-tier plan in the portal and confirms.
- Stripe applies the upgrade immediately and delivers a `customer.subscription.updated` webhook event to the application (see [UC-SYS-001 Process Stripe Webhook](../system/processStripeWebhook.md)), which updates the subscription record.
- The user returns to the application via the portal's return URL and sees their updated plan.

## Alternative Flows

### User Cancels in Stripe Checkout

- **Branches from**: Step 4 of Main Flow
- The user clicks "Back" or abandons the Stripe Checkout page.
- Stripe redirects the user back to the application's cancel callback URL.
- No subscription is created and no payment is taken.
- The user's plan remains unchanged.
- The system returns the user to the subscription plans page.

## Exception Flows

### Payment Fails in Stripe Checkout

- **Triggered at**: Step 5 of Main Flow
- The payment provider declines the card or returns an error.
- Stripe Checkout displays an error message within its hosted UI and invites the user to correct their payment details or try a different card.
- The application's subscription record is not updated until a `checkout.session.completed` event is received.
- The user's current plan remains active.

### Upgrade Not Permitted

- **Triggered at**: Step 1 of Main Flow
- If the user is already on the highest available plan, the upgrade option is not shown and this use case cannot be initiated.

### Stripe API Unavailable

- **Triggered at**: Step 2 of Main Flow
- If the system cannot create a Checkout or Customer Portal session (e.g., Stripe API error), it displays an error message and does not redirect the user.
- The user's current plan remains unchanged.

## Postconditions

- The user's subscription is managed by Stripe and updated to the new higher-tier plan.
- The application's subscription record holds the Stripe subscription ID, customer ID, and current plan, sourced from the Stripe webhook.
- The user immediately has access to the features and limits of the new plan.
- For new subscriptions (Free → Paid), a Stripe customer record and subscription record are created for the user.

## Business Rules

- Upgrades from Free to a paid plan are processed via **Stripe Checkout**.
- Upgrades between paid plans are processed via the **Stripe Customer Portal**.
- The application never stores card details; all payment data is handled by Stripe.
- The application does not activate the new plan until a valid Stripe webhook event confirms the successful payment.
- Upgrades take effect **immediately** upon Stripe confirming the subscription.
- A user may only upgrade to a tier **higher** than their current plan; lateral or downward moves are handled by separate use cases.
- The available upgrade paths are:
  - Free → Hobby
  - Free → Investor
  - Hobby → Investor
- The Stripe Price ID for each plan is stored as a server-side environment variable; it is never sent to the client.

## UI Reference

None at this time.

## Features

| Feature ID | Scenario IDs                       | Description          |
|------------|------------------------------------|----------------------|
| F-011      | S-072, S-073, S-074, S-087, S-088 | Upgrade subscription |

## Notes

- The `checkout.session.completed` and `customer.subscription.updated` Stripe webhook events are processed by the system (see [UC-SYS-001 Process Stripe Webhook](../system/processStripeWebhook.md)).
- If the user's browser closes before the redirect back from Stripe Checkout, the subscription will still be activated when the webhook is processed.
- The success and cancel callback URLs must be registered as allowed redirect URLs in the Stripe dashboard.
- Pro-ration for mid-cycle upgrades between paid plans is managed automatically by Stripe based on the configured proration behaviour in the Stripe Product settings.
