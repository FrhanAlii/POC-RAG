import { RunResult } from '../playwright/resultParser';

export interface Hint {
    keyword: string;
    suggestion: string;
}

const HINT_RULES: Hint[] = [
    { keyword: 'Timeout', suggestion: 'Element selector timing issue. Check if element exists or increase timeout.' },
    { keyword: 'locator', suggestion: 'Selector might be brittle or changed. Verify ID/TestID availability.' },
    { keyword: 'Navigation', suggestion: 'Page load or redirect failed. Check environment/URL access.' },
    { keyword: 'expect', suggestion: 'Assertion failed. Value mismatch or state inconsistency.' },
    { keyword: 'ReferenceError', suggestion: 'Code syntax or undefined variable in test script.' },
];

export function getFailureHints(result: RunResult): string[] {
    if (!result.error) return [];

    const hints: string[] = [];
    const lowerError = result.error.toLowerCase();

    for (const rule of HINT_RULES) {
        if (lowerError.includes(rule.keyword.toLowerCase())) {
            hints.push(rule.suggestion);
        }
    }

    if (hints.length === 0) {
        hints.push('Uncategorized error. Check logs/screenshot.');
    }

    return hints;
}
