import express from 'express';
import * as fs from 'fs';
import * as path from 'path';

const runRoutes = express.Router();

runRoutes.get('/', async (req, res) => {
    try {
        const runsDir = path.resolve(process.cwd(), 'artifacts/runs');

        if (!fs.existsSync(runsDir)) {
            return res.json([]);
        }

        const files = fs.readdirSync(runsDir)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const filePath = path.join(runsDir, f);
                const stats = fs.statSync(filePath);
                const content = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(content);

                return {
                    ...data,
                    file: f,
                    modifiedTime: stats.mtime,
                };
            })
            .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
            .slice(0, 50); // Latest 50 runs

        res.json(files);
    } catch (error: any) {
        console.error('[RUNS API] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export { runRoutes };
