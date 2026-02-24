import { spawn } from 'child_process';
import { logger } from '../logger/logger';
import { RunResult, parsePlaywrightResult } from './resultParser';

function extractPlaywrightJSON(rawOutput: string): any | null {
    try {
        const jsonStart = rawOutput.indexOf('{');
        const jsonEnd = rawOutput.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonText = rawOutput.substring(jsonStart, jsonEnd + 1);
            return JSON.parse(jsonText);
        }

        if (rawOutput.trim().startsWith('{')) {
            return JSON.parse(rawOutput.trim());
        }

        return null;
    } catch (e) {
        return null;
    }
}

export async function executeTest(caseId: number, specPath: string): Promise<RunResult> {
    logger.info(`Executing Test: ${specPath}`);

    let playwrightPath: string;
    try {
        playwrightPath = require.resolve('@playwright/test/cli');
    } catch (e) {
        throw new Error('Playwright CLI not found. Is @playwright/test installed?');
    }

    return new Promise((resolve) => {
        const child = spawn(
            process.execPath,
            [playwrightPath, 'test', specPath, '--reporter=json'],
            {
                env: process.env,
                shell: false,
                stdio: ['ignore', 'pipe', 'pipe']
            }
        );

        let stdoutBuffer = '';
        let stderrBuffer = '';

        child.stdout.on('data', (chunk) => { stdoutBuffer += chunk.toString(); });
        child.stderr.on('data', (chunk) => { stderrBuffer += chunk.toString(); });

        child.on('close', (code) => {
            const json = extractPlaywrightJSON(stdoutBuffer);

            if (json) {
                // DEBUG: Log stats to understand why pass/fail
                if (json.stats) {
                    logger.info(`   [DEBUG] Playwright Stats: Passed=${json.stats.passed}, Failed=${json.stats.failed}, Duration=${json.stats.duration}`);
                } else {
                    logger.warn(`   [DEBUG] Playwright JSON missing stats: ${JSON.stringify(json).slice(0, 100)}...`);
                }

                resolve(parsePlaywrightResult(caseId.toString(), json));
                return;
            }

            // No JSON found logic
            const errorMsg = [
                `Exit Code: ${code}`,
                stderrBuffer ? `Stderr: ${stderrBuffer.trim()}` : '',
                stdoutBuffer ? `Stdout (Raw): ${stdoutBuffer.trim().slice(0, 300)}...` : ''
            ].filter(Boolean).join(' | ');

            logger.error(`❌ Test Failed (No JSON Report): ${errorMsg}`);

            resolve({
                caseId: caseId.toString(),
                passed: false,
                durationMs: 0,
                error: errorMsg || 'Playwright JSON not found',
                timestamp: new Date().toISOString()
            });
        });

        child.on('error', (err) => {
            logger.error(`Failed to spawn Playwright: ${err.message}`);
            resolve({
                caseId: caseId.toString(),
                passed: false,
                durationMs: 0,
                error: err.message,
                timestamp: new Date().toISOString()
            });
        });
    });
}
