import express from 'express';
import { mcpServer } from '../../mcp/mcpServer';
import { runRealAutomation } from '../../automation/runRealAutomation';
import { logger } from '../../logger/logger';

const mcpRoutes = express.Router();

// MCP orchestration endpoint
mcpRoutes.post('/orchestrate', async (req, res) => {
    try {
        const { caseIds, url, scenario, projectId, suiteId } = req.body;

        if (!url && (!caseIds || caseIds.length === 0)) {
            return res.status(400).json({
                error: 'Either url or caseIds required',
            });
        }

        logger.info('[MCP API] Orchestration request received');

        const result = await mcpServer.orchestrate({
            caseIds,
            url,
            scenario,
            projectId,
            suiteId,
        });

        res.json(result);
    } catch (error: any) {
        logger.error('[MCP API] Orchestration failed:', error);
        res.status(500).json({
            error: error.message || 'MCP orchestration failed',
        });
    }
});

// Execute specific MCP tool
mcpRoutes.post('/tool/:toolName', async (req, res) => {
    try {
        const { toolName } = req.params;
        const payload = req.body;

        logger.info(`[MCP API] Tool execution request: ${toolName}`);

        const result = await mcpServer.executeTool(toolName, payload);

        res.json(result);
    } catch (error: any) {
        logger.error(`[MCP API] Tool execution failed:`, error);
        res.status(500).json({
            error: error.message || 'Tool execution failed',
        });
    }
});

// Get registered tools
mcpRoutes.get('/tools', (req, res) => {
    const tools = mcpServer.getRegisteredTools();
    res.json({
        tools,
        count: tools.length,
        initialized: mcpServer.isInitialized(),
    });
});

// MCP-enabled automation endpoint (with fallback)
mcpRoutes.post('/runAutomation', async (req, res) => {
    try {
        const { url, scenario, useMCP = true } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        logger.info(`[MCP API] Automation request - MCP mode: ${useMCP}`);

        if (useMCP) {
            // Try MCP orchestration first
            try {
                const mcpResult = await mcpServer.orchestrate({ url, scenario });

                if (mcpResult.success && mcpResult.finalResult) {
                    return res.json({
                        ...mcpResult.finalResult,
                        mcpMode: true,
                        steps: mcpResult.steps,
                    });
                }

                logger.warn('[MCP API] MCP orchestration incomplete, falling back');
            } catch (mcpError) {
                logger.warn('[MCP API] MCP failed, falling back to legacy:', mcpError);
            }
        }

        // Fallback to legacy execution
        logger.info('[MCP API] Using legacy execution');
        const result = await runRealAutomation({ url, scenario });

        res.json({
            ...result,
            mcpMode: false,
            fallback: useMCP,
        });
    } catch (error: any) {
        logger.error('[MCP API] Automation failed:', error);
        res.status(500).json({
            error: error.message || 'Automation failed',
        });
    }
});

export { mcpRoutes };
