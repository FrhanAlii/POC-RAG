Feature: Amazon Login And Add Product To Cart Verification
  Description: User is successfully authenticated.Product search works correctly.Selected product is successfully added to cart.Product is visible in cart page.

  @caseId:41 @automated
  Scenario: Amazon Login And Add Product To Cart Verification
    Given I perform the following test steps:
      """
      1. Open browser and navigate to https://www.amazon.com2. Click "Sign In" or "Account & Lists" button.3. Wait for login page to load.4. Enter valid registered email or mobile number.5. Click Continue button.6. Enter valid password.7. Click Sign In button.8. Verify login SUCCESS if ANY of the following occurs:   - Redirect to OTP verification page   - Redirect to account homepage   - Redirect to security challenge page   - Redirect to authenticated session page9. Locate search input box on homepage or top navigation.10. Enter "HP work laptop" into search input box.11. Submit search.12. Wait for search results page to load.13. Click first available product from search results.14. Wait for product details page to load.15. Click "Add To Cart" button.16. Navigate to Cart page.17. Verify added product is present in cart items list.
      """
    Then the test should pass
