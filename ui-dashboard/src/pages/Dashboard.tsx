
import React, { useEffect, useState } from 'react';
import { RunsTable } from '../components/RunsTable';

interface DashboardProps {
    onSelectRun: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectRun }) => {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [runCaseId, setRunCaseId] = useState('');

    const fetchRuns = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/runs');
            const data = await res.json();
            setRuns(data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchRuns();
        const interval = setInterval(fetchRuns, 5000); // Auto refresh
        return () => clearInterval(interval);
    }, []);

    const handleRun = async () => {
        if (!runCaseId) return;
        setLoading(true);
        try {
            await fetch('http://localhost:3001/api/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caseId: runCaseId })
            });
            // Don't alert, just clear
            setRunCaseId('');
            // Force immediate fetch?
            setTimeout(fetchRuns, 1000);
        } catch (e) {
            alert('Failed to start run');
        } finally {
            setLoading(false);
        }
    };

    const handleCleanup = async () => {
        if (!confirm('Are you sure? This deletes all run artifacts.')) return;
        try {
            await fetch('http://localhost:3001/api/cleanup', { method: 'POST' });
            fetchRuns();
        } catch (e) {
            alert('Cleanup failed');
        }
    };

    return (
        <div className="container">
            <div className="header">
                <h1>Automation Dashboard</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-danger" onClick={handleCleanup}>
                        Cleanup Artifacts
                    </button>
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '0.5rem' }}>Execute Test</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Case ID(s)"
                        value={runCaseId}
                        onChange={e => setRunCaseId(e.target.value)}
                        style={{
                            padding: '0.6rem',
                            borderRadius: '6px',
                            border: '1px solid #334155',
                            background: '#0f172a',
                            color: 'white',
                            minWidth: '200px'
                        }}
                    />
                    <button className="btn" onClick={handleRun} disabled={loading}>
                        {loading ? 'Starting...' : 'Run New Test'}
                    </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Enter case ID to trigger pipeline. Results appear below automatically.
                </p>
            </div>

            <div className="card">
                <h2>Recent Runs</h2>
                <RunsTable runs={runs} onSelect={onSelectRun} />
            </div>
        </div>
    );
};
