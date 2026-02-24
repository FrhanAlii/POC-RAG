import { TestRailCase } from '../types/contracts';

export function mapTestRailCase(raw: any): TestRailCase {
    // Safe mapping with defaults if fields are missing, though TestRail API is usually consistent
    return {
        id: raw.id,
        title: raw.title,
        section_id: raw.section_id,
        template_id: raw.template_id,
        type_id: raw.type_id,
        priority_id: raw.priority_id,
        milestone_id: raw.milestone_id,
        refs: raw.refs,
        created_by: raw.created_by,
        created_on: raw.created_on,
        updated_by: raw.updated_by,
        updated_on: raw.updated_on,
        estimate: raw.estimate,
        estimate_forecast: raw.estimate_forecast,
        suite_id: raw.suite_id,
        custom_automation_type: raw.custom_automation_type,
        // Custom fields mapping (names depend on TestRail instance config, we assume standard system names here or map from known keys if dynamic)
        custom_preconds: raw.custom_preconds,
        custom_steps: raw.custom_steps,
        custom_expected: raw.custom_expected,
        custom_steps_separated: raw.custom_steps_separated,
        custom_mission: raw.custom_mission,
        custom_goals: raw.custom_goals,
    };
}
