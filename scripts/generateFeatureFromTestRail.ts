import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
// Import existing vector store and embedding logic
import { getEmbedding } from '../src/rag/embed';
import { vectorStore } from '../src/store/localVectorStore';

dotenv.config();

// ============================================
// TYPES
// ============================================

interface TestRailCase {
    id: number;
    title: string;
    section_id: number;
    template_id: number;
    type_id: number;
    priority_id: number;
    custom_preconds?: string;
    custom_steps?: string;
    custom_expected?: string;
    custom_steps_separated?: Array<{
        content: string;
        expected: string;
    }>;
}

// ============================================
// TESTRAIL API CLIENT
// ============================================

class TestRailClient {
    private baseUrl: string;
    private auth: { username: string; password: string };

    constructor() {
        const baseUrl = process.env.TESTRAIL_BASE_URL;
        const user = process.env.TESTRAIL_USER;
        const apiKey = process.env.TESTRAIL_API_KEY;

        if (!baseUrl || !user || !apiKey) {
            throw new Error('Missing TestRail credentials in .env file');
        }

        this.baseUrl = baseUrl;
        this.auth = { username: user, password: apiKey };
    }

    async getCase(caseId: string): Promise<TestRailCase> {
        const url = `${this.baseUrl}/index.php?/api/v2/get_case/${caseId}`;

        console.log(`[GEN] Fetching TestRail Case ${caseId}...`);

        try {
            const response = await axios.get<TestRailCase>(url, {
                auth: this.auth,
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            console.log(`[GEN] Case fetched: "${response.data.title}"`);
            return response.data;
        } catch (error: any) {
            if (error.response) {
                throw new Error(`TestRail API error: ${error.response.status} - ${error.response.data?.error || error.message}`);
            }
            throw new Error(`Failed to fetch case: ${error.message}`);
        }
    }
}

// ============================================
// GHERKIN CONVERTER
// ============================================

// Helper to strip HTML
function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function convertToGherkin(testCase: TestRailCase): string {
    const caseId = testCase.id;
    const title = testCase.title;

    // Determine scenario type based on case ID or title
    let scenarioStepsText = '';
    let description = '';

    // DYNAMIC GENERATION: Use actual steps from TestRail
    if (testCase.custom_steps) {
        scenarioStepsText = stripHtml(testCase.custom_steps);
        description = stripHtml(testCase.custom_expected || testCase.title);
    } else if (testCase.custom_steps_separated && testCase.custom_steps_separated.length > 0) {
        // Handle separated steps format
        scenarioStepsText = testCase.custom_steps_separated.map((step, index) => {
            return `${index + 1}. ${stripHtml(step.content)} -> EXPECT: ${stripHtml(step.expected)}`;
        }).join('\n');
        description = testCase.title;
    } else {
        // Fallback if no steps found
        scenarioStepsText = stripHtml(testCase.custom_preconds || 'Automated test scenario based on title');
        description = testCase.title;
    }

    // Build Gherkin content using DocString
    const gherkin = `Feature: ${title}
  Description: ${description}

  @caseId:${caseId} @automated
  Scenario: ${title}
    Given I perform the following test steps:
      """
      ${scenarioStepsText}
      """
    Then the test should pass
`;

    return gherkin;
}

// ============================================
// FILE SAVER
// ============================================

async function saveFeatureFile(caseId: string, content: string): Promise<void> {
    const featuresDir = path.join(process.cwd(), 'features');

    // Ensure features directory exists
    if (!fs.existsSync(featuresDir)) {
        fs.mkdirSync(featuresDir, { recursive: true });
    }

    const filenameStandard = `${caseId}.feature`;
    const filepathStandard = path.join(featuresDir, filenameStandard);

    console.log(`[GEN] Converting to Gherkin format...`);

    // Save single version
    fs.writeFileSync(filepathStandard, content, 'utf-8');

    console.log(`[GEN] Feature file saved:`);
    console.log(`  - features/${filenameStandard}`);

    // ============================================
    // ADD TO CHROMA DB
    // ============================================
    try {
        console.log(`[GEN] Generating embedding for ChromaDB...`);
        const embedding = await getEmbedding(content);

        await vectorStore.upsertMany([{
            id: `feature-${caseId}`,
            text: content,
            metadata: {
                type: 'feature-file',
                caseId: caseId,
                title: `Feature: Case ${caseId}`,
                source: 'testrail-cli'
            },
            embedding: embedding
        }]);
        console.log(`[GEN] ✅ Feature file added to ChromaDB (ID: feature-${caseId})`);
    } catch (error: any) {
        console.error(`[GEN] ⚠️ Failed to add to ChromaDB: ${error.message}`);
        // Don't fail the whole process if DB fails, just warn
    }

    console.log(`[GEN] ✅ Generation complete!`);
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
    try {
        // Parse command line arguments (handle multiple formats)
        const args = process.argv.slice(2);
        let caseId: string | undefined;

        // Try different argument formats
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            // Format: --case=38
            if (arg.startsWith('--case=')) {
                caseId = arg.split('=')[1];
                break;
            }

            // Format: --case 38
            if (arg === '--case' && args[i + 1]) {
                caseId = args[i + 1];
                break;
            }

            // Format: just the number (38)
            if (/^\d+$/.test(arg)) {
                caseId = arg;
                break;
            }
        }

        if (!caseId) {
            console.error(' Usage: npm run generate-feature 38');
            console.error('   Or: npm run generate-feature -- --case 38');
            process.exit(1);
        }

        console.log('='.repeat(50));
        console.log('TestRail Feature File Generator');
        console.log('='.repeat(50));

        // Initialize TestRail client
        const client = new TestRailClient();

        // Fetch test case
        const testCase = await client.getCase(caseId);

        // Convert to Gherkin
        const gherkinContent = convertToGherkin(testCase);

        // Save feature file
        await saveFeatureFile(caseId, gherkinContent);

        console.log('='.repeat(50));
        console.log(`Next step: npm run test:auto${caseId}`);
        console.log('='.repeat(50));

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
