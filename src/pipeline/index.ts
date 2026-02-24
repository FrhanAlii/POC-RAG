import { logger } from '../logger/logger';
import { config } from '../config/config';
import { fetchCases } from '../testrail/fetchCases';
import { storeEmbeddings } from '../rag/embed';
import { retrieveContext } from '../rag/retrieve';
import { generateGherkin } from '../gherkin/generateFeature';
import { validateFeature } from '../gherkin/validateFeature';
import { saveFeature } from '../gherkin/saveFeature';

// Playwright Imports
import { generateTest, saveTest } from '../playwright/generateTest';
import { executeTest } from '../playwright/executeTests';
import { saveRunResult } from '../store/runResultStore';

// Debug
import { loadLocalFeatures } from './localLoader';

import * as fs from 'fs';
import * as path from 'path';

export interface PipelineOptions {
    caseIds?: string[];
    projectId?: string;
    suiteId?: string;
    dryRun?: boolean;
}

export async function runPipeline(options: PipelineOptions) {
    const projectId = options.projectId || config.PROJECT_ID;
    const suiteId = options.suiteId || config.SUITE_ID;
    const isDebug = config.DEBUG_LOCAL_FEATURES;

    logger.info('Pipeline Started', {
        dryRun: options.dryRun,
        debugMode: isDebug,
        projectId,
        suiteId
    });

    if (options.dryRun) {
        logger.info('DRY RUN. Exiting.');
        return;
    }

    // Allow running if debug mode OR caseIds provided
    if (!isDebug && ((!projectId || !suiteId) && (!options.caseIds || options.caseIds.length === 0))) {
        logger.error('Missing Context (Project/Suite) or CaseIDs.');
        process.exit(1);
    }

    try {
        let casesToProcess: { id: number; title: string; gherkin?: string }[] = [];

        // 1. Attempt Fetch
        logger.info('Step 1: Fetching Cases...');
        const result = await fetchCases({
            projectId: projectId || '',
            suiteId: suiteId || '',
            caseIds: options.caseIds
        });

        logger.info(`Fetched ${result.normalized.length} cases.`);

        if (result.normalized.length > 0) {
            // Standard Flow
            casesToProcess = result.normalized;
            // Embed only if we fetched new cases
            await storeEmbeddings(result.normalized);
        } else if (isDebug) {
            // Fallback Logic
            logger.warn('DEBUG: No TestRail cases found. Attempting to load local features...');
            const localFeatures = loadLocalFeatures();

            if (localFeatures.length > 0) {
                casesToProcess = localFeatures;
                logger.info(`DEBUG: Loaded ${localFeatures.length} local features.`);
            } else {
                logger.warn('DEBUG: No local features found in /features.');
            }
        }

        // FINAL CHECK: If no cases, exit
        if (casesToProcess.length === 0) {
            logger.warn('Pipeline Stop: No cases to process (Remote or Local).');
            return;
        }

        // 2. Process Loop
        logger.info(`Starting Processing Loop for ${casesToProcess.length} items...`);

        for (const item of casesToProcess) {
            logger.info(`>> Processing Case ${item.id}`);

            try {
                // A. Get Gherkin (Generate or Load)
                let gherkin = item.gherkin;

                if (!gherkin) {
                    // Must be a TestRailCase needing Generation
                    const context = await retrieveContext(item.title);
                    gherkin = await generateGherkin(item as any, context);
                    validateFeature(gherkin);
                    saveFeature(item.id, gherkin);
                } else {
                    logger.info('   Using existing/local Gherkin content.');
                }

                if (!gherkin) {
                    logger.error(`   Skipping Case ${item.id}: No gherkin content.`);
                    continue;
                }

                // B. Gherkin -> Playwright
                logger.info(`   Generating Playwright Test...`);
                // Ensure title exists for generation
                const tempCase = { id: item.id, title: item.title } as any;
                const testCode = await generateTest(tempCase, gherkin);
                const specPath = saveTest(item.id, testCode);

                // C. Execute
                logger.info(`   Executing Test: ${specPath}`);
                const runResult = await executeTest(item.id, specPath);

                if (runResult.passed) {
                    logger.info(`   ✅ Test Passed`);
                } else {
                    logger.error(`   ❌ Test Failed: ${runResult.error}`);
                }

                // D. Store Result
                saveRunResult(runResult);

                // --- Failure Intelligence Hook (Task 5) ---
                if (!runResult.passed) {
                    try {
                        const { getFailureHints } = await import('../failure/failureHints');
                        const { storeFailure } = await import('../failure/failureEmbed');
                        const { findSimilarFailures } = await import('../failure/failureSearch');

                        // 1. Hints
                        const hints = getFailureHints(runResult);
                        if (hints.length > 0) {
                            logger.info(`   💡 Root Cause Hints:\n      - ${hints.join('\n      - ')}`);
                        }

                        // 2. Search Similar (Before storing current)
                        const similar = await findSimilarFailures(runResult, item.title);
                        if (similar.length > 0) {
                            logger.info(`   🔍 Similar Past Failures:`);
                            similar.forEach(s => {
                                logger.info(`      [${Math.round(s.score * 100)}%] Case ${s.caseId} (${s.timestamp}): ${s.error}`);
                            });
                        }

                        // 3. detailed Store (Async recommended but awaiting here for POC consistency)
                        await storeFailure(runResult, item.title);

                    } catch (hookErr: any) {
                        logger.warn(`   Failure Intelligence Hook skipped: ${hookErr.message}`);
                    }
                }
                // ------------------------------------------

            } catch (e: any) {
                logger.error(`Failed Pipeline for Case ${item.id}: ${e.message}`);
            }
        }

        logger.info('Pipeline Complete.');

    } catch (error) {
        logger.error('Fatal Pipeline Error', error);
        process.exit(1);
    }
}
