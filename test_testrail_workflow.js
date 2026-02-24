#!/usr/bin/env node

/**
 * TestRail Workflow Test Script
 * 
 * This script tests the complete TestRail case execution workflow:
 * 1. Fetch case from TestRail
 * 2. Convert to Gherkin via RAG
 * 3. Generate Playwright test via LLM
 * 4. Execute test
 * 5. Return results
 * 
 * Usage:
 *   node test_testrail_workflow.js <caseId> <url>
 * 
 * Example:
 *   node test_testrail_workflow.js 123 https://amazon.com
 */

const http = require('http');

const caseId = process.argv[2];
const url = process.argv[3] || 'https://www.amazon.com';

if (!caseId) {
    console.error('❌ Error: Case ID is required');
    console.log('Usage: node test_testrail_workflow.js <caseId> <url>');
    console.log('Example: node test_testrail_workflow.js 123 https://amazon.com');
    process.exit(1);
}

console.log('═══════════════════════════════════════════════════════');
console.log('🧪 TestRail Workflow Test');
console.log('═══════════════════════════════════════════════════════');
console.log(`📋 Case ID: C${caseId}`);
console.log(`🌐 Target URL: ${url}`);
console.log('═══════════════════════════════════════════════════════\n');

const requestData = JSON.stringify({
    caseId: caseId,
    url: url
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/runTestRail',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
    }
};

console.log('🚀 Starting TestRail execution...\n');

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 RESULT');
        console.log('═══════════════════════════════════════════════════════');

        try {
            const result = JSON.parse(data);

            if (res.statusCode === 200) {
                console.log(`✅ Status: ${result.status.toUpperCase()}`);
                console.log(`🆔 Test ID: ${result.testId}`);
                console.log(`⏱️  Duration: ${result.durationMs}ms`);
                console.log(`${result.passed ? '✅' : '❌'} Passed: ${result.passed}`);

                if (result.error) {
                    console.log(`\n❌ Error:\n${result.error}`);
                }

                if (result.logs) {
                    console.log(`\n📝 Logs available in result`);
                }

                console.log('\n✅ TestRail workflow completed successfully!');
            } else {
                console.log(`❌ HTTP ${res.statusCode}: ${result.error}`);
                if (result.details) {
                    console.log(`💡 Details: ${result.details}`);
                }
                console.log('\n❌ TestRail workflow failed');
            }
        } catch (e) {
            console.log('❌ Failed to parse response:');
            console.log(data);
        }

        console.log('═══════════════════════════════════════════════════════\n');
    });
});

req.on('error', (e) => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('❌ CONNECTION ERROR');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Problem: ${e.message}`);
    console.log('\n💡 Make sure the backend server is running:');
    console.log('   npx tsx src/ui-api/server.ts');
    console.log('═══════════════════════════════════════════════════════\n');
});

req.write(requestData);
req.end();
