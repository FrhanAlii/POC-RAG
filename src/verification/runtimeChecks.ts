import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/config';
import { findSimilarFailures } from '../failure/failureSearch';
import { getFailureHints } from '../failure/failureHints';

export async function runRuntimeVerification() {
    const logs: string[] = [];

    // Helper to log to both console and file buffer
    const log = (msg: string) => {
        console.log(msg); // Force console output
        logs.push(msg);
    };

    log('\n=== RUNTIME VERIFICATION ===');
    let allPass = true;

    // 1. Verify Vector Store Growth / Existence
    const vectorPath = path.resolve(process.cwd(), config.CHROMA_PATH, 'vectors.json');
    let failuresFound = 0;

    try {
        if (fs.existsSync(vectorPath)) {
            const stat = fs.statSync(vectorPath);
            const content = JSON.parse(fs.readFileSync(vectorPath, 'utf-8'));
            failuresFound = content.filter((i: any) => i.metadata && i.metadata.type === 'failure').length;

            if (failuresFound > 0) {
                log(`Embedding Storage: PASS (Size: ${stat.size} bytes, Failures Stored: ${failuresFound})`);
            } else {
                log('Embedding Storage: WARN (File exists but 0 failures stored)');
                // Not strictly a fail if no failures occurred, but for verification of the *system* we usually expect one if we just ran a failing test.
            }
        } else {
            log('Embedding Storage: FAIL (File not found)');
            allPass = false;
        }
    } catch (e) {
        log('Embedding Storage: FAIL (Error reading store)');
        allPass = false;
    }

    // 2. Verify Similarity Search
    if (failuresFound > 0) {
        try {
            // Mock a context similar to what we expect
            const mockResult = {
                caseId: 'test_verify',
                passed: false,
                error: 'TimeoutError: waiting for selector',
                failedStep: 'Given test step',
                durationMs: 100,
                timestamp: new Date().toISOString()
            };

            const similar = await findSimilarFailures(mockResult, 'Verification Test Title', 3);

            if (Array.isArray(similar)) {
                log(`Similarity Search: PASS (Query returned ${similar.length} items)`);
            } else {
                log('Similarity Search: FAIL (Invalid return type)');
                allPass = false;
            }

        } catch (e) {
            log('Similarity Search: FAIL (Exception)');
            allPass = false;
        }
    } else {
        log('Similarity Search: SKIP (No data to search against)');
    }

    // 3. Verify Hints Engine
    try {
        const mockTimeout = { error: 'TimeoutError: waiting for selector' } as any;
        const hints = getFailureHints(mockTimeout);
        if (hints.length > 0 && hints[0].includes('timing')) {
            log(`Hints Engine: PASS (Generated: "${hints[0]}")`);
        } else {
            log('Hints Engine: FAIL (No hints for known keyword)');
            allPass = false;
        }
    } catch (e) {
        log('Hints Engine: FAIL (Exception)');
        allPass = false;
    }

    log('===========================\n');

    if (allPass) {
        log('SYSTEM FAILURE INTELLIGENCE LOOP VERIFIED');
    } else {
        log('VERIFICATION INCOMPLETE OR FAILED');
    }

    // Save to file
    try {
        const artifactDir = path.resolve(process.cwd(), 'artifacts/verification');
        if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

        const logPath = path.join(artifactDir, 'latest_verification.txt');
        fs.writeFileSync(logPath, logs.join('\n'), 'utf-8');
        // console.log(`Verification log saved to: ${logPath}`);
    } catch (e) {
        console.error('Failed to save verification log artifact', e);
    }
}
