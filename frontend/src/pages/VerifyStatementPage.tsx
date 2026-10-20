import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Send, 
  Sparkles, 
  FileCode, 
  Scale, 
  CheckCircle2, 
  Clock,
  AlertOctagon,
  HelpCircle,
  Cpu
} from 'lucide-react';
import { PRESET_VERIFICATIONS } from '../data/syntheticCase';
import type { ClaimVerificationResult } from '../types/forensic';
import { verifyStatement } from '../services/api';
import { ForensicStatusBadge } from '../components/ui/Badge';

export const VerifyStatementPage: React.FC = () => {
  const [statement, setStatement] = useState<string>(PRESET_VERIFICATIONS[0].inputStatement);
  const [result, setResult] = useState<ClaimVerificationResult | null>(PRESET_VERIFICATIONS[0]);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const handleRunVerification = async (stmtToRun?: string) => {
    const text = stmtToRun || statement;
    if (!text.trim()) return;
    setIsVerifying(true);
    try {
      const res = await verifyStatement(text);
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSelectPreset = (preset: ClaimVerificationResult) => {
    setStatement(preset.inputStatement);
    handleRunVerification(preset.inputStatement);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Verify a Statement
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-950/80 text-sky-300 border border-sky-700/50">
              SIGNATURE INNOVATION
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            The Contradiction Challenge &bull; Deterministic verification against sealed ground-truth byte records
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono px-3 py-1 rounded bg-[#111827] text-slate-300 border border-[#1e293b]">
            &ldquo;AI proposes. Evidence proves.&rdquo;
          </span>
        </div>
      </div>

      {/* Philosophy Banner */}
      <div className="p-4 rounded-lg bg-[#111827] border border-[#1e293b] text-xs text-slate-300 space-y-1.5">
        <div className="font-semibold text-slate-100 flex items-center gap-2 font-mono">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>The Deterministic Forensic Verifier Architecture</span>
          <span className="text-[11px] font-mono px-2 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
            DEMO MODE &bull; AIR-GAPPED EVALUATOR
          </span>
        </div>
        <p className="text-slate-400 leading-relaxed text-xs">
          In digital forensics, raw LLM narratives are legally inadmissible due to hallucination risks, timezone conflations, and confusing temporal proximity with psychological causation. DRISHTI TRIAGE introduces a deterministic verifier that compares any factual statement directly against sealed raw records before allowing it into official police reports.
        </p>
      </div>

      {/* Preset Test Statements */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
            Select a Benchmark Test Claim ({PRESET_VERIFICATIONS.length} Fixtures):
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Includes Master Spec §14 (UPI-236) + Financial Contradiction
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRESET_VERIFICATIONS.map((preset) => {
            const isCurrent = statement === preset.inputStatement;
            return (
              <button
                key={preset.claimId}
                onClick={() => handleSelectPreset(preset)}
                className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-[#182238] border-sky-500/80 shadow-md'
                    : 'bg-[#111827] border-[#1e293b] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-sky-400 font-semibold">{preset.claimId} &bull; {preset.claimType}</span>
                  <ForensicStatusBadge status={preset.status} size="sm" />
                </div>
                <div className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
                  &ldquo;{preset.inputStatement}&rdquo;
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Statement Input Box */}
      <div className="bg-[#111827] border border-[#1e293b] p-4 rounded-lg space-y-3">
        <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center justify-between">
          <span className="font-bold">Enter Any Factual Claim or Hypothesis to Verify:</span>
          <span className="text-xs text-slate-400 font-sans">English or Hindi input supported</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRunVerification();
            }}
            placeholder="e.g. The Rs 30,000 payment (UPI-236) was made 3 minutes after the call (CALL-190)."
            className="flex-1 bg-[#0c111d] border border-[#1e293b] focus:border-sky-500 rounded-md px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none transition-colors"
          />
          <button
            onClick={() => handleRunVerification()}
            disabled={isVerifying || !statement.trim()}
            className="px-5 py-2.5 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-mono text-xs font-semibold flex items-center gap-2 transition-colors flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isVerifying ? 'Verifying...' : 'Run Verification'}</span>
          </button>
        </div>
      </div>

      {/* Verification Result Breakdown Card */}
      {result && (
        <div className={`border-2 rounded-xl p-5 space-y-5 animate-in fade-in transition-all ${
          result.status === 'CONTRADICTED'
            ? 'bg-[#181116] border-red-800/80 shadow-lg shadow-red-950/20'
            : result.status === 'VERIFIED'
            ? 'bg-[#0e1919] border-emerald-800/80 shadow-lg shadow-emerald-950/20'
            : result.status === 'INFERRED'
            ? 'bg-[#1a1711] border-amber-800/80'
            : 'bg-[#111827] border-slate-700/80'
        }`}>
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e293b]/80">
            <div className="flex items-center gap-3">
              <ForensicStatusBadge status={result.status} size="lg" />
              <div>
                <span className="text-xs font-mono font-bold text-slate-100">Claim ID: {result.claimId}</span>
                <span className="text-xs text-slate-400 font-mono ml-2">&bull; Type: {result.claimType}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0c111d] border border-[#1e293b] text-xs font-mono text-slate-400">
                <Cpu className="w-3 h-3 text-sky-400" />
                <span>DEMO ENGINE VERIFIER</span>
              </span>
              {result.timeDeltaFormatted && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-950/80 border border-red-700/60 text-xs font-mono text-red-300 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Temporal Delta: {result.timeDeltaFormatted}</span>
                </div>
              )}
            </div>
          </div>

          {/* Statement Evaluated Box */}
          <div className="p-3 rounded-lg bg-[#0c111d] border border-[#1e293b]">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Evaluated Input Statement:</span>
            <div className="text-xs font-mono text-slate-200 mt-1">&ldquo;{result.inputStatement}&rdquo;</div>
          </div>

          {/* Side-by-Side Comparison: Claimed vs Ground Truth */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Claimed */}
            <div className="p-3.5 rounded-lg bg-[#0c111d] border border-[#1e293b]">
              <div className="text-[11px] font-mono uppercase text-slate-400 mb-1.5 flex items-center justify-between">
                <span>AI Proposed / Asserted Finding</span>
                <span className="text-amber-400 font-semibold">UNVERIFIED INPUT</span>
              </div>
              <div className="text-xs font-mono text-slate-200 leading-relaxed">
                {result.claimedValue}
              </div>
            </div>

            {/* Ground Truth */}
            <div className="p-3.5 rounded-lg bg-[#0c111d] border border-[#1e293b]">
              <div className="text-[11px] font-mono uppercase text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Sealed Ground-Truth Evidence</span>
                <span className="text-emerald-400 font-mono font-semibold">DETERMINISTIC BYTE RECORD</span>
              </div>
              <div className="text-xs font-mono text-slate-200 leading-relaxed">
                {result.groundTruthValue}
              </div>
            </div>
          </div>

          {/* Reasoning Connecting Records to Verdict */}
          {result.reasoning && (
            <div className="p-3.5 rounded-lg bg-[#080c14] border border-[#1e293b] space-y-1">
              <div className="text-[11px] font-mono uppercase text-sky-400 tracking-wider font-bold">
                Reasoning Connecting Records to Verdict:
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {result.reasoning}
              </p>
            </div>
          )}

          {/* Discrepancy Analysis Box */}
          <div className="p-3.5 rounded-lg bg-[#080c14] border border-[#1e293b] space-y-1">
            <div className="text-[11px] font-mono uppercase text-red-400 tracking-wider font-bold">
              Forensic Discrepancy Analysis:
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {result.discrepancyAnalysis}
            </p>
          </div>

          {/* Distinct Independent Discrepancy Findings (if multiple findings exist) */}
          {result.discrepancies && result.discrepancies.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-200 font-bold flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                  Independent Discrepancy Findings ({result.discrepancies.length}):
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Separate findings &bull; Temporal contradiction is not caused by amount mismatch
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.discrepancies.map((disc, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-[#0c111d] border border-red-900/50 space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
                      <span className="text-xs font-mono font-bold text-red-300">
                        {disc.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950/70 text-red-300 border border-red-800/50">
                        {disc.category}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-[#111827] p-2.5 rounded border border-[#1e293b]">
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase">Claimed</div>
                        <div className="text-amber-400 font-semibold mt-0.5">{disc.claimedValue}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase">Recorded</div>
                        <div className="text-slate-200 font-semibold mt-0.5">{disc.recordedValue}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase">Discrepancy</div>
                        <div className="text-red-400 font-bold mt-0.5">{disc.discrepancyValue || 'Mismatch'}</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans pt-1">
                      {disc.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence-Grounded Reformulation */}
          <div className="p-4 rounded-lg bg-[#0f172a] border border-[#1e293b] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-semibold uppercase">
                <CheckCircle2 className="w-4 h-4" />
                <span>EVIDENCE-GROUNDED REFORMULATION:</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono italic">
                Neutral record summary &bull; Not a court-approved statement, legal opinion, or guarantee of admissibility
              </span>
            </div>
            <blockquote className="text-xs text-slate-200 italic pl-3 border-l-2 border-emerald-500 leading-relaxed font-sans">
              &ldquo;{result.correctedStatement}&rdquo;
            </blockquote>
            <p className="text-[11px] text-slate-400 pt-1.5 border-t border-[#1e293b]/60 leading-normal font-sans">
              Disclaimer: This is a neutral factual summary of the available electronic records, not a court-approved statement, legal opinion, or guarantee of admissibility.
            </p>
          </div>

          {/* Supporting Records vs Contradicting Records */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supporting Records */}
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                <span>Supporting Raw Records ({result.supportingRecords.length}):</span>
              </div>
              {result.supportingRecords.length === 0 ? (
                <div className="p-3 rounded bg-[#0c111d] border border-[#1e293b] text-xs text-slate-500 font-mono">
                  No supporting records found in active docket.
                </div>
              ) : (
                <div className="space-y-2">
                  {result.supportingRecords.map((rec) => (
                    <div key={rec.recordId} className="p-2.5 rounded bg-[#0c111d] border border-[#1e293b] text-xs font-mono">
                      <div className="flex items-center justify-between text-sky-400 font-bold mb-1">
                        <span>{rec.recordId}</span>
                        <span className="text-slate-400 text-[11px]">{rec.file}:Line {rec.line}</span>
                      </div>
                      <div className="text-slate-300 bg-[#111827] p-1.5 rounded text-[11px] truncate border border-[#1e293b]">
                        {rec.rawExcerpt}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contradicting Records */}
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1.5 font-semibold">
                <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                <span>Contradicting Records ({result.contradictingRecords?.length || 0}):</span>
              </div>
              {!result.contradictingRecords || result.contradictingRecords.length === 0 ? (
                <div className="p-3 rounded bg-[#0c111d] border border-[#1e293b] text-xs text-slate-500 font-mono">
                  No active contradictory records identified.
                </div>
              ) : (
                <div className="space-y-2">
                  {result.contradictingRecords.map((rec) => (
                    <div key={rec.recordId} className="p-2.5 rounded bg-red-950/20 border border-red-900/40 text-xs font-mono">
                      <div className="flex items-center justify-between text-red-400 font-bold mb-1">
                        <span>{rec.recordId}</span>
                        <span className="text-slate-400 text-[11px]">{rec.file}:Line {rec.line}</span>
                      </div>
                      <div className="text-slate-200 bg-[#111827] p-1.5 rounded text-[11px] border border-red-900/40">
                        {rec.rawExcerpt}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Missing Evidence Needed */}
          {result.missingEvidenceNeeded && (
            <div className="p-3 rounded-lg bg-[#0c111d] border border-[#1e293b] flex items-start gap-2 text-xs">
              <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-300 font-mono font-semibold">Evidence Needed to Resolve Uncertainty: </span>
                <span className="text-slate-400">{result.missingEvidenceNeeded}</span>
              </div>
            </div>
          )}

          {/* Legal Admissibility Note */}
          <div className="pt-3 border-t border-[#1e293b]/80 flex items-start gap-2 text-xs text-slate-400">
            <Scale className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 font-mono">Section 63 BSA 2023 Admissibility Assessment: </strong>
              <span>{result.legalAdmissibilityNote}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
