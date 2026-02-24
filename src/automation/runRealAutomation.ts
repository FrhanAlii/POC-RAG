import { generateRealTest, saveTest } from '../playwright/generateTest';
import { executePlaywrightTest } from '../playwright/executeTest';
import { logger } from '../logger/logger';
import * as path from 'path';
import * as fs from 'fs';

export interface AutomationInput {
    url: string;
    scenario?: string;
}

export interface AutomationResult {
    testId: string;
    url: string;
    scenario?: string;
    status: 'passed' | 'failed' | 'blocked';
    passed: boolean;
    durationMs: number;
    timestamp: string;
    error?: string;
    errorReason?: string;
    logs?: string;
    screenshotPath?: string;
}

export async function runRealAutomation(input: AutomationInput): Promise<AutomationResult> {
    const startTime = Date.now();
    const testId = `auto_${startTime}`;

    logger.info('[API] Automation request received');
    logger.info(`[API] Target URL: ${input.url}`);

    try {
        // Universal LLM generation
        logger.info('[AI] Starting LLM-based test generation');
        logger.info('[AI] Starting LLM-based test generation');

        // Step 1: Generate test via LLM
        logger.info('[AI] Generating real test');
        const testCode = await generateRealTest({
            targetUrl: input.url,
            testGoal: input.scenario || 'Automated website testing',
        });

        if (!testCode) {
            throw new Error('Test generation failed - no code returned');
        }

        // Step 2: Write test file
        logger.info('[TEST] File generated');
        const testPath = saveTest(testId, testCode);

        if (!fs.existsSync(testPath)) {
            throw new Error(`Test file not created: ${testPath}`);
        }

        // Step 3: Execute Playwright
        logger.info('[EXEC] Starting browser automation');
        const result = await executePlaywrightTest(testPath);

        // Step 4: Build result
        const durationMs = Date.now() - startTime;

        // Check for bot detection in execution result
        const checkError = result.error || '';
        const isBlockedExec = checkError.includes('BLOCKED') || checkError.includes('BOT_DETECTED');

        const automationResult: AutomationResult = {
            testId,
            url: input.url,
            scenario: input.scenario,
            status: isBlockedExec ? 'blocked' : (result.passed ? 'passed' : 'failed'),
            passed: result.passed,
            durationMs,
            timestamp: new Date().toISOString(),
            error: result.error,
            errorReason: isBlockedExec ? 'Site blocked by CAPTCHA/Protection' : undefined,
            logs: result.rawOutput,
        };

        // Step 5: Save artifact
        logger.info('[RESULT] Saving artifact');
        const resultsDir = path.resolve(process.cwd(), 'artifacts/runs');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        const resultPath = path.join(resultsDir, `${testId}.json`);
        fs.writeFileSync(resultPath, JSON.stringify(automationResult, null, 2));

        logger.info(`[RESULT] Test ${automationResult.passed ? 'PASSED' : 'FAILED'}`);
        logger.info(`[RESULT] Saved artifact: ${resultPath}`);

        return automationResult;

    } catch (error: any) {
        logger.error('[AUTOMATION] Execution failed:', error);

        const durationMs = Date.now() - startTime;

        // Check if it's a BLOCKED error
        const isBlocked = error.message && (error.message.includes('BLOCKED') || error.message.includes('BOT_DETECTED'));

        const failedResult: AutomationResult = {
            testId,
            url: input.url,
            scenario: input.scenario,
            status: isBlocked ? 'blocked' : 'failed',
            passed: false,
            durationMs,
            timestamp: new Date().toISOString(),
            error: error.message || 'Automation execution failed',
            errorReason: isBlocked ? 'Site blocked by CAPTCHA or anti-bot protection' : undefined,
        };

        // Save failed result
        const resultsDir = path.resolve(process.cwd(), 'artifacts/runs');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        const resultPath = path.join(resultsDir, `${testId}.json`);
        fs.writeFileSync(resultPath, JSON.stringify(failedResult, null, 2));

        return failedResult;
    }
}
