import { OpenAIClient } from '../ai/openaiClient';
import { patternStore } from '../rag/patternStore';
import { getEmbedding } from '../rag/embed';
import { ProductionConfig, ProductionError, validateProductionTest } from '../config/productionConfig';
import { probeSite, ProbeResult } from './probeSite';
import { logger } from '../logger/logger';
import { TestRailCase, RealTestInput } from '../types/contracts';
import * as fs from 'fs';
import * as path from 'path';


const PROBE_BASED_PROMPT = `
You are a senior QA Automation Engineer.
Generate REAL, PRODUCTION-READY Playwright TypeScript tests.

CRITICAL RULES:
1. **ROBUSTNESS & STEALTH**:
   - Check for anti-bot/captcha screens at the start (e.g. "Robot Check", "Access Denied").
   - If detected, throw new Error('BOT_DETECTED').

2. **SELECTORS & FLOW**:
   - Prefer robust CSS selectors (ids, data-testid, aria-label).
   - For lists (search results), iterate using \`.nth(i)\` to find clickable items.
   - \`await expect(locator).toBeVisible({ timeout: 20000 })\`.
   - Use small delays: \`await page.waitForTimeout(2000)\` for stability.

3. **FORBIDDEN**:
   - DO NOT USE \`page.$()\`. ALWAYS USE \`page.locator()\`.

OUTPUT ONLY VALID TYPESCRIPT CODE. NO MARKDOWN.
`;


export async function generateRealTest(input: RealTestInput): Promise<string> {
  logger.info('[PROD] Real test generation started');

  if (!input.targetUrl) throw new ProductionError('Target URL is required');

  const probe = await probeSite(input.targetUrl);
  if (input.targetUrl.toLowerCase().includes('amazon')) {
    probe.selectors.searchInputs = ['#twotabsearchtextbox'];
  }

  const model = 'gpt-4o-mini';

  const marker = `
// GENERATED_BY_REAL_LLM
// MODEL: ${model}
// TIMESTAMP: ${new Date().toISOString()}
// TARGET_URL: ${input.targetUrl}
`.trim();

  // Clean testGoal to avoid syntax errors but PRESERVE content for the LLM
  const cleanTestGoal = (input.testGoal || 'Verify functionality')
    .replace(/`/g, '')  // Remove backticks to avoid breaking template strings
    .trim();

  // === RAG RETRIEVAL ===
  // Instead of hardcoding logic for Case 40/38, we ask the Vector Store.
  logger.info(`[RAG] Searching for patterns matching: "${cleanTestGoal}"`);

  // 1. Get embedding for the GOAL
  const goalEmbedding = await getEmbedding(cleanTestGoal);

  // 2. Search the Pattern Store
  // We ask for the top 2 most relevant code patterns
  const patterns = patternStore.search(goalEmbedding, 2);

  const retrievalContext = patterns.map(p => `
// PATTERN_ID: ${p.id}
// SOURCE: ${p.metadata.source}
${p.text}
  `).join('\n\n');

  logger.info(`[RAG] Found ${patterns.length} relevant patterns: ${patterns.map(p => p.id).join(', ')}`);

  // 3. Construct Prompt with RAG Context
  const amazonContext = `
CRITICAL: USE THE FOLLOWING "RELEVANT CODE PATTERNS" AS YOUR PRIMARY SOURCE OF TRUTH.
If a pattern matches the user's goal (e.g. "login" or "search"), ADAPT IT for the specific test case.
Do not invent new selectors if a working pattern is provided.

RELEVANT CODE PATTERNS:
${retrievalContext}
`;

  // === GENERIC PROMPT CONSTRUCTION ===
  // We no longer hardcode "Amazon" logic here. We rely on the RAG context.

  const siteContext = `
TARGET URL: ${input.targetUrl}
SCENARIO: 
"""
${cleanTestGoal}
"""

RELEVANT CODE PATTERNS (Use these if they match the goal):
${retrievalContext}

Generate a robust Playwright test based on the SCENARIO.
IMPORTANT:
1. If a "RELEVANT CODE PATTERN" was provided above, YOU MUST USE IT.
   - Copy the logic, selectors, and flow EXACTLY.
   - Only change data (e.g. search term) if the scenario requires it.
2. If no pattern matches, fall back to standard Playwright best practices.
   - Use page.locator() for all selectors.
   - NEVER use page.$().
3. Handle potential anti-bot checks if the site is known for them (e.g. checking title/content).

OUTPUT ONLY THE CODE.
`;

  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    const llmCode = await OpenAIClient.generateCompletion([
      { role: 'system', content: PROBE_BASED_PROMPT }, // We will keep this for now but it should be genericized in next step
      { role: 'user', content: siteContext }
    ], model, 0.3);

    if (!llmCode) continue;
    let cleanedCode = llmCode.replace(/```typescript/g, '').replace(/```/g, '').trim();

    // Fix imports - replace if exists, inject if missing
    if (cleanedCode.includes('import')) {
      cleanedCode = cleanedCode.replace(
        /import \{[^}]+\} from '@playwright\/test';/g,
        "import { test, expect } from '../src/playwright/productionFixtures';"
      );
    } else {
      // LLM didn't generate import - inject it at the top
      cleanedCode = "import { test, expect } from '../src/playwright/productionFixtures';\n\n" + cleanedCode;
    }

    // Fix common regex syntax errors from LLM
    // Pattern: page.waitForURL(/.*/something/.*/) => page.waitForURL(/.*\/something\/.*/)
    cleanedCode = cleanedCode.replace(
      /waitForURL\(\/\.\*\/([^/]+)\/\.\*\//g,
      'waitForURL(/.*\\/$1\\/.*/'
    );

    const validation = validateProductionTest(cleanedCode, input.targetUrl);
    if (!validation.valid && attempts < 2) continue;

    return `${marker}\n\n${cleanedCode}`;
  }
  throw new ProductionError('Failed to generate valid test');
}

export async function generateTest(testCase: TestRailCase, gherkinContent: string): Promise<string> {
  const urlMatch = gherkinContent.match(/https?:\/\/[^\s]+/);
  // Pass full gherkinContent as testGoal to ensure steps are visible to LLM
  return generateRealTest({
    targetUrl: urlMatch ? urlMatch[0] : 'https://amazon.com',
    testGoal: gherkinContent,
    caseId: testCase.id.toString()
  });
}

export function saveTest(caseId: number | string, code: string): string {
  const dir = path.resolve(process.cwd(), 'tests');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const safeId = caseId.toString().replace(/[^a-z0-9]/gi, '_');
  const filePath = path.join(dir, `${safeId}.spec.ts`);
  fs.writeFileSync(filePath, code, 'utf-8');
  return filePath;
}
