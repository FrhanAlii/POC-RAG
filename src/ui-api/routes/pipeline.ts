import express from 'express';

const pipelineRoutes = express.Router();

import * as fs from 'fs';
import * as path from 'path';

pipelineRoutes.post('/cleanup', async (req, res) => {
    try {
        const dirsToClean = [
            path.join(process.cwd(), 'artifacts/runs'),
            path.join(process.cwd(), 'artifacts/screenshots'),
            path.join(process.cwd(), 'tests') // Be careful here, only delete auto_*.spec.ts
        ];

        let deletedCount = 0;

        // Clean artifacts directories
        [dirsToClean[0], dirsToClean[1]].forEach(dir => {
            if (fs.existsSync(dir)) {
                fs.readdirSync(dir).forEach(file => {
                    if (file.endsWith('.json') || file.endsWith('.png')) {
                        fs.unlinkSync(path.join(dir, file));
                        deletedCount++;
                    }
                });
            }
        });

        // Clean generated tests (only auto_*)
        const testsDir = dirsToClean[2];
        if (fs.existsSync(testsDir)) {
            fs.readdirSync(testsDir).forEach(file => {
                if (file.startsWith('auto_') && (file.endsWith('.spec.ts') || file.endsWith('.ts'))) {
                    fs.unlinkSync(path.join(testsDir, file));
                    deletedCount++;
                }
            });
        }

        console.log(`[API] Cleanup completed. Deleted ${deletedCount} files.`);
        res.json({ success: true, count: deletedCount });
    } catch (e: any) {
        console.error('[API] Cleanup failed:', e);
        res.status(500).json({ error: e.message });
    }
});

export { pipelineRoutes };
