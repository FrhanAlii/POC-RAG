import { Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';

/**
 * Shared verification step used by all test cases
 */
Then('the test should pass', async function (this: CustomWorld) {
    if (!this.testResult) {
        throw new Error('No test result found');
    }

    if (!this.testResult.passed) {
        throw new Error(`Test failed: ${this.testResult.error}`);
    }

    console.log('✅ Verification passed');
});
