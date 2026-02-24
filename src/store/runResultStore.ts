import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logger/logger';
import { RunResult } from '../playwright/resultParser';

export function saveRunResult(result: RunResult) {
    const dir = path.resolve(process.cwd(), 'artifacts/runs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const timestamp = new Date().getTime();
    const filename = `${timestamp}_${result.caseId}.json`;
    const filePath = path.join(dir, filename);

    try {
        fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
        logger.info(`Run Result Saved: ${filePath}`);
    } catch (e) {
        logger.error(`Failed to save run result for ${result.caseId}`, e);
    }
}
