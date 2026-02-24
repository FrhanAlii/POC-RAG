import { MCPTool, MCPToolInput, MCPToolOutput } from '../toolRegistry';
import { runRealAutomation } from '../../automation/runRealAutomation';
import { logger } from '../../logger/logger';

export const playwrightExecTool: MCPTool = {
    name: 'playwrightExec',
    description: 'Generate and execute Playwright tests using probe-based generation',

    async execute(input: MCPToolInput): Promise<MCPToolOutput> {
        try {
            const { url, featureText, scenario } = input;

            if (!url) {
                throw new Error('url is required');
            }

            // Validate URL
            try {
                const urlObj = new URL(url);

                // Production safety checks
                if (process.env.NODE_ENV === 'production') {
                    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
                        throw new Error('localhost URLs not allowed in production');
                    }
                    if (urlObj.hostname === 'example.com') {
                        throw new Error('example.com not allowed - use real website');
                    }
                }
            } catch (e: any) {
                throw new Error(`Invalid URL: ${e.message}`);
            }

            logger.info('[MCP:Playwright] Starting test execution');
            logger.info(`[MCP:Playwright] Target URL: ${url}`);

            // Use existing probe-based automation
            const result = await runRealAutomation({
                url,
                scenario: scenario || featureText || 'Automated test execution',
            });

            logger.info(`[MCP:Playwright] Execution complete - Passed: ${result.passed}`);

            return {
                success: true,
                data: {
                    passed: result.passed,
                    durationMs: result.durationMs,
                    error: result.error,
                    testId: result.testId,
                    status: result.status,
                },
            };
        } catch (error: any) {
            logger.error('[MCP:Playwright] Error:', error);
            return {
                success: false,
                error: error.message || 'Test execution failed',
            };
        }
    },
};
