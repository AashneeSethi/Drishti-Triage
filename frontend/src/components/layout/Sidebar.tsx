import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Archive, 
  Clock, 
  Network, 
  ShieldAlert, 
  FileSearch, 
  Bot, 
  FileText,
  Fingerprint,
  FolderLock,
  Plus,
  X,
  Server,
  AlertCircle
} from 'lucide-react';
import { useCase, BENCHMARK_CASE_ID } from '../../context/CaseContext';

const NAV_ITEMS = [
  { path: '/', label: 'Case Overview', icon: LayoutDashboard },
  { path: '/evidence', label: 'Evidence Vault', icon: Archive },
  { path: '/timeline', label: 'Timeline', icon: Clock },
  { path: '/graph', label: 'Evidence Graph', icon: Network },
  { 
    path: '/verify', 
    label: 'Verify a Statement', 
    icon: ShieldAlert, 
    badge: 'CORE' 
  },
  { path: '/anomalies', label: 'Anomaly Analysis', icon: FileSearch },
  { path: '/copilot', label: 'AI Copilot', icon: Bot },
  { path: '/reports', label: 'Reports & Benchmark', icon: FileText },
];

export const Sidebar: React.FC = () => {
  const { 
    activeCaseId, 
    activeCase, 
    isLiveCase, 
    cases, 
    backendStatus, 
    selectCase, 
    createNewCase 
  } = useCase();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCaseId, setNewCaseId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTimezone, setNewTimezone] = useState('Asia/Kolkata');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseId.trim()) {
      setCreateError('Case ID is required');
      return;
    }
    setIsSubmitting(true);
    setCreateError(null);
    try {
      await createNewCase({
        case_id: newCaseId.trim(),
        title: newTitle.trim() || undefined,
        default_timezone: newTimezone.trim() || 'Asia/Kolkata'
      });
      setIsModalOpen(false);
      setNewCaseId('');
      setNewTitle('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create case');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="w-64 h-screen bg-[#080c14] border-r border-[#1e293b] flex flex-col fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#1e293b]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-950/80 border border-sky-600/40 flex items-center justify-center text-sky-400 shadow-sm">
            <Fingerprint className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wider text-slate-100 flex items-center gap-1.5 font-mono">
              DRISHTI TRIAGE
              <span className="text-[10px] px-1.5 py-0.2 bg-sky-900/50 text-sky-300 border border-sky-700/50 rounded">v1.2</span>
            </div>
            <div className="text-[11px] text-slate-400 italic">AI proposes. Evidence proves.</div>
          </div>
        </div>
      </div>

      {/* Case Selector Card */}
      <div className="p-3 mx-3 my-3 bg-[#111827] border border-[#1e293b] rounded-lg">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
          <span className="flex items-center gap-1">
            <FolderLock className="w-3 h-3 text-sky-400" /> Active Case
          </span>
          {isLiveCase ? (
            <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-semibold">
              LIVE VAULT
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 font-semibold">
              BENCHMARK
            </span>
          )}
        </div>

        {/* Custom Dropdown Selector */}
        <select
          value={activeCaseId}
          onChange={(e) => {
            if (e.target.value === '__NEW__') {
              setIsModalOpen(true);
            } else {
              selectCase(e.target.value);
            }
          }}
          className="w-full bg-[#080c14] border border-[#1e293b] rounded p-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500 mb-2 truncate"
        >
          <option value={BENCHMARK_CASE_ID}>
            ⭐ Synthetic Benchmark (CASE-2026-0915)
          </option>
          {cases.filter(c => !c.isBenchmark).map((c) => (
            <option key={c.case_id} value={c.case_id}>
              📁 {c.case_id} ({c.title || 'Untitled'})
            </option>
          ))}
          {backendStatus?.isBackendConnected && (
            <option value="__NEW__">+ Create New Live Case...</option>
          )}
        </select>

        <div className="text-xs font-semibold text-slate-200 font-mono truncate">
          {activeCase.case_id}
        </div>
        <div className="text-[11px] text-slate-400 truncate">
          {activeCase.title}
        </div>

        <div className="mt-2 pt-2 border-t border-[#1e293b]/60 flex items-center justify-between text-[10px]">
          {isLiveCase ? (
            <>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-800/40 font-mono flex items-center gap-1">
                <Server className="w-2.5 h-2.5" /> LIVE BACKEND
              </span>
              <span className="text-slate-400 font-mono">{activeCase.default_timezone}</span>
            </>
          ) : (
            <>
              <span className="px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-800/40 font-mono">
                AIR-GAPPED BENCHMARK
              </span>
              <span className="text-slate-500 font-mono">STANDALONE</span>
            </>
          )}
        </div>

        {backendStatus?.isBackendConnected && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full mt-2.5 py-1 px-2 rounded bg-[#182238] hover:bg-[#223150] text-sky-400 hover:text-sky-300 border border-sky-800/40 text-[11px] font-mono flex items-center justify-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Create New Case</span>
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 pb-1 text-[10px] font-mono tracking-wider uppercase text-slate-500">Forensic Modules</div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-950/60 text-sky-300 border border-sky-800/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]'
                }`
              }
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Modal: Create New Case on Backend */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c111d] border border-sky-600/40 rounded-xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <FolderLock className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold font-mono text-slate-100">Register Case in Live Vault</h3>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setCreateError(null);
                }}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                  Case ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CASE-2026-LIVE-01"
                  value={newCaseId}
                  onChange={(e) => setNewCaseId(e.target.value)}
                  required
                  className="w-full bg-[#111827] border border-[#1e293b] rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                  Case Title / Operation Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operation Digital Arrest Triage"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#111827] border border-[#1e293b] rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                  Default Timezone
                </label>
                <input
                  type="text"
                  value={newTimezone}
                  onChange={(e) => setNewTimezone(e.target.value)}
                  className="w-full bg-[#111827] border border-[#1e293b] rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                  e.g. Asia/Kolkata, UTC, America/New_York
                </span>
              </div>

              <div className="pt-3 border-t border-[#1e293b] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setCreateError(null);
                  }}
                  className="px-3 py-1.5 rounded bg-[#1e293b] hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50 font-mono"
                >
                  {isSubmitting ? 'Registering...' : 'Create Case on Backend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
