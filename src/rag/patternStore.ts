import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logger/logger';
import { config } from '../config/config';

export interface PatternItem {
    id: string; // e.g. "amazon_login"
    text: string; // The actual code snippet
    metadata: Record<string, any>; // e.g. { category: "auth", tags: ["amazon", "login"] }
    embedding: number[];
}

export class LocalPatternStore {
    private items: PatternItem[] = [];
    private filePath: string;

    constructor() {
        const dir = path.resolve(process.cwd(), config.CHROMA_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // distinct file for patterns
        this.filePath = path.join(dir, 'patterns.json');
        this.load();
    }

    private load() {
        if (fs.existsSync(this.filePath)) {
            try {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                this.items = JSON.parse(raw);
                logger.info(`Loaded ${this.items.length} patterns from local store.`);
            } catch (e) {
                logger.error('Failed to load local pattern store', e);
                this.items = [];
            }
        }
    }

    private save() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.items, null, 2), 'utf-8');
        } catch (e) {
            logger.error('Failed to save local pattern store', e);
        }
    }

    public upsert(newItems: PatternItem[]) {
        // Remove existing items with same ID
        const newIds = new Set(newItems.map(i => i.id));
        this.items = this.items.filter(i => !newIds.has(i.id));

        // Add new
        this.items.push(...newItems);
        this.save();
        logger.info(`Upserted ${newItems.length} patterns to local store.`);
    }

    public search(queryEmbedding: number[], topK: number = 3): PatternItem[] {
        if (this.items.length === 0) return [];

        // Simple Cosine Similarity
        const scored = this.items.map(item => {
            const score = cosineSimilarity(queryEmbedding, item.embedding);
            return { ...item, score };
        });

        // Sort Descending
        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, topK);
    }

    public getAll(): PatternItem[] {
        return this.items;
    }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
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

// Singleton instance
export const patternStore = new LocalPatternStore();
