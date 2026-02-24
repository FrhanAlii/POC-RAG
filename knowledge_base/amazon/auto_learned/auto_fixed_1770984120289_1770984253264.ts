/**
 * AUTO-LEARNED PATTERN
 * Domain: amazon
 * Feature: auto_fixed_1770984120289
 * Learned At: 2026-02-13T12:04:13.264Z
 */
import { test, expect } from '@playwright/test';

// GENERATED_BY_REAL_LLM
// MODEL: gpt-4o-mini
// TIMESTAMP: 2026-02-13T12:02:08.756Z
// TARGET_URL: https://www.amazon.com

import { test, expect } from '../src/playwright/productionFixtures';

test('Search and add to cart', async ({ page }) => {
    // STEP: Navigate to https://www.amazon.com
    await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // STEP: Check for bot detection
    const title = await page.title();
    if (title.includes('Robot Check')) throw new Error('BOT_DETECTED');

    // STEP: Wait for homepage to load
    await page.waitForSelector('#nav-logo-sprites', { timeout: 20000 });

    // STEP: Locate search input box
    let searchInput = page.locator('#twotabsearchtextbox');
    if (await searchInput.count() === 0) searchInput = page.locator('input[name="field-keywords"]');
    
    // STEP: Enter "HP work laptop" into search input
    await searchInput.fill('HP work laptop');
    await searchInput.press('Enter');
    await page.waitForTimeout(3000);

    // STEP: Wait for search results page to load
    await expect(page.locator('.s-main-slot')).toBeVisible({ timeout: 20000 });

    // STEP: Click first product from search results
    const productSelector = 'a[href*="/dp/"]:visible';
    const products = page.locator(productSelector);
    if (await products.count() > 0) {
        await products.nth(0).click();
    } else {
        throw new Error('No products found in search results');
    }
    await page.waitForTimeout(3000);

    // STEP: Click Add To Cart button
    const addBtns = page.locator('#add-to-cart-button, #add-to-cart-button-ubb, input[name="submit.add-to-cart"], #exports_underscore_qualified_buybox_atc_input, input[value="Add to cart"], input[title="Add to Shopping Cart"]');
    const btnCount = await addBtns.count();
    let clicked = false;

    for (let j = 0; j < btnCount; j++) {
        const btn = addBtns.nth(j);
        if (await btn.isVisible()) {
            await btn.click();
            clicked = true;
            console.log('✅ Clicked Add to Cart button');
            break;
        }
    }

    if (!clicked) {
        console.log('❌ No visible Add to Cart button found. Trying fallback text search...');
        const textBtn = page.locator('button:has-text("Add to cart")').first();
        if (await textBtn.isVisible()) {
            await textBtn.click();
        } else {
            throw new Error('Failed to click Add to Cart button');
        }
    }

    // STEP: Navigate to Cart page
    await page.goto('https://www.amazon.com/gp/cart/view.html', { waitUntil: 'domcontentloaded' });
    
    // STEP: Verify added product is present in cart
    const cartItems = page.locator('.sc-product-title').first();
    await expect(cartItems).toBeVisible({ timeout: 20000 });
});

test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
        const fs = require('fs');
        const path = require('path');
        const html = await page.content();
        const snapshotPath = path.resolve(__dirname, 'snapshot_FAILURE.html');
        fs.writeFileSync(snapshotPath, html);
        console.log(`[SNAPSHOT] Saved to ${snapshotPath}`);
    }
});