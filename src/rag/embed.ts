import { OpenAI } from 'openai';
import { config } from '../config/config';
import { TestRailCase } from '../types/contracts';
import { logger } from '../logger/logger';
import { vectorStore } from '../store/localVectorStore';

const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY || 'dummy_key',
});

// Helper: Get Embedding from OpenAI
export async function getEmbedding(text: string): Promise<number[]> {
    if (!config.OPENAI_API_KEY || config.OPENAI_API_KEY === 'dummy_key') {
        // Stub for dev/testing
        return new Array(1536).fill(0).map(() => Math.random());
    }

    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });
        return response.data[0].embedding;
    } catch (error) {
        logger.error('OpenAI Embedding API Failed', error);
        throw error;
    }
}

export async function storeEmbeddings(cases: TestRailCase[]) {
    const items = [];
    logger.info(`Generating embeddings for ${cases.length} cases...`);

    for (const c of cases) {
        const textToEmbed = `
Title: ${c.title}
Preconditions: ${c.custom_preconds || ''}
Steps: ${c.custom_steps || ''}
Expected: ${c.custom_expected || ''}
    `.trim();

        try {
            const embedding = await getEmbedding(textToEmbed);
            items.push({
                id: c.id.toString(),
                text: textToEmbed,
                metadata: {
                    title: c.title,
                    suite_id: c.suite_id
                },
                embedding
            });
        } catch (e) {
            logger.error(`Failed to embed case ${c.id}. Skipping.`, e);
        }
    }

    if (items.length > 0) {
        vectorStore.upsertMany(items);
    }
}
