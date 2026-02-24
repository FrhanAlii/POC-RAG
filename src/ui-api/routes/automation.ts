import { Router } from 'express';
import { runRealAutomation } from '../../automation/runRealAutomation';
import { orchestrator } from '../../automation/orchestrator';
import { logger } from '../../logger/logger';
import * as path from 'path';
import * as fs from 'fs';

export const automationRoutes = Router();

// In-memory status tracking
const executionStatus = new Map<string, any>();

automationRoutes.post('/runAutomation', async (req, res) => {
    const { url, scenario } = req.body;

    // Validate URL
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        new URL(url);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    try {
        logger.info(`[API] Automation request received for: ${url}`);

        // Execute automation synchronously and wait for result
        const result = await runRealAutomation({ url, scenario });

        // Store in memory for status endpoint
        executionStatus.set(result.testId, result);

        // Return complete result
        res.json({
            status: 'completed',
            testId: result.testId,
            passed: result.passed,
            durationMs: result.durationMs,
            error: result.error,
            logs: result.logs,
            message: `Automation completed for ${url}`,
        });

    } catch (error: any) {
        logger.error('[API] Automation failed:', error);
        res.status(500).json({
            error: 'Automation failed',
            details: error.message
        });
    }
});

automationRoutes.post('/runTestRail', async (req, res) => {
    const { caseId, runId, url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // Check for TestRail configuration
    if (!process.env.TESTRAIL_BASE_URL || !process.env.TESTRAIL_USER || !process.env.TESTRAIL_API_KEY) {
        logger.warn('[API] TestRail is not configured in .env');
        return res.status(412).json({
            error: 'TestRail is not configured',
            details: 'Please set TESTRAIL_BASE_URL, TESTRAIL_USER, and TESTRAIL_API_KEY in your .env file.'
        });
    }

    if (!caseId && !runId) {
        return res.status(400).json({ error: 'Either Case ID or Run ID is required' });
    }

    try {
        logger.info(`[API] TestRail execution requested. Case: ${caseId}, Run: ${runId}, URL: ${url}`);

        // Use Orchestrator
        // TODO: Handle runId looping in background if needed, for now focusing on single case
        let result;
        if (caseId) {
            result = await orchestrator.runTestRailCase({
                caseId,
                targetUrl: url
            });
        } else if (runId) {
            // Execute batch run
            const results = await orchestrator.runTestRailRun({
                runId,
                targetUrl: url
            });

            return res.json({
                status: results.every(r => r.passed) ? 'success' : 'failed',
                count: results.length,
                passedCount: results.filter(r => r.passed).length,
                results: results.map(r => ({
                    testId: r.testId,
                    passed: r.passed,
                    error: r.error
                })),
                message: `TestRail Run R${runId} executed`
            });
        }

        if (!result) {
            return res.status(404).json({ error: 'Test execution returned no result (Case not found?)' });
        }

        res.json({
            status: result.passed ? 'success' : 'failed',
            testId: result.testId,
            passed: result.passed,
            durationMs: result.durationMs,
            error: result.error,
            logs: result.logs,
            message: `TestRail Case C${caseId} executed`
        });

    } catch (e: any) {
        logger.error('[API] TestRail automation failed:', e);

        // Provide helpful error messages
        let errorMessage = e.message;
        let details = '';

        if (e.message.includes('not found in TestRail')) {
            errorMessage = `Case C${caseId} not found`;
            details = 'Please verify the case ID exists in your TestRail project';
        } else if (e.message.includes('ENOTFOUND') || e.message.includes('getaddrinfo')) {
            errorMessage = 'Cannot connect to TestRail';
            details = 'Please check TESTRAIL_BASE_URL in .env file';
        } else if (e.message.includes('401') || e.message.includes('Authentication')) {
            errorMessage = 'TestRail authentication failed';
            details = 'Please check TESTRAIL_USER and TESTRAIL_API_KEY in .env file';
        }

        res.status(500).json({
            error: errorMessage,
            details: details || e.message
        });
    }
});

// Status endpoint for polling
automationRoutes.get('/automation/status/:testId', (req, res) => {
    const { testId } = req.params;

    // Check in-memory first
    if (executionStatus.has(testId)) {
        return res.json(executionStatus.get(testId));
    }

    // Check filesystem
    const resultPath = path.join(process.cwd(), 'artifacts/runs', `${testId}.json`);
    if (fs.existsSync(resultPath)) {
        const result = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
        return res.json(result);
    }

    res.status(404).json({ error: 'Test not found' });
});

// Get specific run details by test ID
automationRoutes.get('/runs/:testId', async (req, res) => {
    const { testId } = req.params;

    try {
        const runsDir = path.resolve(process.cwd(), 'artifacts', 'runs');
        const filePath = path.join(runsDir, `${testId}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Run not found' });
        }

        const data = fs.readFileSync(filePath, 'utf-8');
        const runDetails = JSON.parse(data);

        res.json(runDetails);
    } catch (error: any) {
        logger.error(`[API] Failed to fetch run details for ${testId}:`, error);
        res.status(500).json({ error: 'Failed to fetch run details' });
    }
});
