import { MCPTool, MCPToolInput, MCPToolOutput } from '../toolRegistry';
import { storeFailure, searchSimilarFailures } from '../../failures/failureIntelligence';
import { logger } from '../../logger/logger';

export const failureIntelTool: MCPTool = {
    name: 'failureIntel',
    description: 'Store failures in vector DB and search for similar failures',

    async execute(input: MCPToolInput): Promise<MCPToolOutput> {
        try {
            const { error, context, search } = input;

            if (search) {
                // Search for similar failures
                logger.info('[MCP:FailureIntel] Searching for similar failures');

                const similarFailures = await searchSimilarFailures(error || context);

                let hint: string | undefined;
                if (similarFailures && similarFailures.length > 0) {
                    hint = `Found ${similarFailures.length} similar failure(s). Common pattern detected.`;
                }

                return {
                    success: true,
                    data: {
                        similarFailures: similarFailures || [],
                        hint,
                    },
                };
            } else {
                // Store new failure
                logger.info('[MCP:FailureIntel] Storing failure');

                await storeFailure({
                    error: error || 'Unknown error',
                    context: context || '',
                    timestamp: new Date().toISOString(),
                });

                return {
                    success: true,
                    data: { stored: true },
                };
            }
        } catch (error: any) {
            logger.error('[MCP:FailureIntel] Error:', error);

            // Graceful degradation - don't fail the pipeline
            logger.warn('[MCP:FailureIntel] Continuing without failure intelligence');

            return {
                success: true,
                data: {
                    similarFailures: [],
                    hint: 'Failure intelligence unavailable',
                },
            };
        }
    },
};
