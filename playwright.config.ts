import { PlaywrightTestConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();


const config: PlaywrightTestConfig = {
    testDir: './tests',
    timeout: 120000,
    expect: {
        timeout: 10000,
    },
    retries: 0,
    use: {
        actionTimeout: 30000,
        navigationTimeout: 60000,
        headless: process.env.HEADLESS !== 'false',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry',
        launchOptions: {
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-http2',
                '--disable-features=IsolateOrigins,site-per-process',
            ],
            ignoreDefaultArgs: ['--enable-automation'],
        },
    },
    reporter: [['json', { outputFile: 'test-results.json' }]],
};

export default config;
