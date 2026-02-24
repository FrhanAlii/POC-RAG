import { logger } from '../logger/logger';

export interface MCPToolInput {
    [key: string]: any;
}

export interface MCPToolOutput {
    success: boolean;
    data?: any;
    error?: string;
    durationMs?: number;
}

export interface MCPTool {
    name: string;
    description: string;
    execute: (input: MCPToolInput) => Promise<MCPToolOutput>;
}

export class ToolRegistry {
    private tools: Map<string, MCPTool> = new Map();

    register(tool: MCPTool): void {
        if (this.tools.has(tool.name)) {
            logger.warn(`[MCP] Tool ${tool.name} already registered, overwriting`);
        }
        this.tools.set(tool.name, tool);
        logger.info(`[MCP] Registered tool: ${tool.name}`);
    }

    async execute(toolName: string, input: MCPToolInput): Promise<MCPToolOutput> {
        const startTime = Date.now();

        const tool = this.tools.get(toolName);
        if (!tool) {
            logger.error(`[MCP] Tool not found: ${toolName}`);
            return {
                success: false,
                error: `Tool not found: ${toolName}`,
                durationMs: Date.now() - startTime,
            };
        }

        try {
            logger.info(`[MCP] Executing tool: ${toolName}`);
            const result = await tool.execute(input);
            const durationMs = Date.now() - startTime;

            logger.info(`[MCP] Tool ${toolName} completed in ${durationMs}ms`);

            return {
                ...result,
                durationMs,
            };
        } catch (error: any) {
            const durationMs = Date.now() - startTime;
            logger.error(`[MCP] Tool ${toolName} failed:`, error);

            return {
                success: false,
                error: error.message || 'Tool execution failed',
                durationMs,
            };
        }
    }

    getRegisteredTools(): string[] {
        return Array.from(this.tools.keys());
    }

    hasTool(toolName: string): boolean {
        return this.tools.has(toolName);
    }
}

export const toolRegistry = new ToolRegistry();
