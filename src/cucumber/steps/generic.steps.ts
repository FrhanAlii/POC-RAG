import { Given, setDefaultTimeout } from '@cucumber/cucumber';
import { runRealAutomation } from '../../automation/runRealAutomation';
import { CustomWorld } from '../support/world';
import { SimpleLogger } from '../../utils/simpleLogger';

// Set timeout to 5 minutes
setDefaultTimeout(300 * 1000);

Given('I perform the following test steps:', async function (this: CustomWorld, docString: string) {
    // Extract Case ID from tags if available
    let caseId = 'UNKNOWN';
    if (this.pickle && this.pickle.tags) {
        const caseIdTag = this.pickle.tags.find((t: any) => t.name.startsWith('@caseId:'));
        if (caseIdTag) {
            caseId = caseIdTag.name.split(':')[1];
        }
    }

    console.log(`[CUCUMBER] 🚀 Starting Generic Test Execution for Case ${caseId}`);
    console.log('[CUCUMBER] Steps provided:\n', docString);

    try {
        const result = await runRealAutomation({
            url: 'https://www.amazon.com',
            scenario: docString
        });

        this.testResult = result;

        if (!result.passed) {
            const errorMsg = result.error || 'Unknown error occurred during execution';
            console.error(`[CUCUMBER] ❌ Test Failed: ${errorMsg}`);
            SimpleLogger.logExecution(caseId, 'FAILED', errorMsg);
            throw new Error(errorMsg);
        }

        console.log('[CUCUMBER] ✅ Test Passed');
        SimpleLogger.logExecution(caseId, 'PASSED');

    } catch (error: any) {
        // Catch any errors that happen before runRealAutomation returns (e.g. network issues)
        console.error(`[CUCUMBER] ❌ Critical Error: ${error.message}`);
        SimpleLogger.logExecution(caseId, 'FAILED', error.message);
        throw error;
    }
});
