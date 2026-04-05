@F-010 @UC-USR-011
Feature: View subscription plans
  As a user
  I want to view the available subscription plans and my current plan
  So that I can understand each tier and decide whether to change my plan

  Background:
    Given the user is signed in

  @S-068 @UC-USR-011
  Scenario: Newly registered user is on the Free plan by default
    Given the user registered a new account
    When the user views the subscription plans page
    Then their current plan is shown as "Free"
    And no billing date is displayed

  @S-069 @UC-USR-011
  Scenario: Free plan user sees upgrade options but no downgrade or cancel option
    Given the user is subscribed to the "Free" plan
    When the user views the subscription plans page
    Then upgrade options are available for the "Light" and "Full" plans
    And no downgrade or cancel option is shown

  @S-070 @UC-USR-011
  Scenario: Light plan user sees upgrade to Full and options to downgrade or cancel
    Given the user is subscribed to the "Light" plan
    When the user views the subscription plans page
    Then an upgrade option is available for the "Full" plan
    And downgrade and cancel options are available

  @S-071 @UC-USR-011
  Scenario: Full plan user sees downgrade and cancel options but no upgrade option
    Given the user is subscribed to the "Full" plan
    When the user views the subscription plans page
    Then no upgrade option is shown
    And downgrade and cancel options are available

  @S-084 @UC-USR-011
  Scenario: Paid plan user sees current billing details sourced from Stripe
    Given the user is subscribed to the "Light" plan with a billing period ending on "2026-04-06"
    When the user views the subscription plans page
    Then the current plan is shown as "Light"
    And the next billing date "2026-04-06" is displayed

  @S-085 @UC-USR-011
  Scenario: Paid plan user sees a Manage Billing action that opens the Stripe Customer Portal
    Given the user is subscribed to the "Light" plan
    When the user views the subscription plans page
    Then a "Manage Billing" action is available
    And selecting it redirects the user to the Stripe Customer Portal

  @S-086 @UC-USR-011
  Scenario: Paid plan user with a pending downgrade sees the scheduled change
    Given the user is subscribed to the "Full" plan
    And Stripe reports a scheduled downgrade to "Light" effective "2026-04-06"
    When the user views the subscription plans page
    Then the pending downgrade to "Light" effective "2026-04-06" is displayed

  @S-097 @UC-USR-011
  Scenario: Plan prices are displayed in Australian Dollars
    Given the user is subscribed to the "Free" plan
    When the user views the subscription plans page
    Then the plan prices are displayed in Australian Dollars:
      | plan     | price            |
      | Free     | A$0 / month      |
      | Light    | A$3.00 / month   |
      | Full     | A$15.00 / month  |

  @S-099 @UC-ADM-001
  Scenario: Plan prices are sourced from Stripe and reflect admin price changes
    Given the Stripe "Light" plan price is "A$3.00 / month"
    And the Stripe "Full" plan price is "A$15.00 / month"
    When the user views the subscription plans page
    Then the "Light" plan price is displayed as "A$3.00 / month"
    And the "Full" plan price is displayed as "A$15.00 / month"
