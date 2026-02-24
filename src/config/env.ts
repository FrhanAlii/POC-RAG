import { z } from 'zod';

export const EnvSchema = z.object({
    // Pipeline Context
    PROJECT_ID: z.string().optional(),
    SUITE_ID: z.string().optional(),

    // Logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // TestRail
    TESTRAIL_BASE_URL: z.string().url(),
    TESTRAIL_USER: z.string(),
    TESTRAIL_API_KEY: z.string(),

    // RAG / AI
    OPENAI_API_KEY: z.string().optional(),
    CHROMA_PATH: z.string().default('./chroma_db'),

    // Debug - strict string to boolean transformation
    DEBUG_LOCAL_FEATURES: z.string().optional().default('false').transform((val) => val === 'true'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;
