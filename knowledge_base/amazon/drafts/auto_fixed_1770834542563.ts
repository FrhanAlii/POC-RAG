export const draft = `// GENERATED_BY_REAL_LLM
// MODEL: gpt-4o-mini
// TIMESTAMP: 2026-02-11T18:29:07.404Z
// TARGET_URL: https://www.amazon.com

import { test, expect } from '../src/playwright/productionFixtures';

test('Amazon Login Verification', async ({ page }) => {
    // STEP: Open browser and navigate to https://www.amazon.com
    await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    if (title.includes('Robot Check')) throw new Error('BOT_DETECTED');

    // STEP: Locate and click the "Sign In" button or Account & Lists option.
    await page.locator('#nav-link-accountList').click();
    await page.waitForTimeout(2000);

    // STEP: Wait for Sign In page or authentication page to be visible.
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 20000 });

    // STEP: Enter valid registered email or mobile number.
    const email = process.env.AMAZON_EMAIL;
    if (!email) throw new Error('AMAZON_EMAIL env var missing');
    await page.fill('input[type="email"]', email);

    // STEP: Click Continue button.
    const continueBtn = page.locator('input#continue, input[type="submit"]').first();
    await continueBtn.click();

    // STEP: Enter valid password.
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 20000 });
    const password = process.env.AMAZON_PASSWORD;
    if (!password) throw new Error('AMAZON_PASSWORD env var missing');
    await page.fill('input[type="password"]', password);

    // STEP: Click Sign In button.
    const signInBtn = page.locator('#signInSubmit');
    await signInBtn.click();

    // STEP: Observe next page behavior.
    // STEP: Verify login is considered SUCCESS if ANY of the following occurs:
    try {
        await expect(page.locator('#nav-link-accountList-nav-line-1')).toContainText(/Hello,/, { timeout: 10000 });
        console.log('✅ Login Successful');
    } catch (e) {
        const errorMsg = await page.locator('.a-list-item').textContent().catch(() => '');
        if (errorMsg?.includes('password')) throw new Error('Login Failed: Invalid Password');
        throw new Error('Login Failed: Unknown Reason');
    }

    // STEP: Navigate again to https://www.amazon.com
    await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // STEP: Click Sign In button.
    await page.locator('#nav-link-accountList').click();
    await page.waitForTimeout(2000);

    // STEP: Enter valid email or mobile number.
    await page.fill('input[type="email"]', email);

    // STEP: Click Continue button.
    await continueBtn.click();

    // STEP: Enter invalid password.
    const invalidPassword = 'invalid_password'; // Use a placeholder for invalid password
    await page.fill('input[type="password"]', invalidPassword);

    // STEP: Click Sign In button.
    await signInBtn.click();

    // STEP: Verify login is considered FAILURE if ANY of the following occurs:
    const errorVisible = await Promise.race([
        page.locator('text=Incorrect password').isVisible(),
        page.locator('text=Forgot password').isVisible(),
        page.locator('.a-alert-content').isVisible(),
        page.locator('input[type="password"]').isVisible()
    ]);

    // STEP: Confirm user is NOT logged in.
    if (errorVisible) {
        console.log('❌ Login Failed: Invalid Password');
    } else {
        throw new Error('Login did not fail as expected');
    }
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
});`;