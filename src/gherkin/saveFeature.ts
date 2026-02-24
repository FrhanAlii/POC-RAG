import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logger/logger';

export function saveFeature(caseId: number, content: string): string {
    const dir = path.resolve(process.cwd(), 'features');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Sanitize filename ?? ID is safe.
    const filePath = path.join(dir, `${caseId}.feature`);

    try {
        fs.writeFileSync(filePath, content, 'utf8');
        logger.info(`Saved Feature: ${filePath}`);
        return filePath;
    } catch (e) {
        logger.error(`Failed to save feature ${filePath}`, e);
        throw e;
    }
}
