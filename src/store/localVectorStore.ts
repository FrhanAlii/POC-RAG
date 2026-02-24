import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logger/logger';
import { config } from '../config/config';

export interface VectorItem {
    id: string;
    text: string;
    metadata: Record<string, any>;
    embedding: number[];
}

export class LocalVectorStore {
    private items: VectorItem[] = [];
    private filePath: string;

    constructor(persistPath: string = config.CHROMA_PATH) {
        const dir = path.resolve(process.cwd(), persistPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Using JSONL for cleaner append-like structure, or just JSON for simplicity in this POC
        this.filePath = path.join(dir, 'vectors.json');
        this.init();
    }

    private init() {
        if (fs.existsSync(this.filePath)) {
            try {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                this.items = JSON.parse(raw);
                logger.info(`Initialized Local Vector Store. Loaded ${this.items.length} items.`);
            } catch (e) {
                logger.error('Failed to load local vector store. Starting fresh.', e);
                this.items = [];
            }
        } else {
            logger.info('Initialized new Local Vector Store.');
        }
    }

    public save() {
        try {
            // Atomic write pattern preferred, but simple writeFileSync ok for POC
            fs.writeFileSync(this.filePath, JSON.stringify(this.items, null, 2), 'utf-8');
        } catch (e) {
            logger.error('Failed to persist vector store!', e);
        }
    }

    public upsertMany(newItems: VectorItem[]) {
        // 1. Filter out old versions of these IDs
        const newIds = new Set(newItems.map(i => i.id));
        this.items = this.items.filter(i => !newIds.has(i.id));

        // 2. Add new
        this.items.push(...newItems);

        // 3. Persist
        this.save();
        logger.info(`Upserted ${newItems.length} items. Total: ${this.items.length}`);
    }

    public query(queryEmbedding: number[], topK: number = 3): VectorItem[] {
        if (this.items.length === 0) return [];

        const scored = this.items.map(item => ({
            ...item,
            score: this.cosineSimilarity(queryEmbedding, item.embedding)
        }));

        // Start with highest score
        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, topK);
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) return 0;
        let dot = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
    }
}

// Export singleton
export const vectorStore = new LocalVectorStore();
