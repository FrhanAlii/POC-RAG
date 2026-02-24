import * as https from 'https';
import * as http from 'http';
import { logger } from '../logger/logger';

export interface PreflightResult {
    success: boolean;
    url: string;
    statusCode?: number;
    resolvedIPs?: string[];
    errorCode?: string;
    errorMessage?: string;
    durationMs: number;
    hints?: string[];
}

export async function performConnectivityPreflight(targetUrl: string): Promise<PreflightResult> {
    const startTime = Date.now();

    logger.info(`[PREFLIGHT] Testing connectivity to ${targetUrl}`);

    return new Promise((resolve) => {
        try {
            const urlObj = new URL(targetUrl);
            const isHttps = urlObj.protocol === 'https:';
            const client = isHttps ? https : http;

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'HEAD',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            };

            const req = client.request(options, (res) => {
                const durationMs = Date.now() - startTime;

                logger.info(`[PREFLIGHT] Response status: ${res.statusCode}`);
                logger.info(`[PREFLIGHT] Duration: ${durationMs}ms`);

                // Get resolved IP from socket
                const socket = res.socket as any;
                const resolvedIP = socket?.remoteAddress;

                resolve({
                    success: true,
                    url: targetUrl,
                    statusCode: res.statusCode,
                    resolvedIPs: resolvedIP ? [resolvedIP] : [],
                    durationMs,
                });
            });

            req.on('error', (error: any) => {
                const durationMs = Date.now() - startTime;

                logger.error(`[PREFLIGHT] Connection failed:`, error);

                const hints = [
                    'Check VPN/proxy/firewall/antivirus settings',
                    'Try different network connection',
                    'Amazon may block datacenter IPs',
                    'Verify DNS resolution is working',
                ];

                if (error.code === 'ENOTFOUND') {
                    hints.unshift('DNS resolution failed - check internet connection');
                } else if (error.code === 'ECONNRESET') {
                    hints.unshift('Connection reset - possible firewall or proxy issue');
                } else if (error.code === 'ETIMEDOUT') {
                    hints.unshift('Connection timeout - network may be slow or blocked');
                }

                resolve({
                    success: false,
                    url: targetUrl,
                    errorCode: error.code,
                    errorMessage: error.message,
                    durationMs,
                    hints,
                });
            });

            req.on('timeout', () => {
                req.destroy();
                const durationMs = Date.now() - startTime;

                resolve({
                    success: false,
                    url: targetUrl,
                    errorCode: 'ETIMEDOUT',
                    errorMessage: 'Request timeout after 10s',
                    durationMs,
                    hints: [
                        'Network connection is too slow',
                        'Try different network',
                        'Check firewall settings',
                    ],
                });
            });

            req.end();

        } catch (error: any) {
            const durationMs = Date.now() - startTime;

            resolve({
                success: false,
                url: targetUrl,
                errorCode: 'INVALID_URL',
                errorMessage: error.message,
                durationMs,
                hints: ['Invalid URL format'],
            });
        }
    });
}
