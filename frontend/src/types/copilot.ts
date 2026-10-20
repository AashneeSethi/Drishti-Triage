export type ForensicVerdict = 
  | 'VERIFIED'
  | 'INFERRED — REQUIRES HUMAN REVIEW'
  | 'CONTRADICTED'
  | 'NOT FOUND IN AVAILABLE EVIDENCE';

export interface CopilotAtomicClaim {
  claim: string;
  verdict: ForensicVerdict;
  evidence_ids: string[];
  reasoning: string;
  limitations?: string[];
}

export interface CopilotCitation {
  evidence_id: string;
  artifact_id: string;
  filename: string;
  row_number: number;
  raw_excerpt?: string;
}

export interface StructuredCopilotResponse {
  answer: string;
  verdict: ForensicVerdict;
  claims: CopilotAtomicClaim[];
  citations: CopilotCitation[];
  missing_evidence: string[];
  human_review_required: boolean;
  engine: 'ollama' | 'offline_deterministic';
  model: string;
  disclaimer: string;
  language: 'en' | 'hi';
}

export interface OllamaModelInfo {
  name: string;
  modified_at?: string;
  size?: number;
}

export interface OllamaStatus {
  isAvailable: boolean;
  baseUrl: string;
  configuredModel: string;
  availableModels: string[];
  error?: string;
}
