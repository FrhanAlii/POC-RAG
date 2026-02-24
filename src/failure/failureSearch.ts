import { getEmbedding } from '../rag/embed';
import { vectorStore } from '../store/localVectorStore';
import { RunResult } from '../playwright/resultParser';
import { logger } from '../logger/logger';
import { SimilarFailure } from './failureEmbed'; // Reusing interface

export async function findSimilarFailures(result: RunResult, testTitle: string, limit: number = 3): Promise<SimilarFailure[]> {
    if (result.passed) return [];

    const errorText = result.error || 'Unknown Error';
    const queryText = `
Failure Context:
Step: ${result.failedStep || 'Unknown'}
Error: ${errorText}
    `.trim();

    try {
        const queryEmbedding = await getEmbedding(queryText);
        const searchResults = vectorStore.query(queryEmbedding, limit * 2); // Fetch more to filter

        return searchResults
            .filter(item => item.metadata.type === 'failure') // Filter only failures
            .filter(item => item.metadata.caseId !== result.caseId) // Exclude self (previous runs okay, but let's see)
            // Actually, showing previous failure of SAME case is useful. 
            // Only exclude exact current runs if we managed to save it already? 
            // We search usually BEFORE saving current one to avoid 100% match.
            .slice(0, limit)
            .map(item => ({
                caseId: item.metadata.caseId,
                error: item.metadata.error,
                step: item.metadata.step,
                score: (item as any).score,
                timestamp: item.metadata.timestamp
            }));

    } catch (e) {
        logger.warn('Failed to search similar failures', e);
        return [];
    }
}
