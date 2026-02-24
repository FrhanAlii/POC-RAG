import { OpenAI } from 'openai';
import { config } from '../config/config';
import { logger } from '../logger/logger';
import { TestRailCase } from '../types/contracts';
import { GHERKIN_SYSTEM_PROMPT } from '../rag/prompt';

const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY || 'dummy',
});

export async function generateGherkin(testCase: TestRailCase, context: string[]): Promise<string> {
    if (!config.OPENAI_API_KEY || config.OPENAI_API_KEY === 'dummy') {
        logger.warn('No OpenAI Key. Returning stub Gherkin.');
        return `Feature: ${testCase.title}\n\n  @caseId:${testCase.id}\n  Scenario: ${testCase.title}\n    Given the app is open\n    When I do action\n    Then I see result`;
    }

    const prompt = `
Context Examples:
${context.join('\n---\n')}

Test Case to Convert:
ID: ${testCase.id}
Title: ${testCase.title}
Preconditions: ${testCase.custom_preconds || 'None'}
Steps: ${testCase.custom_steps || 'None'}
Expected: ${testCase.custom_expected || 'None'}
`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // or gpt-3.5-turbo
            messages: [
                { role: 'system', content: GHERKIN_SYSTEM_PROMPT },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2, // Low temp for strict adherence
        });

        const content = response.choices[0]?.message?.content || '';
        // Strip markdown code blocks if LLL adds them despite prompt
        return content.replace(/```gherkin/g, '').replace(/```/g, '').trim();

    } catch (error) {
        logger.error('Gherkin Generation Logic Failed', error);
        throw error;
    }
}
