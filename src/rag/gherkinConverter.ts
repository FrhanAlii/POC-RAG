import { TestRailCase } from '../types/contracts';
import { logger } from '../logger/logger';
import { OpenAIClient } from '../ai/openaiClient';
import { retrieveContext } from './retrieve';
import { GHERKIN_SYSTEM_PROMPT } from './prompt';

export async function convertToGherkin(testCase: TestRailCase): Promise<string> {
    logger.info(`[RAG] Converting Case C${testCase.id} to Gherkin...`);

    try {
        // 1. Construct Search Query
        const query = `${testCase.title} ${testCase.custom_steps || ''}`;

        // 2. Retrieve Similar Context
        const context = await retrieveContext(query, 2);
        const contextString = context.length > 0
            ? `\nRELEVANT EXAMPLES:\n${context.join('\n---\n')}`
            : '';

        // 3. Prepare Prompt
        const stepsText = testCase.custom_steps_separated
            ? testCase.custom_steps_separated.map(s => `- ${s.content} (Expected: ${s.expected})`).join('\n')
            : testCase.custom_steps || 'No steps provided';

        const userPrompt = `
TEST CASE ID: ${testCase.id}
TITLE: ${testCase.title}
PRECONDITIONS: ${testCase.custom_preconds || 'None'}
STEPS:
${stepsText}

EXPECTED RESULT: ${testCase.custom_expected || 'Verify success'}
`.trim();

        // 4. Call LLM
        const llm = OpenAIClient; // Use static methods
        const gherkin = await llm.generateCompletion([
            { role: 'system', content: GHERKIN_SYSTEM_PROMPT + contextString },
            { role: 'user', content: userPrompt }
        ]);

        if (gherkin) {
            logger.info('[RAG] Generated Gherkin via LLM');
            return gherkin.replace(/```gherkin/g, '').replace(/```/g, '').trim();
        }

    } catch (e) {
        logger.error('[RAG] LLM Conversion failed, falling back to basic.', e);
    }

    // Fallback: Simplified Gherkin conversion
    const title = testCase.title || 'Test Case';
    const steps = testCase.custom_steps_separated || [];

    let gherkin = `Feature: ${title}\n\n`;
    gherkin += `  @caseId:${testCase.id}\n`;
    gherkin += `  Scenario: ${title}\n`;

    if (steps.length > 0) {
        steps.forEach((step: any, index: number) => {
            const keyword = index === 0 ? 'Given' : index === steps.length - 1 ? 'Then' : 'When';
            const content = step.content || step;
            gherkin += `    ${keyword} ${content}\n`;
        });
    } else {
        gherkin += `    Given the application is ready\n`;
        gherkin += `    When the test executes\n`;
        gherkin += `    Then the expected result is verified\n`;
    }

    return gherkin;
}
