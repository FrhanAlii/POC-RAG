import dotenv from 'dotenv';
import { EnvSchema, EnvConfig } from './env';

// Load .env file
dotenv.config();

// Validate env vars
const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    process.exit(1);
}

export const config: EnvConfig = parsed.data;
