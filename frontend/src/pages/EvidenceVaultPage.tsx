import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Archive, 
  UploadCloud, 
  FileText, 
  Copy, 
  Check, 
  Lock, 
  Info, 
  Eye, 
  X, 
  FileCode, 
  ShieldCheck, 
  ShieldAlert, 
  Play, 
  Link2, 
  Bug, 
  CheckCircle2, 
  AlertTriangle,
  RotateCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SEEDED_ARTIFACTS } from '../data/syntheticCase';
import type { EvidenceArtifact } from '../types/forensic';
import { formatBytes, truncateHash } from '../utils/formatters';
import { useCase } from '../context/CaseContext';
import { 
  listBackendArtifacts, 
  uploadBackendEvidence, 
  getBackendCustodyLedger, 
  verifyBackendCaseIntegrity, 
  tamperBackendDemo, 
  ingestAllBackendEvidence 
} from '../services/api';
import { adaptBackendArtifactToEvidenceArtifact } from '../types/backend';
import type { CustodyLedgerResponse, IntegrityAuditResponse, IngestSummaryResponse } from '../types/backend';
import { ClickToVerifyModal } from '../components/ui/ClickToVerifyModal';

export const EvidenceVaultPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeCaseId, isLiveCase } = useCase();

  // State
  const [artifacts, setArtifacts] = useState<EvidenceArtifact[]>(SEEDED_ARTIFACTS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedArtifact, setSelectedArtifact] = useState<EvidenceArtifact | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  
  // Hashing and upload state
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [clientHashPreview, setClientHashPreview] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custody and Audit state
  const [custodyData, setCustodyData] = useState<CustodyLedgerResponse | null>(null);
  const [showCustodyDrawer, setShowCustodyDrawer] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<IntegrityAuditResponse | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  // Ingestion state
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [ingestSummary, setIngestSummary] = useState<IngestSummaryResponse | null>(null);

  // Click-to-Verify Modal state
  const [verifyModalState, setVerifyModalState] = useState<{
    isOpen: boolean;
    artifactId: string;
    rowNumber: number;
  }>({
    isOpen: false,
    artifactId: '',
    rowNumber: 1
  });

  // Load artifacts & custody
  const loadCaseData = useCallback(async () => {
    if (!isLiveCase) {
      setArtifacts(SEEDED_ARTIFACTS);
      setCustodyData(null);
      setAuditResult(null);
      return;
    }

    setIsLoading(true);
    try {
      const [backendArts, ledger] = await Promise.all([
        listBackendArtifacts(activeCaseId),
        getBackendCustodyLedger(activeCaseId).catch(() => null)
      ]);
      setArtifacts(backendArts.map(adaptBackendArtifactToEvidenceArtifact));
      if (ledger) setCustodyData(ledger);
    } catch (err) {
      console.error('Error fetching live artifacts:', err);
      setUploadNotice({
        message: err instanceof Error ? err.message : 'Failed to load case artifacts from backend',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeCaseId, isLiveCase]);

  useEffect(() => {
    loadCaseData();
  }, [loadCaseData]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Upload handler with client-side preview hashing + server validation
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsHashing(true);
    setClientHashPreview(null);
    setUploadNotice({
      message: `Computing client-side SHA-256 preview digest for ${file.name}...`,
      type: 'info'
    });

    try {
      // 1. Real client-side cryptographic hashing via Web Crypto API
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const clientHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setClientHashPreview(clientHash);
      setIsHashing(false);

      if (isLiveCase) {
        // 2. Real upload to backend API
        setIsUploading(true);
        setUploadNotice({
          message: `Uploading to backend vault (${activeCaseId})...`,
          type: 'info'
        });

        const resp = await uploadBackendEvidence(activeCaseId, file);
        const serverArtifact = resp.artifact;
        const adapted = adaptBackendArtifactToEvidenceArtifact(serverArtifact);

        // Update local list
        setArtifacts(prev => [adapted, ...prev.filter(a => a.id !== adapted.id)]);
        setSelectedArtifact(adapted);

        // Verification of match
        const hashesMatch = clientHash.toLowerCase() === serverArtifact.file_sha256.toLowerCase();
        setUploadNotice({
          message: `Server Sealed: ${serverArtifact.artifact_id} (${serverArtifact.filename}). ${
            hashesMatch ? 'Client & Server SHA-256 digests match 100%!' : 'Warning: Digest divergence detected.'
          }`,
          type: hashesMatch ? 'success' : 'error'
        });

        // Refresh custody ledger
        const ledger = await getBackendCustodyLedger(activeCaseId).catch(() => null);
        if (ledger) setCustodyData(ledger);
      } else {
        // Benchmark mode: local client sealing
        const textSample = await file.slice(0, 400).text();
        const newArtifact: EvidenceArtifact = {
          id: `EVD-00${artifacts.length + 1}`,
          filename: file.name,
          type: file.name.endsWith('.csv') ? 'BANK_UPI' : file.name.endsWith('.txt') ? 'WHATSAPP' : 'SYSTEM_EVTX',
          fileSizeBytes: file.size,
          sha256Hash: clientHash,
          ingestedAt: new Date().toISOString(),
          status: 'VALIDATED',
          recordCount: Math.max(1, Math.floor(file.size / 90)),
          sourceDevice: 'Investigator Local Field Workstation',
          custodian: 'Aashnee Sethi (Digital Forensic Specialist)',
          rawSample: textSample || 'Binary file stream stored in evidence staging vault.'
        };

        setArtifacts(prev => [newArtifact, ...prev]);
        setSelectedArtifact(newArtifact);
        setUploadNotice({
          message: `Client Sealed ${file.name} (SHA-256: ${clientHash.slice(0, 12)}...)`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error(err);
      setUploadNotice({
        message: err instanceof Error ? err.message : 'File upload or hashing failed.',
        type: 'error'
      });
    } finally {
      setIsHashing(false);
      setIsUploading(false);
      setTimeout(() => setUploadNotice(null), 8000);
    }
  };

  // Run Integrity Audit
  const handleRunIntegrityAudit = async () => {
    if (!isLiveCase) return;
    setIsAuditing(true);
    try {
      const result = await verifyBackendCaseIntegrity(activeCaseId);
      setAuditResult(result);
    } catch (err) {
      setUploadNotice({
        message: err instanceof Error ? err.message : 'Integrity audit failed',
        type: 'error'
      });
    } finally {
      setIsAuditing(false);
    }
  };

  // Ingest All Evidence
  const handleIngestAll = async () => {
    if (!isLiveCase) return;
    setIsIngesting(true);
    try {
      const summary = await ingestAllBackendEvidence(activeCaseId);
      setIngestSummary(summary);
      setUploadNotice({
        message: `Successfully ingested all evidence: ${summary.total_events} unified events parsed!`,
        type: 'success'
      });
      // Refresh artifacts to update record counts if needed
      await loadCaseData();
    } catch (err) {
      setUploadNotice({
        message: err instanceof Error ? err.message : 'Ingestion failed',
        type: 'error'
      });
    } finally {
      setIsIngesting(false);
    }
  };

  // Tamper Demo
  const handleTamperDemo = async (artId: string) => {
    if (!isLiveCase) return;
    const confirmTamper = window.confirm(
      `Forensic Tamper Simulation: Flip 1 byte in ${artId} in the vault originals? This will intentionally invalidate its cryptographic SHA-256 seal for demonstration.`
    );
    if (!confirmTamper) return;

    try {
      const res = await tamperBackendDemo(activeCaseId, artId);
      setAuditResult(res.post_tamper_audit);
      setUploadNotice({
        message: `TAMPER SIMULATION EXECUTED: Flipped 1 byte in ${artId}. Vault integrity status is now INVALID.`,
        type: 'error'
      });
      await loadCaseData();
    } catch (err) {
      setUploadNotice({
        message: err instanceof Error ? err.message : 'Tamper simulation failed',
        type: 'error'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
              <Archive className="w-5 h-5 text-sky-400" />
              Evidence Vault & Tamper-Evident Registry
            </h1>
            {isLiveCase ? (
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                LIVE BACKEND: {activeCaseId}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-950/60 text-amber-300 border border-amber-800/50">
                SYNTHETIC BENCHMARK FIXTURE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Section 63 BSA 2023 Compliant Ingestion &bull; SHA-256 Cryptographic Hash Verification &bull; Hash-Chained Custody
          </p>
        </div>

        {/* Action Controls for Live Case */}
        <div className="flex items-center gap-2 flex-wrap">
          {isLiveCase && (
            <>
              <button
                onClick={handleIngestAll}
                disabled={isIngesting || artifacts.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50 font-mono"
              >
                <Play className={`w-3.5 h-3.5 ${isIngesting ? 'animate-spin' : ''}`} />
                <span>{isIngesting ? 'Ingesting...' : 'Ingest All Evidence'}</span>
              </button>

              <button
                onClick={handleRunIntegrityAudit}
                disabled={isAuditing || artifacts.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#182238] hover:bg-[#202c48] border border-[#26344d] text-xs font-medium text-slate-200 transition-colors disabled:opacity-50 font-mono"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAuditing ? 'Auditing...' : 'Audit Integrity'}</span>
              </button>

              <button
                onClick={() => setShowCustodyDrawer(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#182238] hover:bg-[#202c48] border border-[#26344d] text-xs font-medium text-slate-200 transition-colors font-mono"
              >
                <Link2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Custody Ledger</span>
              </button>

              <button
                onClick={loadCaseData}
                title="Refresh case data"
                className="p-1.5 rounded bg-[#182238] hover:bg-[#202c48] border border-[#26344d] text-slate-300"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </>
          )}

          <div className="text-right">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-sky-950/40 text-sky-300 border border-sky-800/40">
              {artifacts.length} SEALED FILES
            </span>
          </div>
        </div>
      </div>

      {/* Audit Banner (If Audit was run or tamper detected) */}
      {auditResult && (
        <div
          className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
            auditResult.overall_intact
              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
              : 'bg-red-950/40 border-red-800/70 text-red-300'
          }`}
        >
          <div className="flex items-start gap-3">
            {auditResult.overall_intact ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold font-mono text-sm">
                {auditResult.overall_intact
                  ? 'CRITICAL INTEGRITY AUDIT: 100% INTACT & VERIFIED'
                  : 'INTEGRITY VIOLATION DETECTED: BIT-LEVEL EVIDENCE TAMPERING'}
              </div>
              <div className="text-[11px] text-slate-300 mt-1 space-x-3 font-mono">
                <span>Chain Valid: <strong>{auditResult.chain_valid ? 'YES' : 'NO'}</strong></span>
                <span>&bull;</span>
                <span>Original Files Intact: <strong>{auditResult.files_intact ? 'YES' : 'NO'}</strong></span>
                {auditResult.file_issues.length > 0 && (
                  <>
                    <span>&bull;</span>
                    <span className="text-red-400 font-bold">
                      Corrupted Files ({auditResult.file_issues.length}): {auditResult.file_issues.map(f => `${f.artifact_id} (${f.error})`).join(', ')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setAuditResult(null)}
            className="px-2.5 py-1 rounded bg-black/40 hover:bg-black/60 text-slate-300 text-xs font-mono self-start md:self-auto"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Ingest Summary Notification Banner */}
      {ingestSummary && (
        <div className="p-4 rounded-lg bg-sky-950/30 border border-sky-800/60 text-xs text-sky-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="font-bold font-mono flex items-center gap-1.5 text-sky-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Ingestion Succeeded: {ingestSummary.total_events} Unified Events Generated
            </div>
            <div className="text-[11px] text-slate-300 font-mono flex flex-wrap gap-2">
              {ingestSummary.results.map((r) => (
                <span key={r.artifact_id} className="px-2 py-0.5 bg-[#0c111d] rounded border border-[#1e293b]">
                  {r.artifact_id} ({r.filename}): {r.status === 'success' ? `${r.events_count} events (${r.parser})` : `Failed (${r.error})`}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate('/timeline')}
            className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs font-mono whitespace-nowrap self-start md:self-auto"
          >
            Open in Timeline &rarr;
          </button>
        </div>
      )}

      {/* Mode Information Banner */}
      <div className="p-3 rounded-lg bg-[#111827] border border-[#1e293b] flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
        <div>
          {isLiveCase ? (
            <div>
              <strong className="text-emerald-300">Connected to Live Backend Vault ({activeCaseId}):</strong> Files uploaded here are dispatched directly to <code className="text-sky-300">POST /api/cases/{activeCaseId}/evidence/upload</code>, hashed server-side, assigned an sequential <code className="text-sky-300">ART-XXX</code> identifier, recorded in the custody ledger, and stored in read-only originals.
            </div>
          ) : (
            <div>
              <strong className="text-amber-300">Synthetic Benchmark Fixture:</strong> Currently viewing the official hackathon benchmark case (<code className="text-sky-300">CASE-2026-0915</code>). In this mode, evidence records and hashes represent the standardized reference docket. Switch to a live case in the sidebar to interact with the backend server.
            </div>
          )}
        </div>
      </div>

      {/* Upload Drop Zone */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        className="border-2 border-dashed border-[#243048] hover:border-sky-500/60 bg-[#0d131f] p-8 rounded-lg text-center cursor-pointer transition-colors group"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => handleFileUpload(e.target.files)} 
        />
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-sky-950/50 border border-sky-800/40 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-200">
            Click or drag & drop forensic dumps to seal in {isLiveCase ? `Vault (${activeCaseId})` : 'Staging Vault'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Supports CDR Call Logs (.csv), Bank UPI Exports (.csv), WhatsApp Chats (.txt), Windows EVTX (.json), and Documents (.pdf)
          </p>
          
          {/* Progress / Digest Feedback */}
          {isHashing && (
            <div className="mt-3 text-xs text-sky-400 font-mono animate-pulse">
              Computing client-side SHA-256 byte digest...
            </div>
          )}
          {isUploading && (
            <div className="mt-3 text-xs text-amber-400 font-mono animate-pulse">
              Sending multipart stream to backend vault and generating custody record...
            </div>
          )}
          {clientHashPreview && !isHashing && (
            <div className="mt-2 text-[11px] text-slate-400 font-mono">
              Client Preview SHA-256: <span className="text-sky-300">{clientHashPreview}</span>
            </div>
          )}
          {uploadNotice && (
            <div
              className={`mt-3 text-xs font-mono px-3 py-1.5 rounded border max-w-xl mx-auto ${
                uploadNotice.type === 'success'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                  : uploadNotice.type === 'error'
                  ? 'bg-red-950/40 text-red-300 border-red-800/40'
                  : 'bg-sky-950/40 text-sky-300 border-sky-800/40'
              }`}
            >
              {uploadNotice.message}
            </div>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
            Evidence Artifact Inventory ({artifacts.length})
          </span>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            {isLiveCase && custodyData && (
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Custody Chain Intact ({custodyData.total_records} records)
              </span>
            )}
            <span className="text-slate-500">Immutable Hash Chain</span>
          </div>
        </div>

        {artifacts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono space-y-2">
            <div>No artifacts sealed in case vault <span className="text-sky-400 font-bold">{activeCaseId}</span> yet.</div>
            <div className="text-slate-500 text-[11px]">Upload evidence files using the dropzone above to begin triage.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0f172a] text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-[#1e293b]">
                <tr>
                  <th className="py-3 px-4">Artifact ID</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">SHA-256 Hash</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b] font-mono text-[11px]">
                {artifacts.map((art) => {
                  const isTampered = auditResult?.file_issues.some(f => f.artifact_id === art.id);
                  return (
                    <tr key={art.id} className="hover:bg-[#182238]/60 transition-colors">
                      <td className="py-3 px-4 text-sky-400 font-semibold">{art.id}</td>
                      <td className="py-3 px-4 text-slate-200 font-sans font-medium flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>{art.filename}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          {art.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{formatBytes(art.fileSizeBytes)}</td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-300">{truncateHash(art.sha256Hash, 8, 8)}</span>
                          <button
                            onClick={() => handleCopyHash(art.sha256Hash)}
                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
                            title="Copy complete SHA-256 hash"
                          >
                            {copiedHash === art.sha256Hash ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isTampered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-red-950/60 text-red-400 border border-red-800/60 font-bold">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            TAMPER DETECTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                            <Lock className="w-2.5 h-2.5" />
                            {art.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLiveCase && (
                            <>
                              <button
                                onClick={() => setVerifyModalState({ isOpen: true, artifactId: art.id, rowNumber: 1 })}
                                className="px-2 py-1 rounded bg-[#1e293b] hover:bg-sky-950 hover:text-sky-300 border border-[#2e3b52] text-slate-300 text-[10px] transition-colors font-sans"
                                title="Click-to-Verify source row"
                              >
                                Row #1
                              </button>
                              <button
                                onClick={() => handleTamperDemo(art.id)}
                                className="px-2 py-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-[10px] transition-colors font-sans flex items-center gap-1"
                                title="Tamper Simulation: Flip 1 byte for live demo"
                              >
                                <Bug className="w-2.5 h-2.5 text-red-400" />
                                <span>Tamper</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedArtifact(art)}
                            className="px-2.5 py-1 rounded bg-[#1e293b] hover:bg-sky-950 hover:text-sky-300 border border-[#2e3b52] text-slate-300 text-xs transition-colors inline-flex items-center gap-1 font-sans"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custody Ledger Slide-Over Drawer */}
      {showCustodyDrawer && custodyData && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
          <div className="w-full max-w-2xl bg-[#0f172a] border-l border-[#1e293b] h-full overflow-y-auto p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-sky-400" />
                  <div>
                    <h2 className="text-sm font-bold font-mono text-slate-100">
                      Cryptographic Custody Ledger
                    </h2>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Case: {custodyData.case_id} &bull; {custodyData.total_records} Chain Records
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustodyDrawer(false)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Header */}
              <div className="p-3 rounded-lg bg-[#111827] border border-[#1e293b] flex items-center justify-between text-xs">
                <span className="font-mono text-slate-300">Hash-Chain Status:</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                    custodyData.is_chain_intact
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-red-950 text-red-400 border border-red-800/60'
                  }`}
                >
                  {custodyData.is_chain_intact ? 'IMMUTABLE CHAIN INTACT' : 'CHAIN COMPROMISED'}
                </span>
              </div>

              {/* Chain Records Timeline */}
              <div className="space-y-3 font-mono text-xs">
                {custodyData.records.map((rec, idx) => (
                  <div key={rec.record_id} className="p-3 rounded-lg bg-[#0c111d] border border-[#1e293b] space-y-2">
                    <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5 text-[11px]">
                      <span className="text-sky-400 font-bold">
                        #{idx + 1} &bull; {rec.record_id} &bull; {rec.artifact_id}
                      </span>
                      <span className="text-slate-400">{rec.timestamp_ingested_utc}</span>
                    </div>
                    <div className="text-slate-200 text-xs font-sans font-semibold">
                      {rec.filename} ({formatBytes(rec.file_size_bytes)})
                    </div>
                    <div className="space-y-1 text-[10px] text-slate-400 pt-1">
                      <div>
                        File SHA-256: <span className="text-slate-300 break-all">{rec.file_sha256}</span>
                      </div>
                      <div>
                        Prev Hash: <span className="text-slate-500 break-all">{rec.prev_record_hash}</span>
                      </div>
                      <div>
                        Record Hash: <span className="text-emerald-400 break-all">{rec.record_hash}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#1e293b] flex justify-end">
              <button
                onClick={() => setShowCustodyDrawer(false)}
                className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs font-mono"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Artifact Detail Slide-Over Drawer */}
      {selectedArtifact && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
          <div className="w-full max-w-xl bg-[#0f172a] border-l border-[#1e293b] h-full overflow-y-auto p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h2 className="text-sm font-bold font-mono text-slate-100">{selectedArtifact.filename}</h2>
                    <span className="text-[11px] text-slate-400 font-mono">{selectedArtifact.id} &bull; {selectedArtifact.type}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedArtifact(null)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Hash Verification Card */}
              <div className="my-4 p-3 rounded-lg bg-[#182238] border border-[#243048]">
                <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Cryptographic Digest (SHA-256)</div>
                <div className="font-mono text-xs text-sky-300 break-all bg-[#0c111d] p-2 rounded border border-[#1e293b]">
                  {selectedArtifact.sha256Hash}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>File Size: <strong className="text-slate-200 font-mono">{formatBytes(selectedArtifact.fileSizeBytes)}</strong></span>
                  <span>Ingested: <strong className="text-slate-200 font-mono">{new Date(selectedArtifact.ingestedAt).toLocaleString('en-IN')}</strong></span>
                </div>
              </div>

              {/* Actions: Click-to-Verify & Tamper Demo */}
              {isLiveCase && (
                <div className="my-4 p-3 rounded-lg bg-[#0c111d] border border-[#1e293b] space-y-2">
                  <span className="text-[11px] font-mono uppercase text-slate-300 font-bold block">
                    Interactive Forensic Actions
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setVerifyModalState({ isOpen: true, artifactId: selectedArtifact.id, rowNumber: 1 })}
                      className="px-3 py-1.5 rounded bg-sky-600/80 hover:bg-sky-500 text-white text-xs font-mono font-medium flex items-center gap-1.5"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Click-to-Verify Row #1</span>
                    </button>
                    <button
                      onClick={() => handleTamperDemo(selectedArtifact.id)}
                      className="px-3 py-1.5 rounded bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs font-mono font-medium flex items-center gap-1.5"
                    >
                      <Bug className="w-3.5 h-3.5 text-red-400" />
                      <span>Simulate 1-Bit Tamper Demo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Chain of Custody Info */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400">Source Device / Origin:</span>
                  <div className="text-slate-200 font-mono mt-0.5">{selectedArtifact.sourceDevice}</div>
                </div>
                <div>
                  <span className="text-slate-400">Chain of Custody Officer:</span>
                  <div className="text-slate-200 mt-0.5">{selectedArtifact.custodian}</div>
                </div>
                <div>
                  <span className="text-slate-400">Record Parsing Status:</span>
                  <div className="text-emerald-400 font-mono mt-0.5">
                    {selectedArtifact.recordCount} records mapped to forensic super-timeline
                  </div>
                </div>
              </div>

              {/* Raw Excerpt / Byte Preview */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-sky-400" />
                    Raw Binary / Text Offset Sample
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">First 400 bytes</span>
                </div>
                <pre className="p-3 bg-[#080c14] border border-[#1e293b] rounded-md font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-60">
                  {selectedArtifact.rawSample}
                </pre>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-400">
              <span>BSA 2023 §63 Technical Certificate Ready</span>
              <button
                onClick={() => setSelectedArtifact(null)}
                className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click to Verify Modal */}
      <ClickToVerifyModal
        isOpen={verifyModalState.isOpen}
        onClose={() => setVerifyModalState({ isOpen: false, artifactId: '', rowNumber: 1 })}
        caseId={activeCaseId}
        artifactId={verifyModalState.artifactId}
        rowNumber={verifyModalState.rowNumber}
        contextLines={2}
      />
    </div>
  );
};
