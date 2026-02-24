import { testRailClient } from './client';
import { mapTestRailCase } from './mapper';
import { TestRailCase } from '../types/contracts';
import { logger } from '../logger/logger';

interface FetchOptions {
    projectId: string;
    suiteId: string;
    caseIds?: string[]; // If present, ONLY these
    runId?: string;     // If present, fetches cases from this Run
}

export async function fetchCases(options: FetchOptions): Promise<{ raw: any[]; normalized: TestRailCase[] }> {
    const { projectId, suiteId, caseIds, runId } = options;
    let rawCases: any[] = [];
    let targetCaseIds: string[] = caseIds || [];

    // FIX: If runId is provided, fetch tests from run to get Case IDs
    if (runId) {
        logger.info(`Fetching tests from Run ID ${runId}...`);
        try {
            const runTests = await testRailClient.get(`get_tests/${runId}`);
            const testsList = Array.isArray(runTests) ? runTests : (runTests as any).tests;

            if (Array.isArray(testsList)) {
                // Extract unique case IDs
                const runCaseIds = [...new Set(testsList.map((t: any) => t.case_id.toString()))];
                logger.info(`Found ${runCaseIds.length} cases in Run ${runId}`);

                // Merge with existing caseIds if any
                targetCaseIds = [...new Set([...targetCaseIds, ...runCaseIds])];
            }
        } catch (e: any) {
            logger.warn(`Failed to fetch tests for Run ${runId}: ${e.message}`);
        }
    }

    // FIX: Explicitly handle caseIds (or run-derived IDs) vs Suite fetch
    if (targetCaseIds.length > 0) {
        logger.info(`Fetching ${targetCaseIds.length} specific cases individually...`);

        // Loop get_case/{id}
        for (const id of targetCaseIds) {
            try {
                const singleCase = await testRailClient.get(`get_case/${id}`);
                if (singleCase) {
                    rawCases.push(singleCase);
                }
            } catch (e: any) {
                logger.warn(`Failed to fetch Case ID ${id}. It may not exist or access denied.`);
            }
        }

    } else {
        logger.info(`Fetching ALL cases for Project ${projectId}, Suite ${suiteId}`);
        // Fetch all cases in suite
        const response = await testRailClient.get(`get_cases/${projectId}`, {
            suite_id: suiteId
        });

        // Handle { cases: [...] } vs [...]
        const list = Array.isArray(response) ? response : (response as any).cases;
        if (Array.isArray(list)) {
            rawCases = list;
        } else {
            logger.warn('Unexpected get_cases response format', response);
        }
    }

    if (rawCases.length === 0) {
        logger.warn('No cases retrieved.');
        return { raw: [], normalized: [] };
    }

    logger.info(`Retrieved ${rawCases.length} raw cases.`);
    const normalized = rawCases.map(mapTestRailCase);

    return { raw: rawCases, normalized };
}
