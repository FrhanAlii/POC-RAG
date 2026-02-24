// Simple diagnostic test for Playwright
import { chromium } from 'playwright';

async function testPlaywright() {
    console.log('[TEST] Starting Playwright diagnostic...');

    try {
        console.log('[TEST] Launching browser...');
        const browser = await chromium.launch({
            headless: true,
        });

        console.log('[TEST] Browser launched successfully');

        const context = await browser.newContext();
        const page = await context.newPage();

        console.log('[TEST] Navigating to example.com...');
        await page.goto('https://example.com', { timeout: 30000 });

        const title = await page.title();
        console.log('[TEST] Page title:', title);

        await browser.close();
        console.log('[TEST] ✅ Playwright is working!');

    } catch (error: any) {
        console.error('[TEST] ❌ Playwright failed:', error.message);
        process.exit(1);
    }
}

testPlaywright();
