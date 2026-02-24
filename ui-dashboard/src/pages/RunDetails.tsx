import React, { useEffect, useState } from 'react';

interface RunDetailsProps {
    caseId: string;
    onBack: () => void;
}

interface RunData {
    testId: string;
    url: string;
    scenario?: string;
    status: string;
    passed: boolean;
    durationMs: number;
    timestamp: string;
    error?: string;
    logs?: string;
}

export const RunDetails: React.FC<RunDetailsProps> = ({ caseId, onBack }) => {
    const [runData, setRunData] = useState<RunData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRunDetails = async () => {
            try {
                const res = await fetch(`http://localhost:3001/api/runs/${caseId}`);
                if (res.ok) {
                    const data = await res.json();
                    setRunData(data);
                }
            } catch (e) {
                console.error('Failed to fetch run details:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchRunDetails();
    }, [caseId]);

    if (loading) {
        return (
            <div className="container">
                <button className="btn btn-secondary" onClick={onBack}>← Back</button>
                <div className="card">
                    <p>Loading run details...</p>
                </div>
            </div>
        );
    }

    if (!runData) {
        return (
            <div className="container">
                <button className="btn btn-secondary" onClick={onBack}>← Back</button>
                <div className="card">
                    <h2>Run Not Found</h2>
                    <p>Could not find details for run: {caseId}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="header">
                <h1>Run Details: {runData.testId}</h1>
                <button className="btn btn-secondary" onClick={onBack}>← Back to Dashboard</button>
            </div>

            <div className="card">
                <h2>Test Information</h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                        <strong>Test ID:</strong> {runData.testId}
                    </div>
                    <div>
                        <strong>URL:</strong> <a href={runData.url} target="_blank" rel="noopener noreferrer">{runData.url}</a>
                    </div>
                    {runData.scenario && (
                        <div>
                            <strong>Scenario:</strong> {runData.scenario}
                        </div>
                    )}
                    <div>
                        <strong>Status:</strong>{' '}
                        <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            background: runData.passed ? '#10b981' : '#ef4444',
                            color: 'white',
                            fontWeight: 600
                        }}>
                            {runData.passed ? '✅ PASSED' : '❌ FAILED'}
                        </span>
                    </div>
                    <div>
                        <strong>Duration:</strong> {runData.durationMs}ms
                    </div>
                    <div>
                        <strong>Timestamp:</strong> {new Date(runData.timestamp).toLocaleString()}
                    </div>
                </div>
            </div>

            {runData.error && (
                <div className="card" style={{ background: '#fee2e2', border: '1px solid #ef4444' }}>
                    <h2 style={{ color: '#dc2626' }}>Error Details</h2>
                    <pre style={{
                        background: 'white',
                        padding: '1rem',
                        borderRadius: '6px',
                        overflow: 'auto',
                        fontSize: '0.9rem',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {runData.error}
                    </pre>
                </div>
            )}

            {runData.logs && (
                <div className="card">
                    <h2>Execution Logs</h2>
                    <pre style={{
                        background: '#1e293b',
                        color: '#e2e8f0',
                        padding: '1rem',
                        borderRadius: '6px',
                        overflow: 'auto',
                        fontSize: '0.85rem',
                        maxHeight: '400px'
                    }}>
                        {runData.logs}
                    </pre>
                </div>
            )}
        </div>
    );
};
