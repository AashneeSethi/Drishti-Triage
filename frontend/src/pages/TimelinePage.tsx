import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Search, 
  Phone, 
  CreditCard, 
  MessageSquare, 
  Terminal, 
  FileText,
  AlertCircle,
  Globe,
  Play,
  RotateCw,
  ShieldCheck
} from 'lucide-react';
import { SEEDED_EVENTS } from '../data/syntheticCase';
import type { ForensicEvent } from '../types/forensic';
import { formatUTC, formatIST } from '../utils/timezone';
import { formatCurrencyINR } from '../utils/formatters';
import { useCase } from '../context/CaseContext';
import { getBackendEvents, ingestAllBackendEvidence } from '../services/api';
import { adaptUnifiedEventToForensicEvent } from '../types/backend';
import { ClickToVerifyModal } from '../components/ui/ClickToVerifyModal';

export const TimelinePage: React.FC = () => {
  const { activeCaseId, activeCase, isLiveCase } = useCase();

  const [activeZone, setActiveZone] = useState<'UTC' | 'IST'>('UTC');
  const [filterSourceType, setFilterSourceType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightSuspectOnly, setHighlightSuspectOnly] = useState<boolean>(false);

  // Live events state
  const [liveEvents, setLiveEvents] = useState<ForensicEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Click-to-Verify modal state
  const [verifyModal, setVerifyModal] = useState<{
    isOpen: boolean;
    artifactId: string;
    rowNumber: number;
  }>({
    isOpen: false,
    artifactId: '',
    rowNumber: 1
  });

  const loadEvents = useCallback(async () => {
    if (!isLiveCase) {
      setLiveEvents(SEEDED_EVENTS);
      setFetchError(null);
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    try {
      const resp = await getBackendEvents(
        activeCaseId, 
        filterSourceType !== 'ALL' ? filterSourceType : undefined
      );
      const adapted = resp.events.map(adaptUnifiedEventToForensicEvent);
      setLiveEvents(adapted);
    } catch (err) {
      console.error('Error fetching live events:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch events from backend');
      setLiveEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeCaseId, isLiveCase, filterSourceType]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleIngestNow = async () => {
    if (!isLiveCase) return;
    setIsIngesting(true);
    try {
      await ingestAllBackendEvidence(activeCaseId);
      await loadEvents();
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Ingest failed');
    } finally {
      setIsIngesting(false);
    }
  };

  const currentEvents = isLiveCase ? liveEvents : SEEDED_EVENTS;

  const filteredEvents = currentEvents.filter((evt) => {
    if (!isLiveCase) {
      if (filterSourceType !== 'ALL') {
        const catMap: Record<string, string> = {
          call: 'TELEPHONY',
          upi: 'FINANCIAL',
          whatsapp: 'COMMUNICATION',
          evtx: 'SYSTEM_LOG'
        };
        if (evt.category !== catMap[filterSourceType] && evt.category !== filterSourceType) {
          return false;
        }
      }
    }
    if (highlightSuspectOnly && (!evt.flags || evt.flags.length === 0)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        evt.action.toLowerCase().includes(q) ||
        evt.actor.toLowerCase().includes(q) ||
        (evt.recipient && evt.recipient.toLowerCase().includes(q)) ||
        evt.sourceFile.toLowerCase().includes(q) ||
        evt.details.toLowerCase().includes(q) ||
        evt.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCategoryIcon = (cat: ForensicEvent['category']) => {
    switch (cat) {
      case 'TELEPHONY':
        return <Phone className="w-4 h-4 text-sky-400" />;
      case 'FINANCIAL':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'COMMUNICATION':
        return <MessageSquare className="w-4 h-4 text-amber-400" />;
      case 'SYSTEM_LOG':
        return <Terminal className="w-4 h-4 text-purple-400" />;
      case 'DOCUMENT':
      default:
        return <FileText className="w-4 h-4 text-blue-400" />;
    }
  };

  // Helper to extract artifact ID from file name or prefix
  const extractArtifactId = (evt: ForensicEvent): string => {
    if (evt.sha256Prefix && evt.sha256Prefix.startsWith('ART-')) {
      return evt.sha256Prefix;
    }
    const match = evt.sourceFile.match(/ART-\d+/);
    if (match) return match[0];
    return evt.sha256Prefix || 'ART-001';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              Super-Timeline Incident Reconstruction
            </h1>
            {isLiveCase ? (
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                LIVE CASE: {activeCaseId}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-950/60 text-amber-300 border border-amber-800/50">
                SYNTHETIC BENCHMARK FIXTURE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Normalized Multi-Source Chronology &bull; Universal UTC Basis &bull; Raw Timezone Provenance Preserved
          </p>
        </div>

        {/* Right Controls: Ingest Button & Timezone Toggle Pill */}
        <div className="flex items-center gap-2 flex-wrap">
          {isLiveCase && (
            <>
              <button
                onClick={handleIngestNow}
                disabled={isIngesting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50 font-mono"
              >
                <Play className={`w-3.5 h-3.5 ${isIngesting ? 'animate-spin' : ''}`} />
                <span>{isIngesting ? 'Ingesting...' : 'Ingest All Evidence'}</span>
              </button>

              <button
                onClick={loadEvents}
                title="Refresh events from backend"
                className="p-1.5 rounded bg-[#182238] hover:bg-[#202c48] border border-[#26344d] text-slate-300"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </>
          )}

          <div className="flex items-center gap-2 bg-[#111827] p-1 rounded-lg border border-[#1e293b]">
            <span className="text-[11px] font-mono text-slate-400 px-2 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-sky-400" /> Display Zone:
            </span>
            <button
              onClick={() => setActiveZone('UTC')}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                activeZone === 'UTC'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              UTC (Normalized)
            </button>
            <button
              onClick={() => setActiveZone('IST')}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                activeZone === 'IST'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              IST (+05:30)
            </button>
          </div>
        </div>
      </div>

      {/* Timezone Trap Educational Banner */}
      <div className="p-3.5 rounded-lg bg-sky-950/20 border border-sky-800/40 text-xs text-slate-300 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
        <div>
          <strong className="text-sky-300 font-mono">The Timezone Normalization Guarantee:</strong> Indian banking exports arrive in IST (+05:30), whereas network CDR and cloud telephony logs record in UTC. Naive comparisons invert the causal sequence. DRISHTI TRIAGE deterministically normalizes every event to UTC while preserving exact raw source timestamps and determined timezone basis.
        </div>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-start gap-3 font-mono">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Failed to load events:</strong> {fetchError}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111827] p-3 rounded-lg border border-[#1e293b]">
        {/* Source Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: 'ALL SOURCES', value: 'ALL' },
            { label: 'CDR CALLS', value: isLiveCase ? 'call' : 'TELEPHONY' },
            { label: 'BANK / UPI', value: isLiveCase ? 'upi' : 'FINANCIAL' },
            { label: 'WHATSAPP', value: isLiveCase ? 'whatsapp' : 'COMMUNICATION' },
            { label: 'EVTX LOGS', value: isLiveCase ? 'evtx' : 'SYSTEM_LOG' }
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilterSourceType(item.value)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                filterSourceType === item.value
                  ? 'bg-[#1e293b] text-sky-300 border border-sky-600/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#182238]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="h-4 w-px bg-[#1e293b] mx-1" />
          <button
            onClick={() => setHighlightSuspectOnly(!highlightSuspectOnly)}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 ${
              highlightSuspectOnly
                ? 'bg-red-950/60 text-red-300 border border-red-700/60 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Flagged Anomaly / Suspicious</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter event actions or actors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0c111d] border border-[#1e293b] rounded pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Empty State / Ingest CTA */}
      {filteredEvents.length === 0 && !isLoading && (
        <div className="py-16 text-center space-y-3 bg-[#111827] border border-[#1e293b] rounded-xl p-8">
          <div className="w-12 h-12 rounded-full bg-sky-950/50 border border-sky-800/40 flex items-center justify-center text-sky-400 mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold font-mono text-slate-200">
            No Events Ingested for Case {activeCase.case_id}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {isLiveCase
              ? 'Upload forensic evidence in the Evidence Vault, then trigger ingestion to normalize records into the unified timeline.'
              : 'No matching events found for the active filter.'}
          </p>
          {isLiveCase && (
            <button
              onClick={handleIngestNow}
              disabled={isIngesting}
              className="mt-2 px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-xs font-mono font-semibold text-white transition-colors"
            >
              {isIngesting ? 'Parsing Evidence...' : 'Run Auto-Ingest Engine'}
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <RotateCw className="w-6 h-6 text-sky-400 animate-spin" />
          <div className="text-xs font-mono text-slate-400">Loading timeline events from case vault...</div>
        </div>
      )}

      {/* Chronological Event Cards Stream */}
      {!isLoading && filteredEvents.length > 0 && (
        <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#1e293b]">
          {filteredEvents.map((evt) => {
            const isSuspect = evt.flags && evt.flags.length > 0;
            const displayTime = activeZone === 'UTC' ? formatUTC(evt.timestampUTC) : formatIST(evt.timestampUTC);
            const artId = extractArtifactId(evt);

            return (
              <div
                key={evt.id}
                className={`relative bg-[#111827] border rounded-lg p-4 transition-all hover:border-slate-600 ${
                  isSuspect ? 'border-red-900/50 bg-[#14121d]' : 'border-[#1e293b]'
                }`}
              >
                {/* Timeline Connector Dot */}
                <div 
                  className={`absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full border-2 bg-[#0c111d] ${
                    isSuspect ? 'border-red-500' : 'border-sky-400'
                  }`} 
                />

                {/* Event Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-[#1e293b]/60">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-[#182238]">
                      {getCategoryIcon(evt.category)}
                    </div>
                    <span className="text-xs font-bold font-mono text-slate-100">{evt.id}</span>
                    <span className="text-xs font-semibold text-slate-200 font-sans">{evt.action}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-sky-300 font-semibold">{displayTime}</span>
                    <span className="text-[11px] text-slate-400">Raw: {evt.timestampRaw}</span>
                  </div>
                </div>

                {/* Actor & Recipient Line */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-400">Actor:</span>
                    <span className="text-slate-200 font-semibold">{evt.actor}</span>
                    {evt.recipient && (
                      <>
                        <span className="text-slate-500">&rarr;</span>
                        <span className="text-slate-400">Target:</span>
                        <span className="text-slate-200">{evt.recipient}</span>
                      </>
                    )}
                  </div>
                  {evt.amount && (
                    <div className="font-mono text-sm font-bold text-red-400">
                      - {formatCurrencyINR(evt.amount)}
                    </div>
                  )}
                </div>

                {/* Event Details Narrative */}
                <p className="text-xs text-slate-300 leading-relaxed bg-[#0c111d] p-2.5 rounded border border-[#1e293b]">
                  {evt.details}
                </p>

                {/* Provenance Footer with Click-to-Verify */}
                <div className="mt-3 pt-2 border-t border-[#1e293b]/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      File: <strong className="text-slate-300">{evt.sourceFile}</strong> (Row {evt.sourceRow})
                    </span>
                    <span>&bull;</span>
                    <span className="text-slate-400">
                      Timezone: <strong className="text-sky-300">{evt.sourceTimezone}</strong>
                    </span>

                    {/* Click to Verify Source Row Button */}
                    {isLiveCase && (
                      <button
                        onClick={() => setVerifyModal({ isOpen: true, artifactId: artId, rowNumber: evt.sourceRow })}
                        className="ml-2 px-2 py-0.5 rounded bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-sky-300 text-[10px] font-mono flex items-center gap-1 transition-colors"
                      >
                        <ShieldCheck className="w-3 h-3 text-sky-400" />
                        <span>Click-to-Verify Row</span>
                      </button>
                    )}
                  </div>

                  {evt.flags && evt.flags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {evt.flags.map((flg) => (
                        <span key={flg} className="px-1.5 py-0.2 rounded text-[10px] bg-red-950/60 text-red-300 border border-red-800/40">
                          {flg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Click-to-Verify Grounding Modal */}
      <ClickToVerifyModal
        isOpen={verifyModal.isOpen}
        onClose={() => setVerifyModal({ isOpen: false, artifactId: '', rowNumber: 1 })}
        caseId={activeCaseId}
        artifactId={verifyModal.artifactId}
        rowNumber={verifyModal.rowNumber}
        contextLines={2}
      />
    </div>
  );
};
