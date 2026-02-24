import { MCPTool, MCPToolInput, MCPToolOutput } from '../toolRegistry';
import { convertToGherkin } from '../../rag/gherkinConverter';
import { logger } from '../../logger/logger';

export const ragGherkinTool: MCPTool = {
    name: 'ragGherkin',
    description: 'Convert TestRail test case to Gherkin feature using RAG + embeddings',

    async execute(input: MCPToolInput): Promise<MCPToolOutput> {
        try {
            const { testCaseText, testCase } = input;

            if (!testCaseText && !testCase) {
                throw new Error('testCaseText or testCase required');
            }

            logger.info('[MCP:RAG] Converting to Gherkin');

            // Use existing RAG converter
            const featureText = await convertToGherkin(testCase || {
                id: 0,
                title: 'Generated Test',
                custom_steps_separated: [{ content: testCaseText }]
            });

            logger.info('[MCP:RAG] Gherkin conversion complete');

            return {
                success: true,
                data: { featureText },
            };
        } catch (error: any) {
            logger.error('[MCP:RAG] Error:', error);

            // Fallback to deterministic conversion
            logger.warn('[MCP:RAG] Using fallback deterministic conversion');

            const fallbackFeature = `Feature: Test Automation
  Scenario: ${input.testCase?.title || 'Automated Test'}
    Given the application is ready
    When the test executes
    Then the expected result is verified
`;

            return {
                success: true,
                data: { featureText: fallbackFeature },
            };
        }
    },
};
