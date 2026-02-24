import { logger } from '../../logger/logger';

export function generateAmazonTest(scenario: string, origin: string): string {
    logger.info('[GEN] Using Amazon site profile');

    // Extract search query from scenario or use default
    let searchQuery = 'hp laptop';
    if (scenario) {
        const match = scenario.match(/search for (.+)/i);
        if (match) {
            searchQuery = match[1].toLowerCase();
        }
    }

    const searchUrl = `${origin}/s?k=${encodeURIComponent(searchQuery.replace(/\s+/g, '+'))}`;

    const testCode = `
import { test, expect } from '@playwright/test';

test('Amazon ${scenario || 'Product Search'}', async ({ page }) => {
  await test.step('Navigate to Amazon search results', async () => {
    try {
      await page.goto('${searchUrl}', { waitUntil: "domcontentloaded", timeout: 45000 });
    } catch (e) {
      await page.goto('${searchUrl}');
    }
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
    
    const title = await page.title();
    expect(title.toLowerCase()).toContain('amazon');
  });

  await test.step('Verify search results are displayed', async () => {
    await page.waitForTimeout(1000 + Math.random() * 1000);
    
    // Wait for search results
    try {
      await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 });
    } catch (e) {
      // Fallback to other result selectors
      await page.waitForSelector('.s-result-item', { timeout: 5000 });
    }
    
    const results = await page.locator('[data-component-type="s-search-result"]').count();
    expect(results).toBeGreaterThan(0);
  });

  await test.step('Click first product', async () => {
    await page.waitForTimeout(500 + Math.random() * 1000);
    
    // Try multiple strategies to click first product
    try {
      const firstResult = page.locator('[data-component-type="s-search-result"]').first();
      const productLink = firstResult.locator('h2 a').first();
      await productLink.click();
    } catch (e) {
      // Fallback
      const anyProductLink = page.locator('.s-result-item h2 a').first();
      await anyProductLink.click();
    }
    
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
  });

  await test.step('Verify product page loaded', async () => {
    // Wait for product title
    try {
      await page.waitForSelector('#productTitle', { timeout: 10000 });
      const productTitle = await page.locator('#productTitle').textContent();
      expect(productTitle).toBeTruthy();
    } catch (e) {
      // Alternative: check for product details
      const hasProductInfo = await page.locator('#dp, #ppd').count() > 0;
      expect(hasProductInfo).toBeTruthy();
    }
  });

  await test.step('Check add to cart button', async () => {
    await page.waitForTimeout(500 + Math.random() * 1000);
    
    // Check if add to cart exists (don't click, just verify)
    const addToCartExists = await page.locator('#add-to-cart-button, #buy-now-button').count() > 0;
    expect(addToCartExists).toBeTruthy();
  });
});
`.trim();

    return testCode;
}
