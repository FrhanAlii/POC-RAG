import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { runAmazonScenario, AmazonRunnerConfig, AmazonRunnerResult } from '../siteRunners/amazonRunner';
import { performConnectivityPreflight } from '../network/preflight';
import { logger } from '../logger/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface DirectExecutionInput {
    url: string;
    scenario: string;
    config?: AmazonRunnerConfig;
}

export interface DirectExecutionResult {
    status: 'passed' | 'failed' | 'blocked';
    failureType?: string;
    message?: string;
    screenshotPath?: string;
    trace?: string;
    durationMs: number;
    assertions: number;
    preflightDiagnostics?: any;
}

export async function executeAmazonDirect(input: DirectExecutionInput): Promise<DirectExecutionResult> {
    const overallStart = Date.now();
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
        // Step 1: Connectivity Preflight
        logger.info('[AMAZON_DIRECT] Running connectivity preflight');
        const preflight = await performConnectivityPreflight(input.url);

        if (!preflight.success) {
            logger.error('[AMAZON_DIRECT] Preflight failed');

            return {
                status: 'failed',
                failureType: 'NETWORK',
                message: `Node connectivity preflight failed: ${preflight.errorMessage}`,
                durationMs: Date.now() - overallStart,
                assertions: 0,
                preflightDiagnostics: {
                    errorCode: preflight.errorCode,
                    hints: preflight.hints,
                    durationMs: preflight.durationMs,
                },
            };
        }

        logger.info('[AMAZON_DIRECT] Preflight passed');
        logger.info(`[AMAZON_DIRECT] Resolved IPs: ${preflight.resolvedIPs?.join(', ')}`);

        // Step 2: Launch Browser with Anti-Detection
        logger.info('[AMAZON_DIRECT] Launching browser');

        const headless = process.env.AMAZON_HEADLESS === 'false' ? false : true;
        logger.info(`[AMAZON_DIRECT] Headless mode: ${headless}`);

        const launchOptions: any = {
            headless,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-http2',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-setuid-sandbox',
                '--disable-web-security',
            ],
        };

        // Add proxy if configured
        if (process.env.AMAZON_PROXY) {
            launchOptions.proxy = {
                server: process.env.AMAZON_PROXY,
            };
            logger.info(`[AMAZON_DIRECT] Using proxy: ${process.env.AMAZON_PROXY}`);
        }

        browser = await chromium.launch(launchOptions);

        // Step 3: Create Context with Realistic Settings
        const userAgent = process.env.AMAZON_USER_AGENT ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        const contextOptions: any = {
            viewport: { width: 1366, height: 768 },
            userAgent,
            locale: 'en-IN',
            timezoneId: 'Asia/Kolkata',
            extraHTTPHeaders: {
                'Accept-Language': 'en-IN,en;q=0.9',
                'DNT': '1',
            },
        };

        const storageStatePath = input.config?.storageStatePath || process.env.AMAZON_STORAGE_STATE;
        if (storageStatePath && fs.existsSync(storageStatePath)) {
            contextOptions.storageState = storageStatePath;
            logger.info('[AMAZON_DIRECT] Loaded storage state');
        }

        context = await browser.newContext(contextOptions);

        // Remove automation indicators
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        // Enable tracing
        await context.tracing.start({
            screenshots: true,
            snapshots: true,
        });

        page = await context.newPage();

        // Step 4: Navigate with Retry Logic
        logger.info('[AMAZON_DIRECT] Navigating to URL');
        const navigationSuccess = await navigateWithRetry(page, input.url);

        if (!navigationSuccess.success) {
            // Check for bot detection
            if (navigationSuccess.botDetected) {
                const screenshotPath = await takeScreenshot(page, 'bot_detected');

                return {
                    status: 'blocked',
                    failureType: 'BOT_DETECTED',
                    message: 'Amazon blocked automation (captcha/robot check detected)',
                    screenshotPath,
                    durationMs: Date.now() - overallStart,
                    assertions: 0,
                    preflightDiagnostics: {
                        hints: [
                            'Use logged-in storage state (AMAZON_STORAGE_STATE)',
                            'Try different IP/network',
                            'Run with AMAZON_HEADLESS=false to solve CAPTCHA manually',
                            'Amazon may have flagged your IP',
                        ],
                        finalUrl: navigationSuccess.finalUrl,
                        pageTitle: navigationSuccess.pageTitle,
                    },
                };
            }

            const screenshotPath = await takeScreenshot(page, 'navigation_failed');

            return {
                status: 'failed',
                failureType: 'NETWORK',
                message: navigationSuccess.error || 'Navigation failed',
                screenshotPath,
                durationMs: Date.now() - overallStart,
                assertions: 0,
                preflightDiagnostics: {
                    navigationAttempts: 3,
                    finalUrl: navigationSuccess.finalUrl,
                    pageTitle: navigationSuccess.pageTitle,
                },
            };
        }

        logger.info('[AMAZON_DIRECT] Navigation successful');

        // Step 5: Run Amazon Scenario
        const result = await runAmazonScenario(page, input.scenario, {
            email: input.config?.email || process.env.AMAZON_EMAIL,
            password: input.config?.password || process.env.AMAZON_PASSWORD,
            storageStatePath,
        });

        // Save trace
        const tracePath = path.resolve(process.cwd(), `artifacts/traces/amazon_${Date.now()}.zip`);
        const tracesDir = path.dirname(tracePath);
        if (!fs.existsSync(tracesDir)) {
            fs.mkdirSync(tracesDir, { recursive: true });
        }

        await context.tracing.stop({ path: tracePath });
        logger.info(`[AMAZON_DIRECT] Trace saved: ${tracePath}`);

        return {
            ...result,
            trace: tracePath,
            preflightDiagnostics: {
                preflightPassed: true,
                resolvedIPs: preflight.resolvedIPs,
                statusCode: preflight.statusCode,
            },
        };

    } catch (error: any) {
        logger.error('[AMAZON_DIRECT] Execution failed:', error);

        let screenshotPath: string | undefined;
        if (page) {
            screenshotPath = await takeScreenshot(page, 'error');
        }

        return {
            status: 'failed',
            failureType: 'TIMEOUT',
            message: error.message || 'Amazon direct execution failed',
            screenshotPath,
            durationMs: Date.now() - overallStart,
            assertions: 0,
        };
    } finally {
        if (context) {
            await context.close().catch(() => { });
        }
        if (browser) {
            await browser.close().catch(() => { });
        }
    }
}

async function navigateWithRetry(page: Page, url: string): Promise<{
    success: boolean;
    botDetected?: boolean;
    error?: string;
    finalUrl?: string;
    pageTitle?: string;
    pageContent?: string;
}> {
    const waitStrategies = ['domcontentloaded', 'load', 'networkidle'] as const;

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            logger.info(`[NAV] Attempt ${attempt + 1}/3 with waitUntil: ${waitStrategies[attempt]}`);

            await page.goto(url, {
                waitUntil: waitStrategies[attempt],
                timeout: 30000,
            });

            await page.waitForTimeout(2000);

            // Check for bot detection
            const title = await page.title();
            const finalUrl = page.url();

            logger.info(`[NAV] Page title: ${title}`);
            logger.info(`[NAV] Final URL: ${finalUrl}`);

            // Check for CAPTCHA/Robot indicators
            const titleLower = title.toLowerCase();
            if (titleLower.includes('robot') || titleLower.includes('sorry') || titleLower.includes('captcha')) {
                logger.warn('[NAV] Bot detection in title');
                return {
                    success: false,
                    botDetected: true,
                    finalUrl,
                    pageTitle: title,
                };
            }

            // Check page content for CAPTCHA
            const captchaInput = await page.locator('input[name="captcha"]').count();
            if (captchaInput > 0) {
                logger.warn('[NAV] CAPTCHA input detected');
                return {
                    success: false,
                    botDetected: true,
                    finalUrl,
                    pageTitle: title,
                };
            }

            const bodyText = await page.locator('body').textContent() || '';
            if (bodyText.includes('Enter the characters you see below')) {
                logger.warn('[NAV] CAPTCHA text detected');
                return {
                    success: false,
                    botDetected: true,
                    finalUrl,
                    pageTitle: title,
                };
            }

            logger.info('[NAV] Navigation successful');
            return {
                success: true,
                finalUrl,
                pageTitle: title,
            };

        } catch (error: any) {
            logger.error(`[NAV] Attempt ${attempt + 1} failed:`, error.message);

            if (attempt === 2) {
                // Last attempt failed
                try {
                    const finalUrl = page.url();
                    const pageTitle = await page.title().catch(() => '');
                    const content = await page.content().catch(() => '');
                    const pageContent = content.substring(0, 500);

                    return {
                        success: false,
                        error: error.message,
                        finalUrl,
                        pageTitle,
                        pageContent,
                    };
                } catch (e) {
                    return {
                        success: false,
                        error: error.message,
                    };
                }
            }

            // Wait before retry
            await page.waitForTimeout(2000);
        }
    }

    return {
        success: false,
        error: 'All navigation attempts failed',
    };
}

async function takeScreenshot(page: Page, label: string): Promise<string> {
    try {
        const screenshotsDir = path.resolve(process.cwd(), 'artifacts/screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        const screenshotPath = path.join(screenshotsDir, `amazon_${label}_${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        logger.info(`[SCREENSHOT] Saved: ${screenshotPath}`);
        return screenshotPath;
    } catch (e) {
        logger.error('[SCREENSHOT] Failed:', e);
        return '';
    }
}
