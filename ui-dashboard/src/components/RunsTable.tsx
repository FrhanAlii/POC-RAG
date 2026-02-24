
import React from 'react';

interface Run {
    testId: string;
    caseId: string;
    passed: boolean;
    durationMs: number;
    timestamp: string;
    error?: string;
}

interface RunsTableProps {
    runs: Run[];
    onSelect: (testId: string) => void;
}

export const RunsTable: React.FC<RunsTableProps> = ({ runs, onSelect }) => {
    return (
        <table>
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Case ID</th>
                    <th>Duration</th>
                    <th>Time</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                {runs.map((run) => (
                    <tr key={run.caseId + '_' + run.timestamp}>
                        <td>
                            <span className={`badge ${run.passed ? 'badge-success' : 'badge-error'}`}>
                                {run.passed ? 'PASS' : 'FAIL'}
                            </span>
                        </td>
                        <td>{run.caseId}</td>
                        <td>{Math.round(run.durationMs)}ms</td>
                        <td>{new Date(run.timestamp).toLocaleString()}</td>
                        <td>
                            <button className="btn btn-secondary" onClick={() => onSelect(run.testId)}>
                                View
                            </button>
                        </td>
                    </tr>
                ))}
                {runs.length === 0 && (
                    <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No runs found. Start a new test run above.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};
