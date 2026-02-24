import { Given, setDefaultTimeout } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';
import { runRealAutomation } from '../../automation/runRealAutomation';

// Set timeout to 3 minutes for LLM generation + test execution
setDefaultTimeout(180 * 1000);

/**
 * Case 40: Amazon Login Verification
 */
Given('the login scenario is ready to execute', async function (this: CustomWorld) {
    console.log('[CUCUMBER] Starting Case 40: Amazon Login Verification');

    const scenarioText = 'Login to Amazon account using email and password, verify successful login';

    const result = await runRealAutomation({
        url: 'https://www.amazon.com',
        scenario: scenarioText
    });

    this.testResult = result;

    if (!result.passed) {
        throw new Error(result.error || 'Login test execution failed');
    }

    console.log('[CUCUMBER] ✅ Case 40 PASSED');
});
