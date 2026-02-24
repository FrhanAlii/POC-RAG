// @ts-ignore
import axios, { AxiosInstance } from 'axios';
// @ts-ignore
import axiosRetry from 'axios-retry';
import { config } from '../config/config';
import { logger } from '../logger/logger';

export class TestRailClient {
    private api: AxiosInstance;

    constructor() {
        const baseURL = config.TESTRAIL_BASE_URL.endsWith('/')
            ? `${config.TESTRAIL_BASE_URL}index.php?/api/v2/`
            : `${config.TESTRAIL_BASE_URL}/index.php?/api/v2/`;

        this.api = axios.create({
            baseURL,
            auth: {
                username: config.TESTRAIL_USER,
                password: config.TESTRAIL_API_KEY,
            },
            headers: {
                'Content-Type': 'application/json',
            },
        });

        axiosRetry(this.api, {
            retries: 1, // Polish Fix: Reduced to 1
            retryDelay: axiosRetry.exponentialDelay,
            retryCondition: (error: any) => {
                return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
            },
            onRetry: (retryCount: number, error: any, requestConfig: any) => {
                logger.warn(`Retrying TestRail request attempt ${retryCount}: ${error.message} (${requestConfig.url})`);
            }
        });
    }

    public async get(endpoint: string, params: any = {}) {
        try {
            logger.debug(`GET ${endpoint}`, params);
            const response = await this.api.get(endpoint, { params });
            return response.data;
        } catch (error: any) {
            if (error.response) {
                logger.error(`TestRail API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            } else {
                logger.error(`TestRail Network Error: ${error.message}`);
            }
            throw error;
        }
    }
}

export const testRailClient = new TestRailClient();
