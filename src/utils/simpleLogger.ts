import * as fs from 'fs';
import * as path from 'path';

export class SimpleLogger {
    private static logFilePath = path.join(process.cwd(), 'test_execution.log');

    static log(message: string): void {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] ${message}\n`;

        try {
            fs.appendFileSync(this.logFilePath, formattedMessage);
        } catch (error) {
            console.error('Failed to write to test_execution.log', error);
        }
    }

    static logExecution(caseId: string, status: 'PASSED' | 'FAILED', error?: string): void {
        const separator = '-'.repeat(50);
        const logEntry = `
TEST EXECUTION REPORT
Case ID: ${caseId}
Status: ${status}
${error ? `Failure Reason: ${error}` : ''}
${separator}
`;
        this.log(logEntry.trim());
    }
}
