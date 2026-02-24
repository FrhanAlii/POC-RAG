
import { OpenAI } from 'openai';
import { config } from '../config/config';
import { logger } from '../logger/logger';

export class OpenAIClient {
    private static instance: OpenAI | null = null;
    private static isInitialized = false;

    private constructor() { }

    public static getInstance(): OpenAI | null {
        if (!this.isInitialized) {
            this.init();
        }
        return this.instance;
    }

    private static init() {
        const apiKey = config.OPENAI_API_KEY;

        if (!apiKey || apiKey === 'dummy' || apiKey.trim() === '') {
            logger.info('[AI] OpenAI Client disabled (No valid API Key detected)');
            this.instance = null;
        } else {
            try {
                this.instance = new OpenAI({
                    apiKey: apiKey,
                    timeout: 30000,
                    maxRetries: 1,
                });
                logger.info('[AI] OpenAI Client Initialized');
            } catch (error) {
                logger.error('[AI] Failed to initialize OpenAI Client', error);
                this.instance = null;
            }
        }
        this.isInitialized = true;
    }

    public static async generateCompletion(messages: any[], model = 'gpt-4o-mini', temperature = 0.2): Promise<string | null> {
        const client = this.getInstance();
        if (!client) {
            logger.warn('[AI] Client not initialized. Cannot generate completion.');
            return null;
        }

        try {
            logger.info(`[AI] OpenAI client initialized (REAL MODE)`);
            logger.info(`[AI] Sending request to OpenAI model: ${model}`);

            const response = await client.chat.completions.create({
                model,
                messages,
                temperature,
                max_tokens: 2000,
            });

            logger.info('[AI] OpenAI response received successfully');
            return response.choices[0]?.message?.content || null;
        } catch (error: any) {
            logger.error(`[AI] OpenAI call failed — Network or Auth issue: ${error.message}`);
            return null;
        }
    }
}
