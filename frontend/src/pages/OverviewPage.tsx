import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Archive, 
  Clock, 
  ShieldAlert, 
  AlertTriangle, 
  ArrowUpRight, 
  IndianRupee, 
  Activity, 
  FileCheck2,
  FileCode,
  AlertOctagon,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { 
  SEEDED_ARTIFACTS, 
  SEEDED_EVENTS, 
  SEEDED_ANOMALIES, 
  PRESET_VERIFICATIONS, 
  CASE_METADATA,
  TIMEZONE_INVERSION_EVALUATION
} from '../data/syntheticCase';
import { SeverityBadge } from '../components/ui/Badge';
import { formatCurrencyINR } from '../utils/formatters';
import { formatUTC, formatIST } from '../utils/timezone';
import { useCase } from '../context/CaseContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export const OverviewPage: React.FC = () => {
  const { activeCase, isLiveCase } = useCase();

  // Derive counts directly from seeded source truth
  const artifactCount = SEEDED_ARTIFACTS.length;
  const eventCount = SEEDED_EVENTS.length;
  const financialEvents = SEEDED_EVENTS.filter(e => e.category === 'FINANCIAL' && e.amount);

  const claimCounts = {
    VERIFIED: PRESET_VERIFICATIONS.filter(c => c.status === 'VERIFIED').length,
    INFERRED: PRESET_VERIFICATIONS.filter(c => c.status === 'INFERRED').length,
    CONTRADICTED: PRESET_VERIFICATIONS.filter(c => c.status === 'CONTRADICTED').length,
    NOT_FOUND: PRESET_VERIFICATIONS.filter(c => c.status === 'NOT_FOUND').length,
  };

  // Chart data: Transaction amounts by transaction
  const transactionChartData = financialEvents.map(e => ({
    name: e.sourceRow === 2 ? 'TXN 1 (Swiggy)' : e.sourceRow === 3 ? 'TXN 2 (Mule Transfer)' : 'TXN 3 (Groceries)',
    amount: e.amount || 0,
    time: formatIST(e.timestampUTC).split(' ')[1] || '',
    isSuspect: e.flags?.includes('EXTORTION_DEBIT')
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Case Identification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
              {isLiveCase ? activeCase.case_id : CASE_METADATA.caseId}: {isLiveCase ? activeCase.title : CASE_METADATA.operationName}
            </h1>
            {isLiveCase ? (
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                LIVE BACKEND CASE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-950/60 text-amber-300 border border-amber-800/50">
                SYNTHETIC BENCHMARK FIXTURE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isLiveCase ? (
              <>
                Timezone Basis: <span className="text-sky-300 font-mono font-semibold">{activeCase.default_timezone}</span> &bull; Status: <span className="text-emerald-400 font-mono font-semibold">LIVE VAULT CONNECTED</span>
              </>
            ) : (
              <>
                Victim: <span className="text-slate-200">{CASE_METADATA.victimName}</span> &bull; Lead: <span className="text-slate-200">{CASE_METADATA.investigatorLead}</span> &bull; Status: <span className="text-emerald-400 font-mono font-semibold">ACTIVE RECONSTRUCTION</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/verify"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Verify a Statement</span>
          </Link>
          <Link
            to="/timeline"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#182238] hover:bg-[#202c48] border border-[#26344d] text-xs font-medium text-slate-200 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Open Timeline</span>
          </Link>
        </div>
      </div>

      {/* 2.A: PROMINENT PRIMARY FORENSIC FINDING CARD (TIMEZONE INVERSION) */}
      <div className="bg-[#16121f] border-2 border-red-500/50 rounded-xl p-5 shadow-lg shadow-red-950/20 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-red-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950/80 border border-red-700/60 text-red-400 flex-shrink-0">
              <AlertOctagon className="w-5 h-5 text-red-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400">
                  Primary Forensic Finding
                </span>
                <span className="px-2 py-0.2 rounded text-[11px] font-mono bg-red-950/80 text-red-300 border border-red-800/60 font-semibold">
                  CONTRADICTION DETECTED
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Demonstrated on Synthetic Benchmark Data
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-100 font-mono mt-0.5">
                Timezone Inversion: Call (14:05:00 UTC) vs Bank Transaction (14:08:15 IST)
              </h2>
            </div>
          </div>
          <div className="text-xs font-mono text-red-300 bg-red-950/50 px-3 py-1.5 rounded-md border border-red-800/50 self-start lg:self-auto">
            Calculated: <strong className="text-red-200 font-bold">{TIMEZONE_INVERSION_EVALUATION.formattedDelta} the call ({TIMEZONE_INVERSION_EVALUATION.deltaSeconds}s)</strong>
          </div>
        </div>

        {/* 4 Column Comparative Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
          <div className="p-3 rounded-lg bg-[#0c111d] border border-[#243048]">
            <div className="text-[11px] font-mono text-slate-400 uppercase">1. Original Call Timestamp</div>
            <div className="text-sm font-bold font-mono text-sky-400 mt-1">14:05:00 UTC</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Report Header Basis (calls_cdr.csv)</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0c111d] border border-[#243048]">
            <div className="text-[11px] font-mono text-slate-400 uppercase">2. Original Bank Timestamp</div>
            <div className="text-sm font-bold font-mono text-amber-400 mt-1">14:08:15 IST</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Indian Core Ledger Basis (Precise Record)</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0c111d] border border-[#243048]">
            <div className="text-[11px] font-mono text-slate-400 uppercase">3. Normalized Bank Timestamp</div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-1">08:38:15 UTC</div>
            <div className="text-[11px] text-slate-400 mt-0.5">IST converted to UTC (minus 5h 30m)</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0c111d] border border-red-900/60 bg-red-950/20">
            <div className="text-[11px] font-mono text-red-300 uppercase">4. True Universal Delta</div>
            <div className="text-sm font-bold font-mono text-red-400 mt-1">
              -5h 26m 45s (-19,605s)
            </div>
            <div className="text-[11px] text-red-300/80 mt-0.5 font-mono">Payment occurred PRIOR to call</div>
          </div>
        </div>

        {/* Forensic Explanation */}
        <div className="p-3 rounded-lg bg-[#080c14] border border-[#1e293b] text-xs text-slate-300 leading-relaxed font-sans mb-4">
          <strong className="text-red-400 font-mono">Why the original allegation is contradicted: </strong>
          A naive model or complainant examining raw strings assumes 14:05 and 14:08 represent a debit executed 3 minutes <em>after</em> the call. However, deterministic UTC normalization reveals that the Indian bank statement was exported in IST (+05:30) while the telephony carrier logged in UTC. Recomputed in universal coordinates, the transaction took place <strong>5 hours, 26 minutes, and 45 seconds BEFORE the call</strong> (-19,605 seconds), directly contradicting the allegation that it occurred three minutes afterward. Note: The evidence establishes that the payment occurred before the call in normalized UTC time; this temporal ordering contradicts the alleged sequence, but digital timestamp precedence alone does not prove the call had no causal connection whatsoever.
        </div>

        {/* 2.D: Clickable Evidence-to-Finding Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-red-900/30 text-xs">
          <span className="text-[11px] text-slate-400 font-mono">
            Supporting Records: <span className="text-slate-200">calls_cdr.csv:L3 (CALL-190)</span> &bull; <span className="text-slate-200">bank_upi_statement.csv:L3 (UPI-236)</span>
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/verify"
              className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Inspect in Verifier</span>
            </Link>
            <Link
              to="/timeline"
              className="px-3 py-1.5 rounded bg-[#182238] hover:bg-[#202c48] border border-[#243048] text-slate-200 font-mono text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>View Timeline Events</span>
            </Link>
            <Link
              to="/evidence"
              className="px-3 py-1.5 rounded bg-[#182238] hover:bg-[#202c48] border border-[#243048] text-slate-200 font-mono text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>Inspect Raw Evidence Files</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2.B: Secondary Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Evidence Artifacts */}
        <div className="bg-[#111827] border border-[#1e293b] p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
            <span>SEALED ARTIFACTS</span>
            <Archive className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{artifactCount}</div>
          <div className="text-xs text-slate-400 mt-1">
            CDR, Bank UPI, WhatsApp, EVTX, PDF
          </div>
        </div>

        {/* Parsed Forensic Events */}
        <div className="bg-[#111827] border border-[#1e293b] p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
            <span>PARSED EVENTS</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{eventCount}</div>
          <div className="text-xs text-slate-400 mt-1">
            Normalized to UTC with raw IST offsets
          </div>
        </div>

        {/* Disputed Outflow */}
        <div className="bg-[#111827] border border-[#1e293b] p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
            <span>DISPUTED TRANSACTION</span>
            <IndianRupee className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">
            {formatCurrencyINR(CASE_METADATA.disputedOutflowINR)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            1 transfer to fake CBI masquerade VPA
          </div>
        </div>

        {/* Total Ledger Debits */}
        <div className="bg-[#111827] border border-[#1e293b] p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
            <span>TOTAL LEDGER AMOUNT</span>
            <IndianRupee className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-200">
            {formatCurrencyINR(CASE_METADATA.totalLedgerDebitsINR)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Sum of all 3 statement debit rows
          </div>
        </div>
      </div>

      {/* 2.B: Four Claim Status Breakdown Strip */}
      <div className="bg-[#111827] border border-[#1e293b] p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3 text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
          <span className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-sky-400" />
            Verification Outcomes Breakdown ({PRESET_VERIFICATIONS.length} Evaluated Claims)
          </span>
          <span className="text-xs text-slate-400 font-sans font-normal lowercase">Deterministic verifier</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* VERIFIED */}
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
              </span>
              <span className="text-lg font-bold font-mono text-emerald-300">{claimCounts.VERIFIED}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1.5 leading-snug">
              Direct byte-level proof confirms 100% of typed claim components.
            </div>
          </div>

          {/* INFERRED */}
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> INFERRED — REQUIRES HUMAN REVIEW
              </span>
              <span className="text-lg font-bold font-mono text-amber-300">{claimCounts.INFERRED}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1.5 leading-snug">
              Plausible relationship or sequence; causal overreach stripped.
            </div>
          </div>

          {/* CONTRADICTED */}
          <div className="p-3 rounded-lg bg-red-950/25 border border-red-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-red-400 font-bold flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5" /> CONTRADICTED
              </span>
              <span className="text-lg font-bold font-mono text-red-300">{claimCounts.CONTRADICTED}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1.5 leading-snug">
              Active conflict with evidence: Timezone Trap & amount discrepancy.
            </div>
          </div>

          {/* NOT FOUND */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300 font-bold flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> NOT FOUND IN AVAILABLE EVIDENCE
              </span>
              <span className="text-lg font-bold font-mono text-slate-200">{claimCounts.NOT_FOUND}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1.5 leading-snug">
              Absence claim: no record exists. Never construed as proof of absence.
            </div>
          </div>
        </div>
      </div>

      {/* 2.C: Financial Reconciliation & Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outflow Chart & Transaction Breakdown */}
        <div className="bg-[#111827] border border-[#1e293b] p-5 rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-bold">
                Bank Statement Outflow Distribution (₹25,770.50 Total)
              </h3>
              <span className="text-xs text-slate-400 font-mono">bank_upi_statement.csv</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Direct visual comparison of routine baseline spending against the disputed extortion transfer.
            </p>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transactionChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(val) => `₹${val}`} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px' }} 
                    formatter={(value: any) => [formatCurrencyINR(Number(value) || 0), 'Debit Amount']} 
                  />
                  <Bar 
                    dataKey="amount" 
                    radius={[4, 4, 0, 0]}
                    fill="#38bdf8"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2.C: Clear Financial Ledger Reconciliation Explanation */}
          <div className="pt-3 border-t border-[#1e293b] text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-slate-200 font-mono text-xs">Financial Audit Reconciliation:</div>
            <p className="text-slate-400 leading-relaxed text-xs">
              {CASE_METADATA.financialExplanation}
            </p>
            <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-slate-400">
              <span>Disputed Debit: <strong className="text-red-400">₹25,000.00</strong></span>
              <span>Baseline Routine Spend: <strong className="text-emerald-400">₹770.50</strong></span>
              <span>Ledger Total: <strong className="text-slate-200">₹25,770.50</strong></span>
            </div>
          </div>
        </div>

        {/* Compact Anomaly Queue */}
        <div className="bg-[#111827] border border-[#1e293b] p-5 rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-bold">
                  Flagged Forensic Anomalies ({SEEDED_ANOMALIES.length})
                </h3>
              </div>
              <Link to="/anomalies" className="text-xs text-sky-400 hover:underline flex items-center gap-0.5">
                <span>View all ({SEEDED_ANOMALIES.length})</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2.5 mt-3">
              {SEEDED_ANOMALIES.slice(0, 3).map((anom) => (
                <div key={anom.id} className="p-3 rounded bg-[#182238] border border-[#243048]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-200 truncate">{anom.ruleName}</span>
                    <SeverityBadge severity={anom.severity} />
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {anom.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-[#1e293b] text-xs text-slate-400 flex items-center justify-between">
            <span className="text-amber-400 font-mono text-xs">Deterministic Rule Engine Active</span>
            <span className="text-slate-500 font-mono text-xs">6 Rules Evaluated</span>
          </div>
        </div>
      </div>

      {/* Chronological Recent Events Table */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-bold">
              Chronological Incident Events (Normalized UTC)
            </h2>
          </div>
          <Link to="/timeline" className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono">
            <span>Full Timeline ({eventCount} events)</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0f172a] text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-[#1e293b]">
              <tr>
                <th className="py-2.5 px-4">Event ID</th>
                <th className="py-2.5 px-4">UTC Timestamp</th>
                <th className="py-2.5 px-4">Raw Source Time</th>
                <th className="py-2.5 px-4">Artifact</th>
                <th className="py-2.5 px-4">Actor & Action</th>
                <th className="py-2.5 px-4">Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b] font-mono text-xs">
              {SEEDED_EVENTS.slice(3, 9).map((evt) => (
                <tr key={evt.id} className="hover:bg-[#182238]/60 transition-colors">
                  <td className="py-2.5 px-4 text-sky-400 font-semibold">{evt.id}</td>
                  <td className="py-2.5 px-4 text-slate-200">{formatUTC(evt.timestampUTC)}</td>
                  <td className="py-2.5 px-4 text-slate-400">{evt.timestampRaw}</td>
                  <td className="py-2.5 px-4 text-slate-300">{evt.sourceFile}</td>
                  <td className="py-2.5 px-4 font-sans text-xs text-slate-200">
                    <span className="font-semibold text-slate-100">{evt.actor}</span>: {evt.action}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">
                    Row {evt.sourceRow} &bull; SHA:{evt.sha256Prefix}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
