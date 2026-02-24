import { config } from '../config/config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const currentLevel = levels[config.LOG_LEVEL as LogLevel] || levels.info;

export const logger = {
    debug: (message: string, ...meta: any[]) => {
        if (levels.debug >= currentLevel) {
            console.debug(`[DEBUG] ${message}`, ...meta);
        }
    },
    info: (message: string, ...meta: any[]) => {
        if (levels.info >= currentLevel) {
            console.info(`[INFO] ${message}`, ...meta);
        }
    },
    warn: (message: string, ...meta: any[]) => {
        if (levels.warn >= currentLevel) {
            console.warn(`[WARN] ${message}`, ...meta);
        }
    },
    error: (message: string, error?: unknown) => {
        if (levels.error >= currentLevel) {
            console.error(`[ERROR] ${message}`, error);
        }
    },
};
