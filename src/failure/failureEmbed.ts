import { OpenAIClient } from '../ai/openaiClient';
import { getEmbedding } from '../rag/embed';
import { vectorStore, VectorItem } from '../store/localVectorStore';
import { RunResult } from '../playwright/resultParser';
import { logger } from '../logger/logger';

export interface SimilarFailure {
    caseId: string;
    error: string;
    step?: string;
    score: number;
    timestamp: string;
}

export async function storeFailure(result: RunResult, testTitle: string) {
    if (result.passed) return;

    const errorText = result.error || 'Unknown Error';
    const textToEmbed = `
Failure Context:
Case ID: ${result.caseId}
Title: ${testTitle}
Step: ${result.failedStep || 'Unknown'}
Error: ${errorText}
    `.trim();

    try {
        let embeddingText = textToEmbed;

        // Try AI Enrichment
        const aiSummary = await OpenAIClient.generateCompletion([
            { role: 'system', content: 'You are a QA Failure Analyst. Summarize the likely root cause of this error in 1 sentence.' },
            { role: 'user', content: `Error: ${errorText}\nStep: ${result.failedStep}` }
        ]);

        if (aiSummary) {
            embeddingText += `\nAI Analysis: ${aiSummary}`;
            logger.info(`[AI] Generated root cause summary via LLM`);
        }

        const embedding = await getEmbedding(embeddingText);

        // Use a composite ID to allow multiple failures per case over time
        const failureId = `fail_${result.caseId}_${Date.now()}`;

        vectorStore.upsertMany([{
            id: failureId,
            text: embeddingText,
            metadata: {
                type: 'failure', // Distinguisher
                caseId: result.caseId,
                error: errorText,
                step: result.failedStep,
                timestamp: result.timestamp
            },
            embedding
        }]);

        logger.info(`Stored failure intelligence for Case ${result.caseId}`);
    } catch (e) {
        logger.error(`Failed to store failure embedding for Case ${result.caseId}`, e);
    }
}
