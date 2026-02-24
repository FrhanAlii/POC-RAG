
import { vectorStore } from './localVectorStore';
import { getEmbedding } from '../rag/embed';
import { logger } from '../logger/logger';

export interface TestResultLog {
    testId: string;
    caseId?: string;
    status: 'PASS' | 'FAIL';
    error?: string;
    duration: number;
    timestamp: string;
}

export class VectorLogger {

    public async dbLog(data: TestResultLog) {
        try {
            logger.info(`[VectorLogger] Logging result for Test ${data.testId}`);

            // Create a rich text representation for semantic search
            // e.g. "Test C123 Failed with TimeoutError: Element #search not found"
            const textContent = `
Test Case: ${data.caseId || 'Ad-Hoc'}
Status: ${data.status}
Duration: ${data.duration}ms
Error: ${data.error || 'None'}
Timestamp: ${data.timestamp}
`.trim();

            const embedding = await getEmbedding(textContent);

            vectorStore.upsertMany([{
                id: `result-${data.testId}`,
                text: textContent,
                metadata: {
                    type: 'execution_result',
                    ...data
                },
                embedding
            }]);

        } catch (error) {
            logger.error('[VectorLogger] Failed to log result', error);
        }
    }
}

export const vectorLogger = new VectorLogger();
