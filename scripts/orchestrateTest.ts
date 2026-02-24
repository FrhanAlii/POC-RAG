import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Parse arguments
// args[0] is node, args[1] is script path, args[2] is the Case ID
const caseId = process.argv[2];

if (!caseId) {
    console.error('❌ Error: No Case ID provided.');
    console.error('Usage: npm run test:auto <CaseID>');
    console.error('Example: npm run test:auto 41');
    process.exit(1);
}

console.log('='.repeat(50));
console.log(`🚀 ORCHESTRATING TEST AUTOMATION FOR CASE ${caseId}`);
console.log('='.repeat(50));

try {
    // 1. Generate Feature File (RAG + TestRail)
    console.log(`\n[STEP 1] Generating Feature File...`);
    execSync(`npx ts-node scripts/generateFeatureFromTestRail.ts ${caseId}`, { stdio: 'inherit' });

    // 2. Verify Feature File Exists
    const featurePath = path.join(process.cwd(), 'features', `${caseId}.feature`);
    if (!fs.existsSync(featurePath)) {
        throw new Error(`Feature file not found: ${featurePath}`);
    }

    // 3. Run Cucumber Test
    console.log(`\n[STEP 2] Running Playwright Test...`);
    execSync(`npx cucumber-js features/${caseId}.feature`, { stdio: 'inherit' });

    console.log(`\n✅ SUCCESS: Case ${caseId} completed successfully.`);

} catch (error: any) {
    console.error(`\n❌ FAILED: Test execution for Case ${caseId} failed.`);
    // If it's a shell error, typically stdio:inherit handles printing it, 
    // but we exit with error code to signal failure
    process.exit(1);
}
