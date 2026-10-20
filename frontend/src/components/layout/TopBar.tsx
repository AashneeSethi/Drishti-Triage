import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, ChevronRight, HardDrive, WifiOff, CheckCircle2, RotateCw } from 'lucide-react';
import { useCase } from '../../context/CaseContext';

const ROUTE_NAMES: Record<string, string> = {
  '/': 'Case Overview',
  '/evidence': 'Evidence Vault',
  '/timeline': 'Reconstructed Timeline',
  '/graph': 'Forensic Knowledge Graph',
  '/verify': 'Verify a Statement',
  '/anomalies': 'Anomaly & Pattern Analysis',
  '/copilot': 'AI Forensic Copilot',
  '/reports': 'Reports & Evaluation Benchmark',
};

export const TopBar: React.FC = () => {
  const location = useLocation();
  const { activeCase, isLiveCase, backendStatus, refreshBackendStatus, refreshCases } = useCase();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBackendStatus();
    await refreshCases();
    setIsRefreshing(false);
  };

  const currentSection = ROUTE_NAMES[location.pathname] || 'Forensics';

  return (
    <header className="h-14 bg-[#0c111d] border-b border-[#1e293b] flex items-center justify-between px-6 sticky top-0 z-20 select-none">
      {/* Breadcrumb & Case Context */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-slate-300 font-semibold">{activeCase.case_id}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-slate-400 truncate max-w-[200px]">{activeCase.title}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-sky-400 font-medium">{currentSection}</span>
      </div>

      {/* Center Search / Quick Jump */}
      <div className="w-96 relative hidden md:block">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Jump to record, phone (+91...), or transaction UTR..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#111827] border border-[#1e293b] rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-mono"
        />
      </div>

      {/* Right Controls: Honest State Indicator */}
      <div className="flex items-center gap-3">
        {backendStatus ? (
          backendStatus.isBackendConnected ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-[11px] font-mono text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {isLiveCase ? `LIVE BACKEND (${activeCase.case_id})` : 'LIVE BACKEND CONNECTED'}
                </span>
              </div>
              <button
                onClick={handleRefresh}
                title="Refresh backend status and cases"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/40 border border-amber-800/40 text-[11px] font-mono text-amber-300">
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>BACKEND DISCONNECTED (OFFLINE BENCHMARK)</span>
              </div>
              <button
                onClick={handleRefresh}
                title="Retry connecting to backend"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )
        ) : (
          <div className="text-[11px] text-slate-500 font-mono">Checking environment...</div>
        )}

        <div className="h-4 w-px bg-[#1e293b]" />

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          <span>{isLiveCase ? 'SERVER VAULT' : 'LOCAL REPO WORKSPACE'}</span>
        </div>
      </div>
    </header>
  );
};
