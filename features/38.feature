Feature: Amazon Search HP Laptop And Add To Cart Verification
  Description: The selected HP laptop product should be successfully added and visible in the cart page item list.

  @caseId:38 @automated
  Scenario: Amazon Search HP Laptop And Add To Cart Verification
    Given I perform the following test steps:
      """
      Navigate to https://www.amazon.comWait for homepage to loadLocate search input boxEnter "HP work laptop" into search inputSubmit searchWait for search results page to loadClick first product from search resultsWait for product detail page to loadClick Add To Cart buttonNavigate to Cart pageVerify added product is present in cart
      """
    Then the test should pass
