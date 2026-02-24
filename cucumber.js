module.exports = {
    default: {
        require: [
            'src/cucumber/support/**/*.ts',
            'src/cucumber/steps/**/*.ts'
        ],
        requireModule: ['ts-node/register'],
        format: [
            'progress-bar',
            'json:artifacts/cucumber-report.json',
            'html:artifacts/cucumber-report.html'
        ],
        formatOptions: {
            snippetInterface: 'async-await'
        },
        timeout: 180000, // 3 minutes for LLM generation + test execution
        parallel: 1
    }
};
