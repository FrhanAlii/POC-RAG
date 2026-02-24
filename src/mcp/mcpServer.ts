import { toolRegistry } from './toolRegistry';
import { testRailTool } from './tools/testRail.tool';
import { ragGherkinTool } from './tools/ragGherkin.tool';
import { playwrightExecTool } from './tools/playwrightExec.tool';
import { failureIntelTool } from './tools/failureIntel.tool';
import { logger } from '../logger/logger';

export interface MCPOrchestrationInput {
    caseIds?: string[];
    url?: string;
    scenario?: string;
    projectId?: string;
    suiteId?: string;
}

export interface MCPOrchestrationResult {
    success: boolean;
    steps: {
        testRail?: any;
        ragGherkin?: any;
        playwrightExec?: any;
        failureIntel?: any;
    };
    finalResult?: {
        passed: boolean;
        durationMs: number;
        error?: string;
        testId?: string;
    };
    error?: string;
    usedFallback?: boolean;
}

export class MCPServer {
    private initialized = false;

    initialize(): void {
        if (this.initialized) {
            logger.warn('[MCP] Server already initialized');
            return;
        }

        logger.info('[MCP] Initializing MCP Server');

        // Register all tools
        toolRegistry.register(testRailTool);
        toolRegistry.register(ragGherkinTool);
        toolRegistry.register(playwrightExecTool);
        toolRegistry.register(failureIntelTool);

        this.initialized = true;
        logger.info('[MCP] Server initialized successfully');
        logger.info(`[MCP] Registered tools: ${toolRegistry.getRegisteredTools().join(', ')}`);
    }

    async orchestrate(input: MCPOrchestrationInput): Promise<MCPOrchestrationResult> {
        if (!this.initialized) {
            this.initialize();
        }

        logger.info('[MCP] Starting orchestration');
        const steps: any = {};

        try {
            // Step 1: Fetch test cases (if caseIds provided)
            if (input.caseIds && input.caseIds.length > 0) {
                logger.info('[MCP] Step 1: Fetching test cases');
                const testRailResult = await toolRegistry.execute('testRail', {
                    caseIds: input.caseIds,
                });
                steps.testRail = testRailResult;

                if (!testRailResult.success) {
                    throw new Error(`TestRail fetch failed: ${testRailResult.error}`);
                }

                // Step 2: Convert to Gherkin
                if (testRailResult.data?.cases?.[0]) {
                    logger.info('[MCP] Step 2: Converting to Gherkin');
                    const ragResult = await toolRegistry.execute('ragGherkin', {
                        testCase: testRailResult.data.cases[0],
                    });
                    steps.ragGherkin = ragResult;

                    if (!ragResult.success) {
                        logger.warn('[MCP] Gherkin conversion failed, using fallback');
                    }
                }
            }

            // Step 3: Execute Playwright test
            if (input.url) {
                logger.info('[MCP] Step 3: Executing Playwright test');
                const execResult = await toolRegistry.execute('playwrightExec', {
                    url: input.url,
                    scenario: input.scenario || steps.ragGherkin?.data?.featureText,
                });
                steps.playwrightExec = execResult;

                if (!execResult.success) {
                    throw new Error(`Playwright execution failed: ${execResult.error}`);
                }

                // Step 4: Handle failures with intelligence
                if (execResult.data && !execResult.data.passed) {
                    logger.info('[MCP] Step 4: Analyzing failure');
                    const failureResult = await toolRegistry.execute('failureIntel', {
                        error: execResult.data.error,
                        context: input.url,
                        search: true,
                    });
                    steps.failureIntel = failureResult;

                    // Store this failure for future reference
                    await toolRegistry.execute('failureIntel', {
                        error: execResult.data.error,
                        context: input.url,
                        search: false,
                    });
                }

                return {
                    success: true,
                    steps,
                    finalResult: execResult.data,
                };
            }

            return {
                success: true,
                steps,
            };

        } catch (error: any) {
            logger.error('[MCP] Orchestration failed:', error);
            return {
                success: false,
                steps,
                error: error.message || 'MCP orchestration failed',
            };
        }
    }

    async executeTool(toolName: string, payload: any): Promise<any> {
        if (!this.initialized) {
            this.initialize();
        }

        return toolRegistry.execute(toolName, payload);
    }

    getRegisteredTools(): string[] {
        return toolRegistry.getRegisteredTools();
    }

    isInitialized(): boolean {
        return this.initialized;
    }
}

// Singleton instance
export const mcpServer = new MCPServer();
