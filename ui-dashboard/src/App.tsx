
import { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { RunDetails } from './pages/RunDetails';
import { AutomationDashboard } from './pages/AutomationDashboard';

type View = 'automation' | 'legacy' | 'details';

function App() {
  const [view, setView] = useState<View>('automation');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const handleSelectRun = (caseId: string) => {
    setSelectedCaseId(caseId);
    setView('details');
  };

  const handleBack = () => {
    setView('automation');
    setSelectedCaseId(null);
  };

  // Simple router
  if (view === 'details' && selectedCaseId) {
    return <RunDetails caseId={selectedCaseId} onBack={handleBack} />;
  }

  if (view === 'legacy') {
    return (
      <div>
        <button className="btn btn-secondary" onClick={() => setView('automation')} style={{ margin: '1rem' }}>
          ← Back to Automation
        </button>
        <Dashboard onSelectRun={handleSelectRun} />
      </div>
    );
  }

  return (
    <div>
      <AutomationDashboard onSelectRun={handleSelectRun} onSwitchToLegacy={() => setView('legacy')} />
    </div>
  );
}

export default App;
