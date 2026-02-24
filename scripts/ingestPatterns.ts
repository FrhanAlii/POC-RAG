import * as fs from 'fs';
import * as path from 'path';
import { getEmbedding } from '../src/rag/embed';
import { patternStore } from '../src/rag/patternStore';
import { logger } from '../src/logger/logger';

async function ingestPatterns() {
    const kbDir = path.resolve(process.cwd(), 'knowledge_base');

    if (!fs.existsSync(kbDir)) {
        logger.error(`Knowledge Base directory not found: ${kbDir}`);
        return;
    }

    // Recursive scanner
    function getFiles(dir: string): string[] {
        let results: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const res = path.resolve(dir, entry.name);
            if (entry.isDirectory()) {
                results = results.concat(getFiles(res));
            } else if (entry.isFile() && entry.name.endsWith('.ts')) {
                results.push(res);
            }
        }
        return results;
    }

    const allFiles = getFiles(kbDir);
    logger.info(`Found ${allFiles.length} pattern files in ${kbDir} (recursive)`);

    const items = [];

    for (const filePath of allFiles) {
        // Read file content
        const content = fs.readFileSync(filePath, 'utf-8');

        // ID is safer as the relative path to avoid duplicates: "amazon/auth/login"
        const relativePath = path.relative(kbDir, filePath).replace(/\\/g, '/');
        const id = relativePath.replace('.ts', '');

        // Source is also relative path for clarity
        const source = relativePath;

        try {
            logger.info(`Embedding pattern: ${id}...`);
            // We embed the WHOLE content so the LLM can match "how do I login" to the login code
            const embedding = await getEmbedding(content);

            items.push({
                id,
                text: content,
                metadata: { source: source },
                embedding
            });
        } catch (e) {
            logger.error(`Failed to embed ${id}`, e);
        }
    }

    if (items.length > 0) {
        patternStore.upsert(items);
        logger.info(`Successfully indexed ${items.length} patterns.`);
    } else {
        logger.warn('No patterns found to index.');
    }
}

// Run if called directly
ingestPatterns().catch(e => logger.error('Ingestion failed', e));
