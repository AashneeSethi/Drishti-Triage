import type { ForensicVerdict } from './copilot';

export type BenchmarkTestType = 
  | 'DIRECT_SUPPORT'
  | 'AMOUNT_MISMATCH'
  | 'TIMEZONE_INVERSION'
  | 'UNSUPPORTED'
  | 'PLAUSIBLE_INFERENCE'
  | 'CAUSAL_CLAIM'
  | 'AMBIGUOUS_TIMEZONE'
  | 'CONFLICTING_RECORDS';

export interface BenchmarkClaim {
  claim_id: string;
  scenario_id: string;
  category: 'TEMPORAL' | 'FINANCIAL' | 'IDENTITY' | 'CAUSAL' | 'SYSTEM' | 'UNSUPPORTED';
  test_type: BenchmarkTestType;
  claim_text_en: string;
  claim_text_hi: string;
  expected_verdict: ForensicVerdict;
  expected_factual_conclusion_en: string;
  expected_factual_conclusion_hi: string;
  supporting_evidence_ids: string[];
  contradicting_evidence_ids: string[];
  required_reasoning_en: string;
  required_reasoning_hi: string;
  missing_evidence?: string[];
  is_causal_or_inference: boolean;
}

export interface GroundTruthDataset {
  case_id: string;
  case_name: string;
  case_lead: string;
  victim: {
    name: string;
    phone: string;
    vpa: string;
    account: string;
  };
  suspect: {
    identifier: string;
    phone: string;
    organization: string;
  };
  mule_accounts: Array<{
    tier: number;
    account: string;
    vpa: string;
    holder: string;
  }>;
  benchmark_claims: BenchmarkClaim[];
}
