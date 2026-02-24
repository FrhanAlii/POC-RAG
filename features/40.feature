Feature: Amazon Login Verification (Valid And Invalid With OTP Redirect Handling)
  Description: System should allow login with valid credentials and show account dashboard.
System should reject login with invalid password and display error message.

  @caseId:40 @automated
  Scenario: Amazon Login Verification (Valid And Invalid With OTP Redirect Handling)
    Given I perform step: "1. Open browser and navigate to https://www.amazon.com"
    And I perform step: "2. Locate and click the "Sign In" button or Account & Lists option."
    And I perform step: "3. Wait for Sign In page or authentication page to be visible."
    And I perform step: "----- VALID LOGIN SCENARIO -----"
    And I perform step: "4. Enter valid registered email or mobile number."
    And I perform step: "5. Click Continue button."
    And I perform step: "6. Enter valid password."
    And I perform step: "7. Click Sign In button."
    And I perform step: "8. Observe next page behavior."
    And I perform step: "9. Verify login is considered SUCCESS if ANY of the following occurs:"
    And I perform step: "User is redirected to OTP verification page"
    And I perform step: "User is redirected to account home page"
    And I perform step: "User is redirected to security challenge page"
    And I perform step: "User is redirected to any authenticated session page"
    And I perform step: "10. Mark login as VALID if system redirects away from password entry page without showing login error."
    And I perform step: "----- INVALID LOGIN SCENARIO -----"
    And I perform step: "11. Navigate again to https://www.amazon.com"
    And I perform step: "12. Click Sign In button."
    And I perform step: "13. Enter valid email or mobile number."
    And I perform step: "14. Click Continue button."
    And I perform step: "15. Enter invalid password."
    And I perform step: "16. Click Sign In button."
    And I perform step: "17. Verify login is considered FAILURE if ANY of the following occurs:"
    And I perform step: ""Incorrect password" message appears"
    And I perform step: ""Forgot password" option appears after failed login"
    And I perform step: "Login error banner is displayed"
    And I perform step: "System stays on password entry page with error message"
    And I perform step: "18. Confirm user is NOT logged in."
    Then the test should pass
