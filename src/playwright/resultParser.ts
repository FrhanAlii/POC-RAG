export interface RunResult {
    caseId: string;
    passed: boolean;
    durationMs: number;
    error?: string;
    failedStep?: string;
    timestamp: string;
}

export function parsePlaywrightResult(caseId: string, json: any): RunResult {
    if (!json || !json.stats) {
        return {
            caseId,
            passed: false,
            durationMs: 0,
            error: 'Invalid Playwright JSON Structure',
            timestamp: new Date().toISOString()
        };
    }

    // FIX: Use 'unexpected' to determine failure. 'failed' property does not exist in Playwright JSON stats.
    // 'expected' means passed as expected.
    // 'unexpected' means failed.
    const unexpected = json.stats.unexpected || 0;
    const flaky = json.stats.flaky || 0; // treat flaky as ? usually pass if retries worked, but let's be strict if needed. 
    // Actually flaky means it eventually passed. So unexpected=0 is enough for PASS usually.

    // Check if any output implies failure
    const passed = unexpected === 0;
    const durationMs = json.stats.duration || 0;

    let errorMsg = undefined;
    let failedStep = undefined;

    if (!passed) {
        // Deep dive for error
        const suite = json.suites?.[0];
        // Search recursively or just check first spec
        const spec = suite?.specs?.[0];
        const testResult = spec?.tests?.[0]?.results?.[0];

        if (testResult?.error) {
            const message = testResult.error.message || '';
            // Clean up ANSI codes if present? Playwright JSON is usually clear text but might have newlines
            errorMsg = message.split('\n')[0];
            failedStep = testResult.error.location ? `Line ${testResult.error.location.line}` : undefined;
        } else {
            errorMsg = 'Unknown Failure Details (Check report)';
        }
    }

    return {
        caseId,
        passed,
        durationMs,
        error: errorMsg,
        failedStep,
        timestamp: new Date().toISOString()
    };
}
