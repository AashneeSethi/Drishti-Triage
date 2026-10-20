import React, { useState } from 'react';
import { 
  FileSearch, 
  AlertTriangle, 
  Filter, 
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SEEDED_ANOMALIES } from '../data/syntheticCase';
import { SeverityBadge } from '../components/ui/Badge';
import { formatUTC } from '../utils/timezone';

export const AnomalyPage: React.FC = () => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(SEEDED_ANOMALIES[0].id);

  const filtered = SEEDED_ANOMALIES.filter((item) => {
    if (filterSeverity !== 'ALL' && item.severity !== filterSeverity) return false;
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-sky-400" />
            Anomaly & Behavioral Pattern Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic forensic rules engine &bull; Flags temporal traps, impersonation VPAs, and surveillance processes
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2 bg-[#111827] p-1 rounded-lg border border-[#1e293b]">
          <span className="text-[11px] font-mono text-slate-400 px-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-sky-400" /> Severity:
          </span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                filterSeverity === sev
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-[#111827] border border-[#1e293b]">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Critical Anomalies</div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">1</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Timezone Inversion Trap</div>
        </div>
        <div className="p-3 rounded-lg bg-[#111827] border border-[#1e293b]">
          <div className="text-[10px] font-mono text-slate-400 uppercase">High Severity</div>
          <div className="text-xl font-bold font-mono text-orange-400 mt-1">2</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Impersonation & Surveillance</div>
        </div>
        <div className="p-3 rounded-lg bg-[#111827] border border-[#1e293b]">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Medium Severity</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">2</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Fake Receipt & Velocity</div>
        </div>
        <div className="p-3 rounded-lg bg-[#111827] border border-[#1e293b]">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Audit Warnings</div>
          <div className="text-xl font-bold font-mono text-slate-300 mt-1">1</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Privilege Query (lsass.exe)</div>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className={`bg-[#111827] border rounded-lg overflow-hidden transition-colors ${
                item.severity === 'CRITICAL' ? 'border-red-900/60' : 'border-[#1e293b]'
              }`}
            >
              {/* Collapsed Header */}
              <div
                onClick={() => toggleExpand(item.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#182238]/50 transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-[#182238] border border-[#26344d]">
                    <AlertTriangle className={`w-4 h-4 ${
                      item.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-100">{item.id}</span>
                      <span className="text-xs font-bold text-slate-200">{item.ruleName}</span>
                      <SeverityBadge severity={item.severity} />
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Detected: {formatUTC(item.detectedTimeUTC)} &bull; {item.detectedTimeIST}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                    {item.supportingRecords.length} linked records
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Detailed Body */}
              {isExpanded && (
                <div className="p-4 pt-0 border-t border-[#1e293b] space-y-3.5 bg-[#0d131f]">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Forensic Analysis:</div>
                    <p className="text-xs text-slate-200 leading-relaxed bg-[#111827] p-3 rounded border border-[#1e293b]">
                      {item.explanation}
                    </p>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Recommended Investigator Action:</div>
                    <div className="text-xs text-sky-300 bg-sky-950/20 p-2.5 rounded border border-sky-800/40">
                      {item.investigatorGuidance}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Supporting Records:</span>
                      {item.supportingRecords.map((rec) => (
                        <span key={rec} className="px-2 py-0.5 rounded bg-[#182238] text-slate-300 border border-[#243048]">
                          {rec}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Linked Events:</span>
                      {item.supportingEventIds.map((eid) => (
                        <span key={eid} className="text-sky-400 font-semibold">
                          {eid}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
