import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logger/logger';

export async function cleanupGeneratedArtifacts() {
    logger.info('Running Artifact Cleanup...');
    let deletedCount = 0;

    const dirsToClean = [
        path.resolve(process.cwd(), 'tests'),
        path.resolve(process.cwd(), 'artifacts/runs'),
        path.resolve(process.cwd(), 'features'), // Optional: clean features too? Spec said "tests/*.spec.ts" and "artifacts/runs/*.json". Let's stick to prompt.
        // Prompt says: tests/*.spec.ts, artifacts/runs/*.json
    ];

    // Explicitly define patterns per dir if needed, or just clean extensions
    const rules = [
        { dir: 'tests', ext: '.spec.ts' },
        { dir: 'artifacts/runs', ext: '.json' }
    ];

    for (const rule of rules) {
        const fullDir = path.resolve(process.cwd(), rule.dir);
        if (fs.existsSync(fullDir)) {
            const files = fs.readdirSync(fullDir);
            for (const file of files) {
                if (file.endsWith(rule.ext)) {
                    try {
                        fs.unlinkSync(path.join(fullDir, file));
                        deletedCount++;
                    } catch (e: any) {
                        logger.warn(`Failed to delete ${file}: ${e.message}`);
                    }
                }
            }
        }
    }

    logger.info(`Cleanup Complete. Deleted ${deletedCount} files.`);
}
