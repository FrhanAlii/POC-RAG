import { Page } from '@playwright/test';

export class BotDetectionError extends Error {
    readonly code = 'BOT_DETECTED';
    constructor(message: string) {
        super(message);
        this.name = 'BotDetectionError';
    }
}

export async function checkForBotProtection(page: Page): Promise<void> {
    const title = await page.title().catch(() => '');
    const content = await page.content().catch(() => '');

    // Common CAPTCHA signatures
    const captchaIndicators = [
        'robot check',
        'captcha',
        'security check',
        'enter the characters you see below',
        'type the characters',
        'not a robot'
    ];

    // Check title
    if (captchaIndicators.some(i => title.includes(i.toLowerCase()))) {
        throw new BotDetectionError(`Amazon blocked automation (captcha/robot title: "${title}")`);
    }

    // Check strict selectors
    if (await page.locator('input[id="captchacharacters"]').count() > 0) {
        throw new BotDetectionError('Amazon blocked automation (captcha input found)');
    }

    if (await page.locator('form[action*="/validateCaptcha"]').count() > 0) {
        throw new BotDetectionError('Amazon blocked automation (captcha form found)');
    }

    // Check for "Sorry, we just need to make sure you're not a robot"
    if (content.includes("we just need to make sure you're not a robot")) {
        throw new BotDetectionError('Amazon blocked automation (robot check text found)');
    }
}
