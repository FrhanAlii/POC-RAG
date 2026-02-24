#!/usr/bin/env node
import { Command } from 'commander';
import { runPipeline } from './pipeline';
import { logger } from './logger/logger';
import { config } from './config/config';

const program = new Command();

program
    .name('npm run poc')
    .description('POC Runner for Test Automation Pipeline')
    .version('1.0.0');

program
    .option('-c, --caseIds <ids>', 'Comma-separated list of TestRail case IDs')
    .option('-p, --projectId <id>', 'TestRail Project ID')
    .option('-s, --suiteId <id>', 'TestRail Suite ID')
    .option('-d, --dryRun', 'Run without executing side effects')
    .option('-l, --logLevel <level>', 'Set log level (debug, info, warn, error)', 'info')
    .option('--verifyRuntime', 'Run runtime verification checks', false) // Default false
    .option('--cleanArtifacts', 'Cleanup generated tests and run results', false)
    .option('--validateProduction', 'Verify strict production mode requirements', false)
    .action(async (options) => {
        try {
            // 1. Config Logging
            console.log('CLI Options:', options);
            if (options.logLevel) {
                config.LOG_LEVEL = options.logLevel as any;
            }

            const caseIds = options.caseIds ? options.caseIds.split(',').map((id: string) => id.trim()) : undefined;

            if (options.cleanArtifacts) {
                const { cleanupGeneratedArtifacts } = await import('./utils/cleanupArtifacts');
                await cleanupGeneratedArtifacts();
            }

            // 2. Execute Pipeline
            await runPipeline({
                caseIds,
                projectId: options.projectId,
                suiteId: options.suiteId,
                dryRun: options.dryRun,
            });

            // 3. Runtime Verification (Explicit Check)
            if (options.verifyRuntime === true || options.verifyRuntime === 'true') {
                console.log("Running Runtime Verification Checks...");
                const { runRuntimeVerification } = await import('./verification/runtimeChecks');
                await runRuntimeVerification();
            }

            // 4. PRODUCTION VALIDATION
            if (options.validateProduction) {
                console.log('\n--- PRODUCTION MODE VALIDATION ---');
                let passed = true;
                const fs = await import('fs');
                const path = await import('path');

                // Check 1: OpenAI Key
                if (!config.OPENAI_API_KEY || config.OPENAI_API_KEY === 'dummy') {
                    console.error('❌ FAIL: OpenAI API Key missing or invalid.');
                    passed = false;
                } else {
                    console.log('✅ PASS: OpenAI API Key detected.');
                }

                // Check 2: Generated Tests Marker
                const testsDir = path.resolve(process.cwd(), 'tests');
                let foundMarker = false;
                if (fs.existsSync(testsDir)) {
                    const files = fs.readdirSync(testsDir);
                    for (const file of files) {
                        if (file.endsWith('.spec.ts')) {
                            const content = fs.readFileSync(path.join(testsDir, file), 'utf-8');
                            if (content.includes('GENERATED_BY_REAL_LLM')) {
                                foundMarker = true;
                                break;
                            }
                        }
                    }
                }

                if (foundMarker) {
                    console.log('✅ PASS: Real LLM marker found in generated tests.');
                } else {
                    console.error('❌ FAIL: No generated tests contain "GENERATED_BY_REAL_LLM".');
                    passed = false;
                }

                // Final Result
                if (passed) {
                    console.log('✅ PRODUCTION MODE VERIFIED');
                } else {
                    console.log('❌ PRODUCTION MODE FAILED');
                    process.exit(1);
                }
            }

        } catch (error) {
            logger.error('Execution Failed', error);

            if (options.verifyRuntime === true || options.verifyRuntime === 'true') {
                // ... existing failure handling ...
            }
            process.exit(1);
        }
    });

program.parse(process.argv);
