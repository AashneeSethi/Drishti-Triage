import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Copy, Check, AlertCircle, FileCode, Search } from 'lucide-react';
import { getClickToVerifyRow } from '../../services/api';
import type { ClickToVerifyResponse } from '../../types/backend';
import { truncateHash } from '../../utils/formatters';

interface ClickToVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  artifactId: string;
  rowNumber: number;
  contextLines?: number;
}

export const ClickToVerifyModal: React.FC<ClickToVerifyModalProps> = ({
  isOpen,
  onClose,
  caseId,
  artifactId,
  rowNumber,
  contextLines = 2
}) => {
  const [data, setData] = useState<ClickToVerifyResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !artifactId || !rowNumber) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getClickToVerifyRow(caseId, artifactId, rowNumber, contextLines)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to retrieve source row');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, caseId, artifactId, rowNumber, contextLines]);

  if (!isOpen) return null;

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0c111d] border border-sky-500/40 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between bg-[#111827]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-sky-950/80 border border-sky-600/50 text-sky-400">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-slate-100 flex items-center gap-2">
                Click-to-Verify &bull; Exact Source Row Grounding
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Case: <span className="text-sky-300 font-semibold">{caseId}</span> &bull; Artifact: <span className="text-slate-200 font-semibold">{artifactId}</span> &bull; Row: <span className="text-amber-400 font-bold">#{rowNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Search className="w-6 h-6 text-sky-400 animate-spin" />
              <div className="text-xs font-mono text-slate-300">
                Retrieving byte record from Evidence Vault ({artifactId}:Line {rowNumber})...
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-950/30 border border-red-800/50 flex items-start gap-3 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold font-mono">Source Lookup Failed</div>
                <div className="text-slate-400 mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {data && !isLoading && (
            <>
              {/* Provenance Card */}
              <div className="p-3 rounded-lg bg-[#141b2d] border border-[#1e293b] space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-sky-400" />
                    Vault Evidence File:
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {data.filename}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-1">
                  <span>Cryptographic File Hash (SHA-256):</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sky-300 font-mono text-[10px] break-all">
                      {truncateHash(data.file_sha256, 12, 12)}
                    </span>
                    <button
                      onClick={() => handleCopyHash(data.file_sha256)}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                      title="Copy full SHA-256"
                    >
                      {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Exact Target Line */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center justify-between">
                  <span>Target Row Excerpt (Row #{data.row_number}):</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                    GROUND TRUTH
                  </span>
                </div>
                <div className="p-3 rounded-md bg-[#181c27] border-2 border-amber-500/70 text-xs font-mono text-amber-200 break-all leading-relaxed shadow-sm">
                  {data.target_line}
                </div>
              </div>

              {/* Surrounding Context */}
              {data.context && data.context.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Surrounding Context (&plusmn;{contextLines} lines):
                  </div>
                  <div className="rounded-md bg-[#080c14] border border-[#1e293b] divide-y divide-[#1e293b] font-mono text-xs overflow-x-auto">
                    {data.context.map((line) => (
                      <div
                        key={line.row}
                        className={`flex items-start px-3 py-1.5 gap-3 ${
                          line.is_target ? 'bg-amber-950/30 text-amber-200 font-semibold' : 'text-slate-400 hover:bg-[#111827]'
                        }`}
                      >
                        <span className="text-[10px] text-slate-500 select-none w-8 text-right flex-shrink-0">
                          {line.row}
                        </span>
                        <span className="break-all whitespace-pre-wrap">{line.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1e293b] bg-[#111827] flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-mono">
            Section 63 BSA 2023 Byte Record Citation
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#1e293b] hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
