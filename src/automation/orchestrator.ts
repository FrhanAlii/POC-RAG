
import { fetchCases } from '../testrail/fetchCases';
import { convertToGherkin } from '../rag/gherkinConverter';
import { runRealAutomation } from './runRealAutomation';
import { logger } from '../logger/logger';
import { vectorLogger } from '../store/vectorLogger'; // Will create this next
import { RunResult } from '../types/contracts';

export interface OrchestratorInput {
    caseId?: string;
    runId?: string;
    targetUrl: string; // URL is required as it might not be in TestRail
}

export class Orchestrator {

    /**
     * Runs a single TestRail case through the full RAG-MCP pipeline.
     */
    public async runTestRailCase(input: OrchestratorInput): Promise<RunResult | null> {
        const { caseId, targetUrl } = input;

        if (!caseId) {
            logger.error('[Orchestrator] caseId is required for single case execution');
            return null;
        }

        logger.info(`[Orchestrator] Starting execution for Case C${caseId} on ${targetUrl}`);

        try {
            // 1. Fetch from TestRail
            // fetchCases expects array of strings for caseIds
            const { normalized } = await fetchCases({
                projectId: process.env.PROJECT_ID || '1',
                suiteId: process.env.SUITE_ID || '1',
                caseIds: [caseId]
            });

            if (normalized.length === 0) {
                throw new Error(`Case C${caseId} not found in TestRail`);
            }
            const testCase = normalized[0];

            // 2. Convert to Gherkin (RAG)
            const gherkin = await convertToGherkin(testCase);
            logger.info(`[Orchestrator] Generated Gherkin:\n${gherkin}`);

            // 3. Execute via MCP / Automation Engine
            // We pass the Gherkin feature as the 'scenario' description
            const result = await runRealAutomation({
                url: targetUrl,
                scenario: gherkin
            });

            // 4. Store Result in Vector DB (Phase 4)
            await vectorLogger.dbLog({
                testId: result.testId,
                caseId: caseId,
                status: result.passed ? 'PASS' : 'FAIL',
                error: result.error,
                duration: result.durationMs,
                timestamp: new Date().toISOString()
            });

            return result;

        } catch (error: any) {
            logger.error(`[Orchestrator] Execution failed for Case C${caseId}`, error);
            // Log failure to generic DB if possible
            return {
                passed: false,
                durationMs: 0,
                error: error.message,
                testId: 'failed-init'
            };
        }
    }

    /**
     * Runs all cases in a TestRail Run
     */
    public async runTestRailRun(input: OrchestratorInput): Promise<RunResult[]> {
        const { runId, targetUrl } = input;
        const results: RunResult[] = [];
        if (!runId) return results;

        logger.info(`[Orchestrator] processing Run R${runId}`);
        const { normalized } = await fetchCases({
            projectId: process.env.PROJECT_ID || '1',
            suiteId: process.env.SUITE_ID || '1',
            runId: runId
        });

        for (const testCase of normalized) {
            const res = await this.runTestRailCase({
                caseId: testCase.id.toString(),
                targetUrl
            });
            if (res) results.push(res);
        }
        return results;
    }
}

export const orchestrator = new Orchestrator();
