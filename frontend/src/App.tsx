import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { OverviewPage } from './pages/OverviewPage';
import { EvidenceVaultPage } from './pages/EvidenceVaultPage';
import { TimelinePage } from './pages/TimelinePage';
import { EvidenceGraphPage } from './pages/EvidenceGraphPage';
import { VerifyStatementPage } from './pages/VerifyStatementPage';
import { AnomalyPage } from './pages/AnomalyPage';
import { CopilotPage } from './pages/CopilotPage';
import { ReportsPage } from './pages/ReportsPage';

import { CaseProvider } from './context/CaseContext';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <CaseProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<OverviewPage />} />
            <Route path="evidence" element={<EvidenceVaultPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="graph" element={<EvidenceGraphPage />} />
            <Route path="verify" element={<VerifyStatementPage />} />
            <Route path="anomalies" element={<AnomalyPage />} />
            <Route path="copilot" element={<CopilotPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </CaseProvider>
    </BrowserRouter>
  );
};

export default App;
