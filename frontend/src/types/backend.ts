import type { EvidenceArtifact, ForensicEvent } from './forensic';

export interface BackendCase {
  case_id: string;
  title: string;
  default_timezone: string;
  created_at_utc: string;
}

export interface CreateCaseRequest {
  case_id: string;
  title?: string;
  default_timezone?: string;
}

export interface BackendArtifact {
  artifact_id: string;
  case_id: string;
  filename: string;
  stored_filename: string;
  file_sha256: string;
  file_size_bytes: number;
  timestamp_ingested_utc: string;
  custody_record_id: string;
  original_path: string;
  analysis_path: string;
}

export interface UploadEvidenceResponse {
  status: 'success' | 'error';
  message: string;
  artifact: BackendArtifact;
}

export interface CustodyRecord {
  record_id: string;
  case_id: string;
  artifact_id: string;
  filename: string;
  file_sha256: string;
  file_size_bytes: number;
  timestamp_ingested_utc: string;
  prev_record_hash: string;
  record_hash: string;
}

export interface CustodyLedgerResponse {
  case_id: string;
  is_chain_intact: boolean;
  total_records: number;
  issues: string[];
  records: CustodyRecord[];
}

export interface FileIntegrityIssue {
  artifact_id: string;
  filename: string;
  error: string;
  expected_sha256?: string;
  actual_sha256?: string;
  path?: string;
}

export interface IntegrityAuditResponse {
  case_id: string;
  overall_intact: boolean;
  chain_valid: boolean;
  files_intact: boolean;
  chain_issues: string[];
  file_issues: FileIntegrityIssue[];
}

export interface IngestResultItem {
  artifact_id: string;
  filename: string;
  status: 'success' | 'error';
  events_count?: number;
  parser?: string;
  error?: string;
}

export interface IngestSummaryResponse {
  case_id: string;
  total_events: number;
  results: IngestResultItem[];
}

export interface EventLocator {
  file: string;
  row: number;
}

export interface UnifiedEvent {
  event_id: string;
  case_id: string;
  artifact_id: string;
  source_type: 'call' | 'upi' | 'whatsapp' | 'evtx' | 'media' | 'generic';
  timestamp_utc: string;
  timestamp_original: string;
  timezone_original: string;
  timezone_basis: string;
  actor: string;
  target: string;
  action: string;
  amount?: number | null;
  currency?: string | null;
  status: string;
  locator: EventLocator;
  raw_details?: Record<string, unknown>;
}

export interface ContextLine {
  row: number;
  content: string;
  is_target: boolean;
}

export interface ClickToVerifyResponse {
  case_id: string;
  artifact_id: string;
  filename: string;
  row_number: number;
  target_line: string;
  context: ContextLine[];
  file_sha256: string;
}

export interface TamperDemoResponse {
  status: 'tampered';
  message: string;
  post_tamper_audit: IntegrityAuditResponse;
}

/**
 * Adapter: Transforms backend BackendArtifact to frontend EvidenceArtifact format.
 */
export function adaptBackendArtifactToEvidenceArtifact(art: BackendArtifact): EvidenceArtifact {
  const ext = art.filename.split('.').pop()?.toLowerCase();
  let type: EvidenceArtifact['type'] = 'DOCUMENT_PDF';
  if (ext === 'csv') {
    type = art.filename.toLowerCase().includes('call') ? 'CDR' : 'BANK_UPI';
  } else if (ext === 'txt') {
    type = 'WHATSAPP';
  } else if (ext === 'json' || ext === 'evtx') {
    type = 'SYSTEM_EVTX';
  }

  return {
    id: art.artifact_id,
    filename: art.filename,
    type,
    fileSizeBytes: art.file_size_bytes,
    sha256Hash: art.file_sha256,
    ingestedAt: art.timestamp_ingested_utc,
    status: 'SEALED',
    recordCount: 1, // Will be enriched once ingested
    sourceDevice: 'Evidence Vault Server Storage',
    custodian: 'DRISHTI Vault (Hash-Chained)',
    rawSample: `Stored in vault originals: ${art.stored_filename}`
  };
}

/**
 * Adapter: Transforms backend UnifiedEvent to frontend ForensicEvent format.
 */
export function adaptUnifiedEventToForensicEvent(evt: UnifiedEvent): ForensicEvent {
  let cat: ForensicEvent['category'] = 'DOCUMENT';
  let sType: ForensicEvent['sourceType'] = 'DOCUMENT_PDF';

  switch (evt.source_type) {
    case 'call':
      cat = 'TELEPHONY';
      sType = 'CDR';
      break;
    case 'upi':
      cat = 'FINANCIAL';
      sType = 'BANK_UPI';
      break;
    case 'whatsapp':
      cat = 'COMMUNICATION';
      sType = 'WHATSAPP';
      break;
    case 'evtx':
      cat = 'SYSTEM_LOG';
      sType = 'SYSTEM_EVTX';
      break;
    default:
      cat = 'DOCUMENT';
      sType = 'DOCUMENT_PDF';
      break;
  }

  const flags: string[] = [];
  if (evt.status && evt.status !== 'SUCCESS') {
    flags.push(`STATUS_${evt.status}`);
  }
  if (evt.amount && evt.amount >= 25000) {
    flags.push('HIGH_VALUE_TRANSACTION');
  }

  return {
    id: evt.event_id,
    timestampUTC: evt.timestamp_utc,
    timestampRaw: `${evt.timestamp_original} (${evt.timezone_original})`,
    sourceTimezone: `${evt.timezone_original} [Basis: ${evt.timezone_basis}]`,
    sourceType: sType,
    sourceFile: evt.locator.file,
    sourceRow: evt.locator.row,
    sha256Prefix: evt.artifact_id,
    actor: evt.actor,
    recipient: evt.target,
    action: evt.action,
    amount: evt.amount ?? undefined,
    currency: evt.currency ?? 'INR',
    details: `${evt.action}: ${evt.actor} -> ${evt.target}${evt.amount ? ` (₹${evt.amount.toLocaleString('en-IN')})` : ''} | Status: ${evt.status} | Artifact: ${evt.artifact_id}`,
    category: cat,
    flags
  };
}
