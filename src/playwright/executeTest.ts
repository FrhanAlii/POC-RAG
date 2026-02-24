import { spawn } from 'child_process';
import { logger } from '../logger/logger';
import * as path from 'path';
import * as fs from 'fs';

export interface PlaywrightExecutionResult {
    passed: boolean;
    durationMs: number;
    error?: string;
    rawOutput?: string;
}

export async function executePlaywrightTest(testPath: string): Promise<PlaywrightExecutionResult> {
    return new Promise((resolve) => {
        const startTime = Date.now();

        logger.info('[EXEC] Starting Playwright (v15 - Node-Direct Clean)');
        logger.info(`[EXEC] Full Path: ${testPath}`);

        const testFileName = path.basename(testPath);
        const relativeTestPath = `tests/${testFileName}`;
        logger.info(`[EXEC] Running v15 (ULTIMATE): ${relativeTestPath}`);

        // Diagnostic: Verify file exists before spawning
        if (!fs.existsSync(testPath)) {
            logger.error(`[EXEC] Test file NOT FOUND: ${testPath}`);
            resolve({
                passed: false,
                durationMs: 0,
                error: `Test file not found: ${testFileName}`,
            });
            return;
        }

        // ENTRY POINT: Direct cli.js from @playwright/test
        const cliPath = path.resolve(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
        const nodeExe = process.execPath;

        logger.info(`[EXEC] Node: ${nodeExe}`);
        logger.info(`[EXEC] CLI: ${cliPath}`);

        // THE v15 ATOMIC FORMULA: No-shell spawn of Node binary with CLI script
        // This is THE cross-platform standard for avoiding EINVAL and quoting hell.
        const child = spawn(nodeExe, [
            cliPath,
            'test',
            relativeTestPath,
            '--reporter=json',
        ], {
            cwd: process.cwd(),
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
            const chunk = data.toString();
            stdout += chunk;
        });

        child.stderr?.on('data', (data) => {
            const chunk = data.toString();
            stderr += chunk;
        });

        // Fail FASTER at 140s (slightly more than global 120s limit)
        const timeout = setTimeout(() => {
            child.kill();
            logger.error('[EXEC] Timeout - killing process');
            resolve({
                passed: false,
                durationMs: Date.now() - startTime,
                error: 'Test execution timeout (140s)',
                rawOutput: stdout || stderr,
            });
        }, 140000);

        child.on('error', (error) => {
            clearTimeout(timeout);
            logger.error('[EXEC] Spawn error:', error);
            resolve({
                passed: false,
                durationMs: Date.now() - startTime,
                error: `Failed to start Playwright: ${error.message}`,
                rawOutput: stderr,
            });
        });

        child.on('close', (code) => {
            clearTimeout(timeout);
            const durationMs = Date.now() - startTime;

            logger.info(`[EXEC] Process exited with code: ${code}`);

            // Try to parse JSON reporter output
            let reportData: any = null;
            let errorMessage: string | undefined;

            try {
                const jsonMatch = stdout.match(/\{[\s\S]*"suites"[\s\S]*\}/);
                if (jsonMatch) {
                    reportData = JSON.parse(jsonMatch[0]);
                    logger.info('[EXEC] Successfully parsed JSON report');
                }
            } catch (e) {
                logger.warn('[EXEC] Failed to parse JSON output');
            }

            if (stdout.includes('"configFile"') && !reportData?.suites?.length) {
                logger.error('[EXEC] Config dump detected - test did not execute');
                errorMessage = stderr || 'Test file not found or failed to load';
            }

            if (reportData) {
                if (reportData.errors && reportData.errors.length > 0) {
                    errorMessage = reportData.errors[0].message || reportData.errors[0].stack;
                } else if (reportData.suites && reportData.suites.length > 0) {
                    const suite = reportData.suites[0];
                    if (suite.specs && suite.specs.length > 0) {
                        const spec = suite.specs[0];
                        if (spec.tests && spec.tests.length > 0) {
                            const test = spec.tests[0];
                            if (test.results && test.results.length > 0) {
                                const result = test.results[0];
                                if (result.status === 'failed' || result.status === 'timedOut') {
                                    errorMessage = result.error?.message || result.error?.stack || 'Test failed';
                                }
                            }
                        }
                    }
                }
            }

            if (!errorMessage && stderr && code !== 0) {
                errorMessage = stderr.substring(0, 500);
            }

            const passed = code === 0 && !errorMessage;

            resolve({
                passed,
                durationMs,
                error: errorMessage,
                rawOutput: stdout.substring(0, 50000),
            });
        });
    });
}
