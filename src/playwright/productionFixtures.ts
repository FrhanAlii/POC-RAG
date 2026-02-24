
import { test as base, type BrowserContext, type Page, chromium as playwrightChromium } from '@playwright/test';
import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

// Apply stealth plugin
chromium.use(stealthPlugin());

// Define custom fixture type
type ProductionFixtures = {
    productionPage: Page;
};

export const test = base.extend<ProductionFixtures>({
    context: async ({ }, use) => {
        // Anti-detect settings
        const userAgent = process.env.AMAZON_USER_AGENT ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        // Minimal args to avoid flagging, relying on stealth plugin
        const launchArgs = [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-acceleration',
            '--disable-gpu',
            '--mute-audio',
        ];

        // Launch persistent context with playwright-extra (stealth)
        // We use launchPersistentContext or launch + newContext. 
        // Using launch + newContext allows for more granular control over viewport/user agent if needed per test.

        const isHeadless = false; // Always show browser for demo

        // v16.11.0: Use NATIVE playwrightChromium to avoid stealth-plugin fingerprinting
        // "Less is More" - rely on being a real headed browser
        const browser = await playwrightChromium.launch({
            channel: 'chrome', // Try to use actual Chrome if available, fallback to bundled
            headless: isHeadless,
            args: [
                '--disable-blink-features=AutomationControlled', // Critical
                '--start-maximized', // Open huge
                '--no-sandbox',
                '--disable-infobars',
            ],
        });

        const context = await browser.newContext({
            viewport: null, // Critical: Uses actual window size
            locale: 'en-US',
            timezoneId: 'America/New_York',
            // Do NOT force User-Agent in headed mode
            extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });

        // Manual webdriver override (cleaner than plugin)
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
        });

        // Additional manual scripts just in case plugin misses some
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        await use(context);
        await context.close();
        await browser.close();
    },

    page: async ({ context }, use) => {
        const page = await context.newPage();
        await use(page);
    },
});

export const expect = base.expect;
