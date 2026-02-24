export function validateFeature(gherkin: string): boolean {
    if (!gherkin.trim()) return false;

    const requiredKeywords = [
        /^Feature:/m,
        /Scenario:/, // Can be Scenario Outline too
        /Given|When/ // Needs at least some steps
    ];

    for (const regex of requiredKeywords) {
        if (!regex.test(gherkin)) {
            throw new Error(`Invalid Gherkin: Missing pattern ${regex}`);
        }
    }

    return true;
}
