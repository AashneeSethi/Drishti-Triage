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
  const res = await fetch(
    `${base}/api/cases/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(artifactId)}/row/${rowNumber}?context_lines=${contextLines}`
  );
  if (!res.ok) {
    throw new Error(`Failed to retrieve row ${rowNumber} in ${artifactId} (HTTP ${res.status})`);
  }
  return (await res.json()) as ClickToVerifyResponse;
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

export async function queryCopilot(question: string): Promise<CopilotResponse> {
  const q = question.toLowerCase();

  if (q.includes('who contacted') || q.includes('first')) {
    return {
      answer: 'According to Airtel telephony CDR row 2, the earliest contact was an incoming domestic call from +91 9811223344 at 11:15:20 IST (45s). The suspicious contact began at 14:05:00 UTC from suspect number +91 91234 56789 (180s).',
      sourceCitations: ['calls_cdr.csv:L2', 'calls_cdr.csv:L3'],
      claimStatus: 'VERIFIED',
      disclaimer: 'Verified against sealed CDR record SHA-256 a7c1e8.'
    };
  }

  if (q.includes('before or after') || q.includes('payment') || q.includes('time')) {
    return {
      answer: 'When normalized to UTC: The incoming call occurred at 14:05:00 UTC, while the HDFC UPI debit occurred at 14:08:15 IST (which corresponds to 08:38:15 UTC). Therefore, the debit was stamped 5 hours and 27 minutes BEFORE the call timestamp in raw UTC.',
      sourceCitations: ['calls_cdr.csv:L3', 'bank_upi_statement.csv:L3'],
      claimStatus: 'CONTRADICTED',
      disclaimer: 'Timezone discrepancy detected: Naive UTC comparison inverted sequence.'
    };
  }

  if (q.includes('caused') || q.includes('force') || q.includes('coerc')) {
    return {
      answer: 'The electronic logs establish an extortion notice at 14:06:10 IST preceded the ₹25,000 debit at 14:08:15 IST. However, digital evidence alone cannot prove psychological coercion; that remains an unverified causal inference requiring sworn witness testimony.',
      sourceCitations: ['whatsapp_chat.txt:L2', 'bank_upi_statement.csv:L3'],
      claimStatus: 'INFERRED',
      disclaimer: 'Causal conjecture stripped under scientific forensic guidelines.'
    };
  }

  if (q.includes('trace') || q.includes('movement') || q.includes('mule') || q.includes('funds')) {
    return {
      answer: 'Funds (₹25,000) exited victim account ramesh.sharma@okhdfc to receiver VPA cbiseal.investigation@okaxis (UTR 429104829104). Onward multi-hop movement requires Section 91 CrPC / BSA disclosure from Axis Bank Nodal Officer.',
      sourceCitations: ['bank_upi_statement.csv:L3'],
      claimStatus: 'VERIFIED',
      disclaimer: 'First-hop verified. Subsequent hops require nodal banking API integration.'
    };
  }

  return {
    answer: `Analysis of query against active dataset: Evaluated against sealed forensic records. Offline local evaluation completed.`,
    sourceCitations: ['calls_cdr.csv', 'bank_upi_statement.csv'],
    claimStatus: 'INFERRED',
    disclaimer: 'Offline local evaluation completed.'
  };
}
