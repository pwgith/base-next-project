@F-012 @UC-USR-013
Feature: Downgrade subscription
  As a user
  I want to downgrade to a lower subscription plan
  So that I can reduce my costs while retaining my current plan's features until my paid period ends

  Background:
    Given the user is signed in

  @S-075 @UC-USR-013
  Scenario: Paid plan user selecting downgrade is redirected to the Stripe Customer Portal
    Given the user is subscribed to the "Full" plan with a billing period ending on "2026-04-06"
    When the user selects the Manage Billing action
    Then the user is redirected to the Stripe Customer Portal

  @S-076 @UC-USR-013
  Scenario: System records a scheduled downgrade after receiving a Stripe webhook
    Given the user is subscribed to the "Full" plan with a billing period ending on "2026-04-06"
    When Stripe sends a subscription.updated webhook indicating a downgrade to "Light" at period end
    Then a downgrade to "Light" is recorded as scheduled for "2026-04-06"
    And the user's plan remains "Full" until that date

  @S-077 @UC-USR-013
  Scenario: System records a downgrade to Free after a Stripe cancellation webhook
    Given the user is subscribed to the "Light" plan with a billing period ending on "2026-04-06"
    When Stripe sends a subscription.updated webhook indicating cancellation at period end
    Then a downgrade to "Free" is recorded as scheduled for "2026-04-06"
    And the user's plan remains "Light" until that date
    And no further payments will be charged

  @S-078 @UC-USR-013
  Scenario: User returns from Stripe Customer Portal without making a change — plan unchanged
    Given the user is subscribed to the "Full" plan
    When the user returns from the Stripe Customer Portal without changing their plan
    Then no downgrade is scheduled
    And the user's plan remains "Full"

  @S-079 @UC-USR-013
  Scenario: Free plan user has no Manage Billing downgrade option available
    Given the user is subscribed to the "Free" plan
    When the user views the subscription plans page
    Then no downgrade option is shown
