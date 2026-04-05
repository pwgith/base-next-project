@F-013 @UC-USR-014
Feature: Cancel subscription
  As a user
  I want to cancel my paid subscription
  So that I am not charged beyond my current billing period while retaining access until it ends

  Background:
    Given the user is signed in

  @S-080 @UC-USR-014
  Scenario: Paid plan user selecting cancel is redirected to the Stripe Customer Portal
    Given the user is subscribed to the "Light" plan with a billing period ending on "2026-04-06"
    When the user selects the Manage Billing action
    Then the user is redirected to the Stripe Customer Portal

  @S-081 @UC-USR-014
  Scenario: System records a cancellation after receiving a Stripe webhook
    Given the user is subscribed to the "Light" plan with a billing period ending on "2026-04-06"
    When Stripe sends a subscription.updated webhook indicating cancellation at period end
    Then the cancellation is recorded as scheduled for "2026-04-06"
    And the user's plan remains "Light" until that date
    And no further payments will be charged after "2026-04-06"

  @S-082 @UC-USR-014
  Scenario: User returns from Stripe Customer Portal without cancelling — subscription continues
    Given the user is subscribed to the "Light" plan
    When the user returns from the Stripe Customer Portal without cancelling
    Then no cancellation is scheduled
    And the user's plan remains "Light"

  @S-083 @UC-USR-014
  Scenario: A pending cancellation is shown on the subscription plans page
    Given the user is subscribed to the "Light" plan
    And Stripe reports a pending cancellation effective "2026-04-06"
    When the user views the subscription plans page
    Then the pending cancellation date "2026-04-06" is displayed

  @S-089 @UC-USR-014
  Scenario: Free plan user has no cancel subscription option
    Given the user is subscribed to the "Free" plan
    When the user views the subscription plans page
    Then no cancel subscription option is shown
