
import { orchestrator } from './src/automation/orchestrator';
import { logger } from './src/logger/logger';

async function test() {
    console.log('--- STARTING END-TO-END PIPELINE TEST ---');
    const result = await orchestrator.runTestRailCase({
        caseId: '1', // Dummy ID
        targetUrl: 'https://www.amazon.com'
    });
    console.log('--- FINAL RESULT ---');
    console.log(JSON.stringify(result, null, 2));
}

test().catch(console.error);
