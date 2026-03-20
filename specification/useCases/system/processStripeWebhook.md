# Process Stripe Webhook

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-SYS-001                     |
| **Actor**        | System (triggered by Stripe)   |
| **Priority**     | High                           |
| **Status**       | Draft                          |
| **Created**      | 2026-03-06                     |
| **Last Updated** | 2026-03-06                     |

## Summary

The system receives an incoming webhook event from Stripe and updates the application's subscription state accordingly. This use case describes how the system processes the events that result from user-initiated Stripe Checkout completions and Stripe Customer Portal actions (see [UC-USR-012 Upgrade Subscription](../user/upgradeSubscription.md), [UC-USR-013 Downgrade Subscription](../user/downgradeSubscription.md), and [UC-USR-014 Cancel Subscription](../user/cancelSubscription.md)).

## Preconditions

- The application's Stripe webhook endpoint is registered in the Stripe dashboard.
- The `STRIPE_WEBHOOK_SECRET` environment variable is configured server-side with the Stripe webhook signing secret.
- The incoming request arrives at the application's webhook API route.

## Trigger

Stripe delivers an HTTP POST to the application's webhook endpoint after a subscription-related event occurs on Stripe's platform.

## Main Flow (Happy Path)

1. Stripe sends an HTTP POST to the application's webhook endpoint with an event payload and a `Stripe-Signature` header.
2. The system verifies the `Stripe-Signature` header using the `STRIPE_WEBHOOK_SECRET` to confirm the request originated from Stripe. If the signature is invalid, the system returns HTTP 400 and discards the request.
3. The system reads the event type from the payload and routes to the appropriate handler:
   - `checkout.session.completed` → Subscription created (see Alternative Flow: Checkout Completed).
   - `customer.subscription.updated` → Subscription changed (see Alternative Flow: Subscription Updated).
   - `customer.subscription.deleted` → Subscription ended (see Alternative Flow: Subscription Deleted).
   - `invoice.payment_failed` → Payment failure (see Alternative Flow: Payment Failed).
   - All other event types → the system logs the event type and returns HTTP 200 without any state change.
4. The handler extracts the Stripe customer ID and subscription details from the event payload.
5. The system looks up the application profile associated with the Stripe customer ID.
6. The system updates the profile's subscription record with the new plan, status, current period start, and current period end.
7. The system returns HTTP 200 to Stripe to acknowledge receipt.

## Alternative Flows

### Checkout Completed (`checkout.session.completed`)

- **Branches from**: Step 3 of Main Flow
- The user has successfully completed Stripe Checkout (upgrading from Free to a paid plan).
- The system creates or updates the application's subscription record for the user, recording the Stripe customer ID, Stripe subscription ID, plan, status (`active`), and the billing period dates.
- Continues at Step 7.

### Subscription Updated (`customer.subscription.updated`)

- **Branches from**: Step 3 of Main Flow
- The user has changed their plan in the Stripe Customer Portal (upgrade between paid plans, downgrade scheduled, or cancellation scheduled).
- The system updates the existing subscription record with the new plan, status, and current and next period dates.
- If the event indicates `cancel_at_period_end: true`, the system records the pending cancellation date.
- If the event indicates a different plan taking effect at period end, the system records the pending downgrade.
- Continues at Step 7.

### Subscription Deleted (`customer.subscription.deleted`)

- **Branches from**: Step 3 of Main Flow
- The Stripe subscription has ended (billing period has expired after cancellation or downgrade to Free).
- The system updates the subscription record to reflect `Free` plan and `inactive` status.
- Continues at Step 7.

### Payment Failed (`invoice.payment_failed`)

- **Branches from**: Step 3 of Main Flow
- Stripe was unable to collect payment for a renewal invoice.
- The system updates the subscription record status to reflect the payment failure (e.g., `past_due`).
- The application may surface a warning to the user on their next login or page load.
- Continues at Step 7.

## Exception Flows

### Invalid Webhook Signature

- **Triggered at**: Step 2 of Main Flow
- The `Stripe-Signature` header is missing, expired, or does not match the expected HMAC.
- The system returns HTTP 400 and discards the request. No state is modified.
- The system logs the failure for monitoring.

### Profile Not Found for Stripe Customer

- **Triggered at**: Step 5 of Main Flow
- The Stripe customer ID in the event payload does not correspond to any application profile.
- The system logs the error and returns HTTP 200 to Stripe (to prevent retries for orphaned customers).
- No state is modified.

### Unhandled Event Type

- **Triggered at**: Step 3 of Main Flow
- The event type is not one the system handles.
- The system logs the event type and returns HTTP 200 to Stripe.

## Postconditions

- The application's subscription record accurately reflects the subscription state reported by Stripe.
- Stripe has received an HTTP 200 acknowledgement and will not retry the event.

## Business Rules

- **Webhook signature verification is mandatory.** Any request without a valid `Stripe-Signature` is rejected immediately.
- The webhook endpoint must respond with HTTP 200 within Stripe's timeout window (typically 30 seconds); slow processing is deferred to a background task if needed.
- The system must be idempotent: processing the same webhook event twice must not create duplicate records or corrupt state. Use the Stripe event ID to detect and skip already-processed events.
- The `STRIPE_WEBHOOK_SECRET` is a server-side-only environment variable; it is never exposed to the client or bundled into client code.
- Stripe may deliver events out of order; the system must handle this gracefully (e.g., by comparing event timestamps before overwriting newer state with older state).

## UI Reference

None — this use case is entirely server-side with no UI interaction.

## Features

| Feature ID | Scenario IDs             | Description                    |
|------------|--------------------------|--------------------------------|
| F-014      | S-090, S-091, S-092, S-093, S-094 | Process Stripe webhook  |

## Notes

- The webhook endpoint URL must be registered in the Stripe dashboard under "Webhooks" and configured to deliver the events listed in the Main Flow.
- The `STRIPE_WEBHOOK_SECRET` for webhook signature verification is distinct from the `STRIPE_SECRET_KEY` used for API calls.
- See also: [UC-USR-012 Upgrade Subscription](../user/upgradeSubscription.md), [UC-USR-013 Downgrade Subscription](../user/downgradeSubscription.md), [UC-USR-014 Cancel Subscription](../user/cancelSubscription.md).
