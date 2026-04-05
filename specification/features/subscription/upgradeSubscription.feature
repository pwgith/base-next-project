@F-011 @UC-USR-012
Feature: Upgrade subscription
  As a user
  I want to upgrade to a higher subscription plan
  So that I can immediately access more features and higher usage limits

  Background:
    Given the user is signed in

  @S-072 @UC-USR-012
  Scenario Outline: Free plan user upgrading is redirected to Stripe Checkout
    Given the user is subscribed to the "Free" plan
    When the user requests an upgrade to the "<new plan>" plan
    Then the user is redirected to the Stripe Checkout page for the "<new plan>" plan

    Examples:
      | new plan |
      | Light    |
      | Full     |

  @S-087 @UC-USR-012
  Scenario: User returns from Stripe Checkout after successful payment — plan is updated
    Given the user has completed payment for the "Light" plan in Stripe Checkout
    When Stripe redirects the user back to the application success URL
    Then the user's plan is shown as "Light"
    And downgrade and cancel options are available
    And the success confirmation is displayed

  @S-073 @UC-USR-012
  Scenario: User cancels in Stripe Checkout — plan remains unchanged
    Given the user is subscribed to the "Free" plan
    And the user has been redirected to Stripe Checkout for the "Light" plan
    When the user cancels and Stripe redirects back to the application cancel URL
    Then the user's plan remains "Free"
    And the user is returned to the subscription plans page

  @S-074 @UC-USR-012
  Scenario: Payment fails in Stripe Checkout — plan remains unchanged
    Given the user is subscribed to the "Free" plan
    And the user has been redirected to Stripe Checkout for the "Light" plan
    When the user's payment is declined by Stripe
    Then the user's plan remains "Free"
    And Stripe Checkout displays a payment failure message

  @S-088 @UC-USR-012
  Scenario: Paid plan user upgrading is redirected to the Stripe Customer Portal
    Given the user is subscribed to the "Light" plan
    When the user requests an upgrade to the "Full" plan
    Then the user is redirected to the Stripe Customer Portal
