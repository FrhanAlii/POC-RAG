import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logger/logger';
import { TestRailCase } from '../types/contracts';

export function loadLocalFeatures(): { id: number; title: string; gherkin: string }[] {
    const dir = path.resolve(process.cwd(), 'features');
    if (!fs.existsSync(dir)) {
        logger.warn(`Local features directory not found at ${dir}`);
        return [];
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.feature'));
    const results = [];

    for (const file of files) {
        const idStr = file.replace('.feature', '');
        const id = parseInt(idStr, 10);

        if (isNaN(id)) {
            logger.debug(`Skipping non-numeric feature file: ${file}`);
            continue;
        }

        try {
            const content = fs.readFileSync(path.join(dir, file), 'utf-8');
            // Extract Title from Feature: line
            const titleMatch = content.match(/^Feature:\s*(.+)$/m);
            const title = titleMatch ? titleMatch[1].trim() : `Local Feature ${id}`;

            results.push({
                id,
                title,
                gherkin: content
            });
        } catch (e) {
            logger.error(`Failed to read local feature ${file}`, e);
        }
    }

    logger.info(`Loaded ${results.length} local features for debugging.`);
    return results;
}
