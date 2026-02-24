import React from 'react';

interface RunDetails {
    testId: string;
    url: string;
    scenario: string;
    status: string;
    passed: boolean;
    durationMs: number;
    timestamp: string;
    error?: string;
    logs?: string;
}

interface RunDetailsModalProps {
    runDetails: RunDetails | null;
    onClose: () => void;
}

export const RunDetailsModal: React.FC<RunDetailsModalProps> = ({ runDetails, onClose }) => {
    if (!runDetails) return null;

    const formatScenario = (scenario: string) => {
        // Clean up Gherkin for display
        return scenario
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.trim())
            .join('\n');
    };

    const extractErrorMessage = (error?: string) => {
        if (!error) return 'Unknown error';
        // Extract clean error message
        const match = error.match(/Error: (.+)/);
        return match ? match[1] : error;
    };

    const getStackTrace = () => {
        if (!runDetails.logs) return null;
        try {
            const logsObj = JSON.parse(runDetails.logs);
            const testResult = logsObj?.suites?.[0]?.specs?.[0]?.tests?.[0]?.results?.[0];
            return testResult?.error?.stack || null;
        } catch {
            return null;
        }
    };

    // NEW: Parse Gherkin steps from scenario
    const parseSteps = () => {
        const lines = runDetails.scenario.split('\n');
        const steps: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            // Match Gherkin keywords
            if (trimmed.match(/^(Given|When|Then|And)\s+/)) {
                steps.push(trimmed);
            }
        }

        return steps;
    };

    // NEW: Determine which step failed (if any)
    const getFailureStepIndex = () => {
        if (runDetails.passed) return -1; // All steps passed

        const steps = parseSteps();
        const error = runDetails.error || '';

        // Try to match step text in error message
        for (let i = 0; i < steps.length; i++) {
            const stepKeywords = steps[i].toLowerCase().split(' ').slice(1, 4).join(' ');
            if (error.toLowerCase().includes(stepKeywords)) {
                return i;
            }
        }

        // If we can't determine exact step, assume it failed at the last step
        return steps.length - 1;
    };

    const [showStack, setShowStack] = React.useState(false);
    const stackTrace = getStackTrace();
    const steps = parseSteps();
    const failureStepIndex = getFailureStepIndex();

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    maxWidth: '800px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '2rem',
                    position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        padding: '0.5rem',
                        lineHeight: 1
                    }}
                >
                    ✕
                </button>

                {/* Header */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{
                        margin: '0 0 0.5rem 0',
                        color: runDetails.passed ? '#10b981' : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        {runDetails.passed ? '✅ Test Passed' : '❌ Test Failed'}
                    </h2>
                    <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap'
                    }}>
                        <span>Test ID: <code>{runDetails.testId}</code></span>
                        <span>Duration: {Math.round(runDetails.durationMs)}ms</span>
                        <span>{new Date(runDetails.timestamp).toLocaleString()}</span>
                    </div>
                </div>

                {/* Error Section (for failed tests) */}
                {!runDetails.passed && runDetails.error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        <h3 style={{
                            margin: '0 0 0.75rem 0',
                            fontSize: '1rem',
                            color: '#ef4444'
                        }}>
                            Error Details
                        </h3>
                        <p style={{
                            margin: 0,
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            color: 'var(--text-primary)'
                        }}>
                            {extractErrorMessage(runDetails.error)}
                        </p>

                        {/* Stack Trace Toggle */}
                        {stackTrace && (
                            <div style={{ marginTop: '1rem' }}>
                                <button
                                    onClick={() => setShowStack(!showStack)}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        border: '1px solid rgba(239, 68, 68, 0.4)',
                                        color: 'var(--text-primary)',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    {showStack ? '▼ Hide Stack Trace' : '▶ Show Stack Trace'}
                                </button>
                                {showStack && (
                                    <pre style={{
                                        marginTop: '0.75rem',
                                        padding: '1rem',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        overflow: 'auto',
                                        maxHeight: '200px'
                                    }}>
                                        {stackTrace}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Success Message (for passed tests) */}
                {runDetails.passed && (
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        <p style={{
                            margin: 0,
                            color: '#10b981',
                            fontSize: '0.95rem'
                        }}>
                            All test steps completed successfully. The automation verified the expected behavior.
                        </p>
                    </div>
                )}

                {/* NEW: Test Steps Section */}
                {steps.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{
                            margin: '0 0 0.75rem 0',
                            fontSize: '1rem',
                            color: 'var(--text-primary)'
                        }}>
                            Test Steps
                        </h3>
                        <div style={{
                            background: 'var(--bg-primary)',
                            borderRadius: '8px',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                        }}>
                            {steps.map((step, index) => {
                                // Determine if this step passed or failed
                                const isPassed = runDetails.passed || index < failureStepIndex;
                                const isFailed = !runDetails.passed && index >= failureStepIndex;

                                return (
                                    <div
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.75rem',
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            background: isFailed
                                                ? 'rgba(239, 68, 68, 0.05)'
                                                : isPassed
                                                    ? 'rgba(16, 185, 129, 0.05)'
                                                    : 'transparent'
                                        }}
                                    >
                                        {/* Step Icon */}
                                        <span style={{
                                            fontSize: '1.2rem',
                                            flexShrink: 0,
                                            marginTop: '2px'
                                        }}>
                                            {isPassed && '✓'}
                                            {isFailed && '✗'}
                                        </span>

                                        {/* Step Text */}
                                        <span style={{
                                            fontSize: '0.875rem',
                                            lineHeight: 1.6,
                                            color: isFailed
                                                ? '#ef4444'
                                                : isPassed
                                                    ? '#10b981'
                                                    : 'var(--text-primary)',
                                            flex: 1
                                        }}>
                                            {step}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* URL */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{
                        margin: '0 0 0.5rem 0',
                        fontSize: '1rem',
                        color: 'var(--text-primary)'
                    }}>
                        Target URL
                    </h3>
                    <a
                        href={runDetails.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            color: 'var(--accent-blue)',
                            textDecoration: 'none',
                            fontSize: '0.875rem'
                        }}
                    >
                        {runDetails.url}
                    </a>
                </div>

                {/* Scenario */}
                <div>
                    <h3 style={{
                        margin: '0 0 0.5rem 0',
                        fontSize: '1rem',
                        color: 'var(--text-primary)'
                    }}>
                        Test Scenario
                    </h3>
                    <pre style={{
                        background: 'var(--bg-primary)',
                        padding: '1rem',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        overflow: 'auto',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word'
                    }}>
                        {formatScenario(runDetails.scenario)}
                    </pre>
                </div>

                {/* Close Button at Bottom */}
                <button
                    onClick={onClose}
                    style={{
                        marginTop: '1.5rem',
                        background: 'var(--accent-blue)',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 2rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 600,
                        width: '100%'
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
};
