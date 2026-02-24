import { chromium, Browser, Page } from 'playwright';
import { logger } from '../logger/logger';
import * as path from 'path';
import * as fs from 'fs';

export interface ProbeResult {
    finalUrl: string;
    title: string;
    screenshotPath: string;
    detected: {
        hasCaptcha: boolean;
        hasConsent: boolean;
        hasSearchInput: boolean;
        isAmazon: boolean;
    };
    selectors: {
        searchInputs: string[];
        primaryButtons: string[];
        headings: string[];
    };
    domSnippet: string;
}

export async function probeSite(url: string): Promise<ProbeResult> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
        logger.info('[PROBE] Starting site probe');
        logger.info(`[PROBE] Target URL: ${url}`);

        browser = await chromium.launch({ headless: true });
        page = await browser.newPage();

        // Navigate with timeout
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        } catch (e) {
            logger.warn('[PROBE] First navigation failed, retrying...');
            await page.goto(url);
        }

        // Wait for page to settle
        await page.waitForTimeout(2000);

        const finalUrl = page.url();
        const title = await page.title();

        logger.info(`[PROBE] Final URL: ${finalUrl}`);
        logger.info(`[PROBE] Title: ${title}`);

        const probesDir = path.resolve(process.cwd(), 'artifacts/probes');
        if (!fs.existsSync(probesDir)) {
            fs.mkdirSync(probesDir, { recursive: true });
        }

        let screenshotPath = '';
        try {
            screenshotPath = path.join(probesDir, `${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: false, timeout: 10000 });
            logger.info(`[PROBE] Screenshot saved: ${screenshotPath}`);
        } catch (e) {
            logger.warn('[PROBE] Screenshot failed or timed out, continuing without it');
        }

        // Detect CAPTCHA
        const bodyText = await page.locator('body').textContent() || '';
        const hasCaptcha = /captcha|robot check|enter the characters|verify you're a human|unusual traffic/i.test(bodyText);

        // Detect consent wall
        const hasConsent = await page.locator('button:has-text("Accept"), button:has-text("I agree"), button:has-text("Continue"), button:has-text("Allow")').count() > 0;

        // Detect if it's Amazon
        const isAmazon = /amazon\.(com|co\.uk|de|fr|jp|ca|in)/i.test(finalUrl);

        // Collect search inputs
        const searchInputs: string[] = [];
        const inputSelectors = [
            'input[type="search"]',
            'input[name="q"]',
            'input[name="field-keywords"]',
            'input[placeholder*="Search"]',
            '#twotabsearchtextbox',
            'input[aria-label*="Search"]',
        ];

        for (const selector of inputSelectors) {
            const count = await page.locator(selector).count();
            if (count > 0) {
                searchInputs.push(selector);
            }
        }

        const hasSearchInput = searchInputs.length > 0;

        // Collect primary buttons
        const primaryButtons: string[] = [];
        const buttons = await page.locator('button, input[type="submit"], a[role="button"]').all();
        for (let i = 0; i < Math.min(buttons.length, 10); i++) {
            const btn = buttons[i];
            const text = await btn.textContent();
            if (text && text.trim()) {
                primaryButtons.push(`button:has-text("${text.trim().substring(0, 30)}")`);
            }
        }

        // Collect headings
        const headings: string[] = [];
        const h1s = await page.locator('h1, h2, h3').all();
        for (let i = 0; i < Math.min(h1s.length, 10); i++) {
            const heading = h1s[i];
            const text = await heading.textContent();
            if (text && text.trim()) {
                headings.push(text.trim().substring(0, 50));
            }
        }

        // Get DOM snippet (limited)
        let domSnippet = await page.content();
        if (domSnippet.length > 50000) {
            domSnippet = domSnippet.substring(0, 50000) + '\n... [truncated]';
        }

        logger.info(`[PROBE] hasCaptcha: ${hasCaptcha}`);
        logger.info(`[PROBE] hasConsent: ${hasConsent}`);
        logger.info(`[PROBE] hasSearchInput: ${hasSearchInput}`);
        logger.info(`[PROBE] isAmazon: ${isAmazon}`);
        logger.info(`[PROBE] Found ${searchInputs.length} search inputs`);
        logger.info(`[PROBE] Found ${primaryButtons.length} buttons`);
        logger.info(`[PROBE] Found ${headings.length} headings`);

        await browser.close();

        return {
            finalUrl,
            title,
            screenshotPath,
            detected: {
                hasCaptcha,
                hasConsent,
                hasSearchInput,
                isAmazon,
            },
            selectors: {
                searchInputs,
                primaryButtons,
                headings,
            },
            domSnippet,
        };

    } catch (error: any) {
        logger.error('[PROBE] Failed:', error);
        if (browser) await browser.close();
        throw new Error(`Probe failed: ${error.message}`);
    }
}
