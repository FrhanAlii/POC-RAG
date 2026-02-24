/**
 * Represents a TestRail test case.
 */
export interface TestRailCase {
    id: number;
    title: string;
    section_id: number;
    template_id: number;
    type_id: number;
    priority_id: number;
    milestone_id?: number;
    refs?: string;
    created_by: number;
    created_on: number;
    updated_by: number;
    updated_on: number;
    estimate?: string;
    estimate_forecast?: string;
    suite_id: number;
    custom_automation_type?: number;
    custom_preconds?: string;
    custom_steps?: string;
    custom_expected?: string;
    custom_steps_separated?: Array<{ content: string; expected: string }>;
    custom_mission?: string;
    custom_goals?: string;
}

/**
 * Represents a parsed Gherkin feature.
 */
export interface GherkinFeature {
    name: string;
    description: string;
    tags: string[];
    scenarios: Array<{
        name: string;
        steps: Array<{
            keyword: string;
            text: string;
        }>;
    }>;
}

/**
 * Represents a generated test file artifact.
 */
export interface GeneratedTestFile {
    filePath: string;
    content: string;
    sourceCaseId?: number;
}

/**
 * Represents the result of a single test run.
 */
export interface RunResult {
    passed: boolean;
    durationMs: number;
    error?: string;
    testId: string;
    logs?: string;
    status?: string;
}

/**
 * Represents a recorded failure in the pipeline.
 */
export interface FailureRecord {
    testId: string;
    errorMessage: string;
    stackTrace?: string;
}

/**
 * Represents input for real production test generation.
 */
export interface RealTestInput {
    targetUrl: string;
    testGoal?: string;
    loginFlow?: boolean;
    extraSteps?: string[];
    caseId?: string; // Optional for backward compatibility
}

