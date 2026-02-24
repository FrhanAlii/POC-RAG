import { Before, After, Status } from '@cucumber/cucumber';
import { CustomWorld } from './world';

/**
 * DISABLED: Browser hooks not needed when using runRealAutomation
 * The existing automation system handles its own browser lifecycle
 */

Before(async function (this: CustomWorld, scenario) {
    this.pickle = scenario.pickle;
});

/**
 * After hook - runs after each scenario
 */
After(async function (this: CustomWorld, { result }) {
    console.log(`[CUCUMBER] Scenario complete`);

    if (result && result.status === Status.FAILED) {
        console.log('[CUCUMBER] Test failed - check artifacts/runs/ for details');
    }
});
