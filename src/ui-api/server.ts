import express from 'express';
import cors from 'cors';
import { runRoutes } from './routes/runs';
import { pipelineRoutes } from './routes/pipeline';
import { automationRoutes } from './routes/automation';
import { mcpRoutes } from './routes/mcp';
import { mcpServer } from '../mcp/mcpServer';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize MCP Server
mcpServer.initialize();

// Routes
app.use('/api/runs', runRoutes);
app.use('/api', pipelineRoutes);
app.use('/api', automationRoutes);
app.use('/api/mcp', mcpRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        pipeline: "ok",
        vectorStore: "ok",
        artifacts: "ok",
        mcp: {
            initialized: mcpServer.isInitialized(),
            tools: mcpServer.getRegisteredTools(),
        }
    });
});

app.listen(PORT, () => {
    console.log(`!!! UI API Server v17.3.0-DASHBOARD-VISION running on http://localhost:${PORT} !!!`);
});
