import type { 
  EvidenceArtifact, 
  ForensicEvent, 
  AnomalyItem, 
  ClaimVerificationResult, 
  BenchmarkMetrics 
} from '../types/forensic';
import { 
  SEEDED_ARTIFACTS, 
  SEEDED_EVENTS, 
  SEEDED_ANOMALIES, 
  BENCHMARK_STATS 
} from '../data/syntheticCase';
import { runDeterministicVerification } from './verificationEngine';
import { executeCopilotQuery } from './copilotEngine';
import type {
  BackendCase,
  CreateCaseRequest,
  BackendArtifact,
  UploadEvidenceResponse,
  CustodyLedgerResponse,
  IntegrityAuditResponse,
  IngestSummaryResponse,
  UnifiedEvent,
  ClickToVerifyResponse,
  TamperDemoResponse
} from '../types/backend';
import { 
  adaptBackendArtifactToEvidenceArtifact, 
  adaptUnifiedEventToForensicEvent 
} from '../types/backend';

export function getApiBaseUrl(): string {
  const envUrl = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL;
  const raw = envUrl || 'http://localhost:8000';
  return raw.replace(/\/+$/, '');
}

export interface ServiceStatus {
  isBackendConnected: boolean;
  mode: 'LIVE_BACKEND' | 'BACKEND_DISCONNECTED' | 'DEMO_STANDALONE_AIRGAPPED';
  apiUrl: string;
  errorMessage?: string;
}

let lastStatus: ServiceStatus | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 2500;

export async function checkBackendConnection(forceRefresh = false): Promise<ServiceStatus> {
  const now = Date.now();
  if (!forceRefresh && lastStatus && now - lastCheckTime < CACHE_TTL_MS) {
    return lastStatus;
  }

  const base = getApiBaseUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    // Probe official GET /api/cases endpoint
    const res = await fetch(`${base}/api/cases`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      lastStatus = {
        isBackendConnected: true,
        mode: 'LIVE_BACKEND',
        apiUrl: base
      };
    } else {
      lastStatus = {
        isBackendConnected: false,
        mode: 'BACKEND_DISCONNECTED',
        apiUrl: base,
        errorMessage: `HTTP ${res.status}: ${res.statusText}`
      };
    }
  } catch (err) {
    lastStatus = {
      isBackendConnected: false,
      mode: 'BACKEND_DISCONNECTED',
      apiUrl: base,
      errorMessage: err instanceof Error ? err.message : 'Connection refused / network timeout'
    };
  }

  lastCheckTime = now;
  return lastStatus;
}

// ==========================================
// 1. CASE MANAGEMENT (GET / POST /api/cases)
// ==========================================

export async function listBackendCases(): Promise<BackendCase[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/cases`);
  if (!res.ok) {
    throw new Error(`Failed to list cases (HTTP ${res.status}: ${res.statusText})`);
  }
  const data = (await res.json()) as { cases: BackendCase[] };
  return data.cases || [];
}

export async function createBackendCase(req: CreateCaseRequest): Promise<BackendCase> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const detail = (errData as { detail?: string }).detail || res.statusText;
    throw new Error(`Failed to create case: ${detail} (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { status: string; case: BackendCase };
  return data.case;
}

export async function getBackendCase(caseId: string): Promise<BackendCase> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/cases/${encodeURIComponent(caseId)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch case ${caseId} (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { case: BackendCase };
  return data.case;
}

// ========================================================
// 2. EVIDENCE VAULT & CUSTODY LEDGER
// ========================================================

export async function uploadBackendEvidence(caseId: string, file: File): Promise<UploadEvidenceResponse> {
  const base = getApiBaseUrl();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${base}/api/cases/${encodeURIComponent(caseId)}/evidence/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const detail = (errData as { detail?: string }).detail || res.statusText;
    throw new Error(`Evidence upload failed: ${detail} (HTTP ${res.status})`);
  }

  return (await res.json()) as UploadEvidenceResponse;
}

export async function listBackendArtifacts(caseId: string): Promise<BackendArtifact[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/cases/${encodeURIComponent(caseId)}/evidence`);
  if (!res.ok) {
    throw new Error(`Failed to list artifacts for case ${caseId} (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { artifacts: BackendArtifact[] };
  return data.artifacts || [];
}

export async function getBackendCustodyLedger(caseId: string): Promise<CustodyLedgerResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/cases/${encodeURIComponent(caseId)}/custody`);
  if (!res.ok) {
    throw new Error(`Failed to read custody ledger for case ${caseId} (HTTP ${res.status})`);
  }
  return (await res.json()) as CustodyLedgerResponse;
}

export async function verifyBackendCaseIntegrity(caseId: string): Promise<IntegrityAuditResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/cases/${encodeURIComponent(caseId)}/verify-integrity`, {
    method: 'POST'
  });
  if (!res.ok) {
    throw new Error(`Integrity verification failed for case ${caseId} (HTTP ${res.status})`);
  }
  return (await res.json()) as IntegrityAuditResponse;
}

export async function tamperBackendDemo(caseId: string, artifactId: string): Promise<TamperDemoResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/api/cases/${encodeURIComponent(caseId)}/tamper-demo/${encodeURIComponent(artifactId)}`,
    { method: 'POST' }
  );
  if (!res.ok) {
    throw new Error(`Tamper demo simulation failed for ${artifactId} (HTTP ${res.status})`);
  }
  return (await res.json()) as TamperDemoResponse;
}

// ==========================================
// 3. PARSING & UNIFIED EVENTS INGESTION
// ==========================================

export async function ingestAllBackendEvidence(caseId: string): Promise<IngestSummaryResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/cases/${encodeURIComponent(caseId)}/ingest-all`, {
    method: 'POST'
  });
  if (!res.ok) {
    throw new Error(`Ingest-all failed for case ${caseId} (HTTP ${res.status})`);
  }
  return (await res.json()) as IngestSummaryResponse;
}

export async function getBackendEvents(
  caseId: string,
  sourceType?: string,
  status?: string
): Promise<{ total: number; events: UnifiedEvent[] }> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  if (sourceType && sourceType !== 'ALL') {
    params.append('source_type', sourceType);
  }
  if (status) {
    params.append('status', status);
  }
  const queryStr = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${base}/api/cases/${encodeURIComponent(caseId)}/events${queryStr}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch events for case ${caseId} (HTTP ${res.status})`);
  }
  return (await res.json()) as { total: number; events: UnifiedEvent[] };
}

// ==========================================
// 4. CLICK-TO-VERIFY (GROUNDING / ROW PROVENANCE)
// ==========================================

export async function getClickToVerifyRow(
  caseId: string,
  artifactId: string,
  rowNumber: number,
  contextLines = 2
): Promise<ClickToVerifyResponse> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(
      `${base}/api/cases/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(artifactId)}/row/${rowNumber}?context_lines=${contextLines}`
    );
    if (res.ok) {
      return (await res.json()) as ClickToVerifyResponse;
    }
  } catch {
    // Backend offline, fallback to seeded artifact records
  }

  // Standalone offline fallback for air-gapped demo
  const art = SEEDED_ARTIFACTS.find(a => a.id === artifactId || a.filename === artifactId) || SEEDED_ARTIFACTS[0];
  const fileLines: Record<string, string[]> = {
    'calls_cdr.csv': [
      'timestamp,caller,recipient,duration_sec,call_type',
      '2026-09-15 11:15:20,+919811223344,+919876543210,45,INCOMING_PERSONAL',
      '2026-09-15 14:05:00,+919123456789,+919876543210,180,INCOMING_SUSPICIOUS',
      '2026-09-15 14:15:00,+919876543210,+919811223344,60,OUTGOING_DISTRESS'
    ],
    'bank_upi_statement.csv': [
      'timestamp,txn_id,sender_upi,receiver_upi,amount,status,utr_ref',
      '2026-09-15 12:30:00,TXN_992101,ramesh.sharma@okhdfc,swiggyorders@icici,320.00,SUCCESS,UTR_11002233',
      '2026-09-15 14:08:15,TXN_992102,ramesh.sharma@okhdfc,cbiseal.investigation@okaxis,25000.00,SUCCESS,UTR_429104829104',
      '2026-09-15 15:45:00,TXN_992103,ramesh.sharma@okhdfc,groceries@paytm,450.50,SUCCESS,UTR_99887766'
    ],
    'whatsapp_chat.txt': [
      '[2026-09-15 11:20:00] Sharma Ji: Pick up milk on your way home.',
      '[2026-09-15 14:06:10] CBI Cyber Cell Delhi: Immediate Notice: An arrest warrant has been issued in your name under Section 1930 PMLA. Transfer refundable bail deposit of INR 25,000 to escrow cbiseal.investigation@okaxis immediately to avoid police dispatch.',
      '[2026-09-15 14:09:00] CBI Cyber Cell Delhi: Payment acknowledged. Do not disconnect Skype session until verification clearance is generated.'
    ],
    'security_events.json': [
      '{"timestamp": "2026-09-15 14:04:10", "event_id": 4688, "process_name": "chrome.exe", "user": "DESKTOP-RAMESH\\\\ramesh"}',
      '{"timestamp": "2026-09-15 14:07:05", "event_id": 4688, "process_name": "skype.exe", "arguments": "/minimized", "user": "DESKTOP-RAMESH\\\\ramesh"}',
      '{"timestamp": "2026-09-15 14:12:30", "event_id": 4624, "target_process": "lsass.exe", "user": "NT AUTHORITY\\\\SYSTEM"}'
    ],
    'cbi_refund_acknowledgment.pdf': [
      'PDF-1.7 | Subject: Bail Clearance Deposit Clearance | Creator: Canva Desktop Editor | Signature: Self-signed Fake Certificate'
    ]
  };

  const lines = fileLines[art.filename] || ['[Raw byte record data]'];
  const targetIdx = Math.max(0, Math.min(rowNumber - 1, lines.length - 1));
  const targetLine = lines[targetIdx];

  const startIdx = Math.max(0, targetIdx - contextLines);
  const endIdx = Math.min(lines.length - 1, targetIdx + contextLines);
  const context = [];
  for (let i = startIdx; i <= endIdx; i++) {
    context.push({
      row: i + 1,
      content: lines[i],
      is_target: i === targetIdx
    });
  }

  return {
    case_id: caseId || 'DT-2026-001',
    artifact_id: art.id,
    filename: art.filename,
    row_number: rowNumber,
    target_line: targetLine,
    context,
    file_sha256: art.sha256Hash
  };
}

// ========================================================
// 5. HYBRID ADAPTER FUNCTIONS (Live Case vs. Benchmark)
// ========================================================

export async function getEvidenceArtifacts(caseId?: string): Promise<EvidenceArtifact[]> {
  if (caseId && caseId !== 'BENCHMARK' && caseId !== 'DEMO-CASE-2026-0915') {
    try {
      const backendArts = await listBackendArtifacts(caseId);
      return backendArts.map(adaptBackendArtifactToEvidenceArtifact);
    } catch (err) {
      console.error(`Error loading live artifacts for ${caseId}:`, err);
      throw err;
    }
  }
  return SEEDED_ARTIFACTS;
}

export async function getForensicEvents(caseId?: string, sourceType?: string): Promise<ForensicEvent[]> {
  if (caseId && caseId !== 'BENCHMARK' && caseId !== 'DEMO-CASE-2026-0915') {
    try {
      const resp = await getBackendEvents(caseId, sourceType);
      return resp.events.map(adaptUnifiedEventToForensicEvent);
    } catch (err) {
      console.error(`Error loading live events for ${caseId}:`, err);
      throw err;
    }
  }
  return SEEDED_EVENTS;
}

export async function getAnomalies(): Promise<AnomalyItem[]> {
  return SEEDED_ANOMALIES;
}

export async function verifyStatement(statement: string): Promise<ClaimVerificationResult> {
  return runDeterministicVerification(statement);
}

export async function getBenchmarkMetrics(): Promise<BenchmarkMetrics> {
  return BENCHMARK_STATS;
}

export interface CopilotResponse {
  answer: string;
  sourceCitations: string[];
  claimStatus: 'VERIFIED' | 'INFERRED' | 'CONTRADICTED' | 'NOT_FOUND';
  disclaimer: string;
}

export async function queryCopilot(question: string, language: 'en' | 'hi' = 'en'): Promise<CopilotResponse> {
  const result = await executeCopilotQuery(question, language);
  
  let mappedStatus: 'VERIFIED' | 'INFERRED' | 'CONTRADICTED' | 'NOT_FOUND' = 'INFERRED';
  if (result.verdict === 'VERIFIED') mappedStatus = 'VERIFIED';
  else if (result.verdict === 'CONTRADICTED') mappedStatus = 'CONTRADICTED';
  else if (result.verdict === 'NOT FOUND IN AVAILABLE EVIDENCE') mappedStatus = 'NOT_FOUND';
  else mappedStatus = 'INFERRED';

  return {
    answer: result.answer,
    sourceCitations: result.citations.map(c => `${c.filename}:L${c.row_number}`),
    claimStatus: mappedStatus,
    disclaimer: result.disclaimer
  };
}
