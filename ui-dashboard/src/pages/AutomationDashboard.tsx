
import React, { useEffect, useState } from 'react';
import { RunsTable } from '../components/RunsTable';
import { RunDetailsModal } from '../components/RunDetailsModal';

interface AutomationDashboardProps {
    onSelectRun: (id: string) => void;
    onSwitchToLegacy: () => void;
}

interface TestResult {
    status: 'idle' | 'running' | 'success' | 'failed' | 'blocked';
    testId?: string;
    passed?: boolean;
    durationMs?: number;
    error?: string;
    errorReason?: string;
    failureType?: string;
    logs?: string;
    screenshotPath?: string;
    trace?: string;
    preflightDiagnostics?: any;
}

export const AutomationDashboard: React.FC<AutomationDashboardProps> = ({ onSelectRun, onSwitchToLegacy }) => {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [websiteUrl] = useState('https://www.amazon.com');
    const [scenario, setScenario] = useState('');
    const [error, setError] = useState('');
    const [result, setResult] = useState<TestResult>({ status: 'idle' });

    // TestRail Mode State
    const [mode, setMode] = useState<'adhoc' | 'testrail'>('adhoc');
    const [caseId, setCaseId] = useState('');
    const [runId, setRunId] = useState('');

    // Run details modal
    const [selectedRunDetails, setSelectedRunDetails] = useState<any>(null);

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
        const interval = setInterval(fetchRuns, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRunAutomation = async () => {
        setError('');
        setLoading(true);
        setResult({ status: 'running' });

        try {
            console.log('[UI] Starting automation for:', websiteUrl);

            console.log('[UI] Starting automation for:', websiteUrl);

            let endpoint = 'http://localhost:3001/api/runAutomation';
            let body: any = {
                url: websiteUrl,
                scenario: scenario || 'Automated website testing'
            };

            if (mode === 'testrail') {
                endpoint = 'http://localhost:3001/api/runTestRail';
                body = {
                    url: websiteUrl,
                    caseId: caseId.replace('C', ''), // robust handling
                    runId: runId.replace('R', '')
                };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.error('[UI] Non-JSON response received:', text);
                throw new Error(`Server returned HTML/Text instead of JSON (Status ${response.status}). This often means the API endpoint crashed or TestRail is not reached.`);
            }

            if (!response.ok) {
                setError(data.error || 'Failed to run automation');
                setResult({ status: 'failed', error: data.error || data.details || 'Server error' });
                setLoading(false);
                return;
            }

            console.log('[UI] Automation completed:', data);

            // Set result
            setResult({
                status: data.status === 'blocked' ? 'blocked' : (data.passed ? 'success' : 'failed'),
                testId: data.testId,
                passed: data.passed,
                durationMs: data.durationMs,
                error: data.error,
                errorReason: data.errorReason,
                failureType: data.failureType,
                logs: data.logs,
                screenshotPath: data.screenshotPath,
                trace: data.trace,
                preflightDiagnostics: data.preflightDiagnostics,
            });

            // Refresh runs immediately
            fetchRuns();
        } catch (e: any) {
            console.error('[UI] Automation error:', e);
            setError(e.message || 'Failed to run automation');
            setResult({ status: 'failed', error: e.message });
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

    const handleNewTest = () => {
        setResult({ status: 'idle' });
        setError('');
        // Don't reset URL as user might want to re-run different case on same site
    };

    const handleViewRun = async (testId: string) => {
        try {
            const res = await fetch(`http://localhost:3001/api/runs/${testId}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedRunDetails(data);
            } else {
                console.error('Failed to fetch run details');
            }
        } catch (e) {
            console.error('Error fetching run details:', e);
        }
    };

    return (
        <div className="container">
            <div className="header">
                <div>
                    <h1>🚀 Production Automation Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                        Real website testing with AI-generated Playwright tests
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-secondary" onClick={onSwitchToLegacy}>
                        Legacy Mode
                    </button>
                    <button className="btn btn-danger" onClick={handleCleanup}>
                        Cleanup Artifacts
                    </button>
                </div>
            </div>

            {/* Result Panel */}
            {result.status !== 'idle' && (
                <div className="card" style={{
                    background: result.status === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                        result.status === 'failed' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                            'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    marginBottom: '1.5rem'
                }}>
                    {result.status === 'running' && (
                        <div>
                            <h2 style={{ color: 'white', margin: '0 0 1rem 0' }}>⏳ Running Real Browser Automation...</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div className="spinner" style={{
                                    border: '3px solid rgba(255,255,255,0.3)',
                                    borderTop: '3px solid white',
                                    borderRadius: '50%',
                                    width: '30px',
                                    height: '30px',
                                    animation: 'spin 1s linear infinite'
                                }}></div>
                                <p style={{ margin: 0 }}>Generating test, launching browser, executing assertions...</p>
                            </div>
                        </div>
                    )}

                    {result.status === 'success' && (
                        <div>
                            <h2 style={{ color: 'white', margin: '0 0 1rem 0' }}>✅ Test Passed!</h2>
                            <div style={{ fontSize: '0.95rem', opacity: 0.95 }}>
                                <p style={{ margin: '0.5rem 0' }}><strong>Test ID:</strong> {result.testId}</p>
                                <p style={{ margin: '0.5rem 0' }}><strong>Duration:</strong> {result.durationMs}ms</p>
                            </div>
                            <button
                                onClick={handleNewTest}
                                style={{
                                    marginTop: '1rem',
                                    background: 'white',
                                    color: '#10b981',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Run Another Test
                            </button>
                        </div>
                    )}

                    {result.status === 'failed' && (
                        <div>
                            <h2 style={{ color: 'white', margin: '0 0 1rem 0' }}>❌ Test Failed</h2>
                            <div style={{ fontSize: '0.95rem', opacity: 0.95 }}>
                                <p style={{ margin: '0.5rem 0' }}><strong>Test ID:</strong> {result.testId}</p>
                                {result.failureType && (
                                    <p style={{ margin: '0.5rem 0' }}>
                                        <strong>Failure Type:</strong>{' '}
                                        <span style={{
                                            background: 'rgba(0,0,0,0.3)',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.85rem'
                                        }}>
                                            {result.failureType}
                                        </span>
                                    </p>
                                )}
                                {result.durationMs && <p style={{ margin: '0.5rem 0' }}><strong>Duration:</strong> {result.durationMs}ms</p>}
                                {result.error && (
                                    <div style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '1rem',
                                        borderRadius: '6px',
                                        marginTop: '1rem',
                                        maxHeight: '200px',
                                        overflow: 'auto'
                                    }}>
                                        <strong>Error:</strong>
                                        <pre style={{
                                            margin: '0.5rem 0 0 0',
                                            whiteSpace: 'pre-wrap',
                                            fontSize: '0.85rem',
                                            fontFamily: 'monospace'
                                        }}>
                                            {result.error.substring(0, 500)}
                                        </pre>
                                    </div>
                                )}
                                {result.screenshotPath && (
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.85rem' }}>
                                        <strong>Screenshot:</strong> {result.screenshotPath}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={handleNewTest}
                                style={{
                                    marginTop: '1rem',
                                    background: 'white',
                                    color: '#ef4444',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {result.status === 'blocked' && (
                        <div>
                            <h2 style={{ color: 'white', margin: '0 0 1rem 0' }}>🚫 BLOCKED</h2>
                            <div style={{ fontSize: '0.95rem', opacity: 0.95 }}>
                                <p style={{ margin: '0.5rem 0' }}><strong>Test ID:</strong> {result.testId}</p>
                                <p style={{ margin: '0.5rem 0' }}>
                                    <strong>Reason:</strong>{' '}
                                    <span style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem'
                                    }}>
                                        {result.failureType || 'BOT_DETECTED'}
                                    </span>
                                </p>
                                {result.error && (
                                    <div style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '1rem',
                                        borderRadius: '6px',
                                        marginTop: '1rem'
                                    }}>
                                        <strong>Details:</strong>
                                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                                            {result.error}
                                        </p>
                                    </div>
                                )}
                                {result.preflightDiagnostics?.hints && (
                                    <div style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '1rem',
                                        borderRadius: '6px',
                                        marginTop: '1rem'
                                    }}>
                                        <strong>💡 Hints:</strong>
                                        <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                                            {result.preflightDiagnostics.hints.map((hint: string, i: number) => (
                                                <li key={i} style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>{hint}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {result.screenshotPath && (
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.85rem' }}>
                                        <strong>Screenshot:</strong> {result.screenshotPath}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={handleNewTest}
                                style={{
                                    marginTop: '1rem',
                                    background: 'white',
                                    color: '#f59e0b',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Try Different Site
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
                <h2 style={{ margin: '0 0 1rem 0', color: 'white' }}>Execute Real Automation</h2>

                {/* Mode Toggles */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => setMode('adhoc')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            border: '2px solid white',
                            background: mode === 'adhoc' ? 'white' : 'transparent',
                            color: mode === 'adhoc' ? '#667eea' : 'white',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Ad-Hoc Scenario
                    </button>
                    <button
                        onClick={() => setMode('testrail')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            border: '2px solid white',
                            background: mode === 'testrail' ? 'white' : 'transparent',
                            color: mode === 'testrail' ? '#667eea' : 'white',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        TestRail Case
                    </button>
                </div>

                {/* URL is hardcoded in backend for now */}

                {mode === 'adhoc' ? (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                            Test Scenario (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Search for HP Laptop, Verify homepage, Login flow"
                            value={scenario}
                            onChange={e => setScenario(e.target.value)}
                            disabled={loading}
                            style={{
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: '2px solid rgba(255,255,255,0.3)',
                                background: 'rgba(255,255,255,0.95)',
                                color: '#1e293b',
                                width: '100%',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                TestRail Case ID
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., C12345"
                                value={caseId}
                                onChange={e => setCaseId(e.target.value)}
                                disabled={loading}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    background: 'rgba(255,255,255,0.95)',
                                    color: '#1e293b',
                                    width: '100%',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Run ID (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., R678"
                                value={runId}
                                onChange={e => setRunId(e.target.value)}
                                disabled={loading}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    background: 'rgba(255,255,255,0.95)',
                                    color: '#1e293b',
                                    width: '100%',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        marginBottom: '1rem',
                        color: '#fecaca'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <button
                    className="btn"
                    onClick={handleRunAutomation}
                    disabled={loading}
                    style={{
                        background: 'white',
                        color: '#667eea',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        padding: '1rem 2rem',
                        width: '100%',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? '⏳ Generating & Running Test...' : '▶️ RUN AUTOMATION'}
                </button>

                <p style={{ fontSize: '0.85rem', marginTop: '1rem', opacity: 0.9 }}>
                    💡 The system will generate a real Playwright test with assertions and execute it against your website.
                </p>
            </div>

            <div className="card">
                <h2>Recent Test Runs</h2>
                <RunsTable runs={runs} onSelect={handleViewRun} />
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
            <RunDetailsModal runDetails={selectedRunDetails} onClose={() => setSelectedRunDetails(null)} />
            );
        </div>
    );
};
