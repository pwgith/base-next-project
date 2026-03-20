@F-014 @UC-SYS-001
Feature: Process Stripe webhook
  As the system
  I want to receive and process Stripe webhook events
  So that the application's subscription state stays in sync with Stripe

  @S-090 @UC-SYS-001
  Scenario: Valid checkout.session.completed webhook activates a new paid subscription
    Given a user profile exists with Stripe customer ID "cus_ABC123"
    And the user is on the "Free" plan
    When Stripe sends a valid "checkout.session.completed" webhook for customer "cus_ABC123" with plan "Hobby"
    Then the user's subscription is updated to "Hobby" with status "active"
    And the Stripe subscription ID is recorded against the user's profile

  @S-091 @UC-SYS-001
  Scenario: Valid customer.subscription.updated webhook records a scheduled downgrade
    Given a user profile exists with Stripe customer ID "cus_ABC123"
    And the user is subscribed to the "Investor" plan
    When Stripe sends a valid "customer.subscription.updated" webhook for customer "cus_ABC123" indicating a downgrade to "Hobby" at "2026-04-06"
    Then the user's current plan remains "Investor"
    And a downgrade to "Hobby" is recorded as scheduled for "2026-04-06"

  @S-092 @UC-SYS-001
  Scenario: Valid customer.subscription.updated webhook records a pending cancellation
    Given a user profile exists with Stripe customer ID "cus_ABC123"
    And the user is subscribed to the "Hobby" plan
    When Stripe sends a valid "customer.subscription.updated" webhook for customer "cus_ABC123" indicating cancellation at "2026-04-06"
    Then the user's current plan remains "Hobby"
    And a cancellation is recorded as scheduled for "2026-04-06"

  @S-093 @UC-SYS-001
  Scenario: Valid customer.subscription.deleted webhook reverts the user to the Free plan
    Given a user profile exists with Stripe customer ID "cus_ABC123"
    And the user is subscribed to the "Hobby" plan with a pending cancellation
    When Stripe sends a valid "customer.subscription.deleted" webhook for customer "cus_ABC123"
    Then the user's plan is updated to "Free"
    And the subscription status is set to "inactive"

  @S-094 @UC-SYS-001
  Scenario: Webhook with an invalid signature is rejected without modifying state
    Given the application has a configured Stripe webhook secret
    When Stripe sends a webhook with an invalid signature
    Then the system returns HTTP 400
    And no subscription state is changed

  @S-095 @UC-SYS-001
  Scenario: Duplicate webhook event is ignored after already being processed
    Given a user profile exists with Stripe customer ID "cus_ABC123"
    And the "checkout.session.completed" event with ID "evt_001" has already been processed for this customer
    When Stripe resends the "checkout.session.completed" webhook with event ID "evt_001"
    Then the system returns HTTP 200
    And no duplicate subscription record is created

  @S-096 @UC-SYS-001
  Scenario: Unrecognised Stripe customer ID in webhook is acknowledged without state change
    Given no user profile exists for Stripe customer ID "cus_UNKNOWN"
    When Stripe sends a valid "checkout.session.completed" webhook for customer "cus_UNKNOWN"
    Then the system returns HTTP 200
    And no subscription state is changed

  @S-098 @UC-SYS-001
  Scenario: checkout.session.completed with an unrecognised price ID does not revert plan to Free
    Given a user profile exists with Stripe customer ID "cus_ABC123"
    And the user is subscribed to the "Hobby" plan
    When Stripe sends a "checkout.session.completed" webhook for customer "cus_ABC123" with an unrecognised price ID
    Then the user's subscription remains "Hobby"
