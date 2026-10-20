export type ForensicStatus = 'VERIFIED' | 'INFERRED' | 'CONTRADICTED' | 'NOT_FOUND';

export type EvidenceType = 'CDR' | 'BANK_UPI' | 'WHATSAPP' | 'SYSTEM_EVTX' | 'DOCUMENT_PDF';

export interface EvidenceArtifact {
  id: string;
  filename: string;
  type: EvidenceType;
  fileSizeBytes: number;
  sha256Hash: string;
  ingestedAt: string;
  status: 'SEALED' | 'VALIDATED' | 'CORRUPTED';
  recordCount: number;
  sourceDevice: string;
  custodian: string;
  rawSample: string;
}

export interface ForensicEvent {
  id: string;
  timestampUTC: string;
  timestampRaw: string;
  sourceTimezone: string;
  sourceType: EvidenceType;
  sourceFile: string;
  sourceRow: number;
  sha256Prefix: string;
  actor: string;
  recipient?: string;
  action: string;
  amount?: number;
  currency?: string;
  details: string;
  category: 'TELEPHONY' | 'FINANCIAL' | 'COMMUNICATION' | 'SYSTEM_LOG' | 'DOCUMENT';
  flags?: string[];
}

export type EdgeCertainty = 'DETERMINISTIC' | 'INFERRED';

export interface GraphNodeData {
  label: string;
  type: 'PHONE' | 'UPI_ID' | 'BANK_ACCOUNT' | 'PERSONA' | 'DEVICE' | 'PROCESS';
  identifier: string;
  suspicionLevel: 'HIGH_SUSPECT' | 'VICTIM' | 'MULE' | 'NEUTRAL';
  eventCount: number;
  firstSeen: string;
  lastSeen: string;
  evidenceRefs: string[];
}

export interface GraphEdgeData {
  label: string;
  certainty: EdgeCertainty;
  relationType: 'CALLED' | 'TRANSFERRED_FUNDS' | 'MESSAGED' | 'EXECUTED_ON' | 'COERCED_INFERRED';
  supportingRecords: string[];
  description: string;
}

export interface AnomalyItem {
  id: string;
  ruleName: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  detectedTimeUTC: string;
  detectedTimeIST: string;
  supportingEventIds: string[];
  supportingRecords: string[];
  explanation: string;
  investigatorGuidance: string;
}

export interface EvidenceRecordRef {
  recordId: string;
  file: string;
  line: number;
  rawExcerpt: string;
  sha256Prefix: string;
}

export interface DiscrepancyFinding {
  title: string;
  category: 'FINANCIAL' | 'TEMPORAL' | 'IDENTITY' | 'OTHER';
  claimedValue: string;
  recordedValue: string;
  discrepancyValue?: string;
  details: string;
}

export interface ClaimVerificationResult {
  claimId: string;
  inputStatement: string;
  status: ForensicStatus;
  claimType: 'TEMPORAL' | 'FINANCIAL' | 'IDENTITY' | 'CAUSAL' | 'ABSENCE';
  claimedValue: string;
  groundTruthValue: string;
  timeDeltaSeconds?: number;
  timeDeltaFormatted?: string;
  discrepancies?: DiscrepancyFinding[];
  supportingRecords: EvidenceRecordRef[];
  contradictingRecords?: EvidenceRecordRef[];
  missingEvidenceNeeded?: string;
  reasoning?: string;
  aiProposal: string;
  correctedStatement: string;
  discrepancyAnalysis: string;
  legalAdmissibilityNote: string;
  isDemoEngine: boolean;
}

export interface BenchmarkMetrics {
  totalRecordsSeeded: number;
  recordsResolved: number;
  recordResolutionRate: number;
  plantedContradictions: number;
  contradictionsCaught: number;
  contradictionCatchRate: number;
  utcNormalizationAccuracy: number;
  dataExfiltrationEvents: number;
  offlineExecutionVerified: boolean;
}
