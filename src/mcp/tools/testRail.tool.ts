import { MCPTool, MCPToolInput, MCPToolOutput } from '../toolRegistry';
import { fetchCases } from '../../testrail/fetchCases';
import { logger } from '../../logger/logger';

export const testRailTool: MCPTool = {
    name: 'testRail',
    description: 'Fetch test cases from TestRail or create new test cases',

    async execute(input: MCPToolInput): Promise<MCPToolOutput> {
        try {
            const { caseIds, createCases } = input;

            logger.info('[MCP:TestRail] Fetching test cases');

            // If creating cases (for Amazon scenarios)
            if (createCases && input.scenarios) {
                logger.info('[MCP:TestRail] Creating test cases for scenarios');
                // Simplified - would need actual TestRail API integration
                const createdCases = input.scenarios.map((s: any, i: number) => ({
                    id: 1000 + i,
                    title: s.title,
                    custom_steps_separated: s.steps || [],
                }));

                return {
                    success: true,
                    data: { cases: createdCases },
                };
            }

            // Fetch existing cases
            if (!caseIds || caseIds.length === 0) {
                throw new Error('caseIds required');
            }

            const result = await fetchCases(caseIds);
            const cases = result.normalized || [];

            logger.info(`[MCP:TestRail] Fetched ${cases.length} test cases`);

            return {
                success: true,
                data: { cases },
            };
        } catch (error: any) {
            logger.error('[MCP:TestRail] Error:', error);
            return {
                success: false,
                error: error.message || 'Failed to fetch test cases',
            };
        }
    },
};
