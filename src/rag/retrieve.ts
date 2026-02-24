import { getEmbedding } from './embed';
import { vectorStore } from '../store/localVectorStore';
import { logger } from '../logger/logger';

export async function retrieveContext(query: string, nResults: number = 3): Promise<string[]> {
    try {
        const queryEmbedding = await getEmbedding(query);
        const results = vectorStore.query(queryEmbedding, nResults);

        return results.map(r => r.text);
    } catch (error) {
        logger.warn('Retrieval Failed:', error);
        return [];
    }
}
