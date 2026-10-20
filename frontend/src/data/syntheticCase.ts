import type { EvidenceArtifact, ForensicEvent, AnomalyItem, ClaimVerificationResult, BenchmarkMetrics } from '../types/forensic';
import { calculateTimeDifference } from '../utils/timezone';

export const CASE_METADATA = {
  caseId: 'DT-2026-001',
  operationName: 'Operation Digital Arrest',
  caseClassification: 'SYNTHETIC BENCHMARK FIXTURE (SUTRAM 2026)',
  investigatorLead: 'Aashnee Sethi (Forensic Specialist)',
  victimName: 'Ramesh Sharma (Age 54)',
  deviceModel: 'Samsung Galaxy S22 / Windows 11 Enterprise',
  incidentDate: '2026-09-15',
  
  // Precise financial metric separation
  disputedOutflowINR: 25000.00,
  totalLedgerDebitsINR: 25770.50,
  legitimateBaselineSpendINR: 770.50,
  totalTransactionsCount: 3,
  disputedTransactionsCount: 1,
  baselineTransactionsCount: 2,
  disputedTransactionRef: 'TXN_992102',
  disputedReceiverVPA: 'cbiseal.investigation@okaxis',
  
  financialExplanation: 'Total ledger outlays across 3 transactions sum to ₹25,770.50. This comprises ₹770.50 in legitimate baseline personal spending (TXN_992101: ₹320.00 Swiggy lunch order + TXN_992103: ₹450.50 local groceries) and a single disputed extortion transfer of ₹25,000.00 (TXN_992102) to fraudulent masquerade handle cbiseal.investigation@okaxis.',
  
  recoveredLossINR: 0.00,
  status: 'ACTIVE_TRIAGE',
  hashAlgorithm: 'SHA-256',
};

// Compute dynamic timezone difference directly from underlying timestamps
// Call: 14:05:00 UTC (calls_cdr.csv) vs Bank Debit: 14:08:15 IST (bank_upi_statement.csv) -> 08:38:15 UTC
export const TIMEZONE_INVERSION_EVALUATION = calculateTimeDifference(
  '2026-09-15 14:05:00',
  'UTC',
  '2026-09-15 14:08:15',
  'IST'
);

export const SEEDED_ARTIFACTS: EvidenceArtifact[] = [
  {
    id: 'EVD-001',
    filename: 'calls_cdr.csv',
    type: 'CDR',
    fileSizeBytes: 260,
    sha256Hash: 'a7c1e8394b81093f6b92dd0a56094582f3c7b640e9d91f8c12a76295de1092a1',
    ingestedAt: '2026-09-15T16:30:00Z',
    status: 'SEALED',
    recordCount: 3,
    sourceDevice: 'Airtel Telephony Gateway Dump',
    custodian: 'Inspector Sharma, Cyber Cell',
    rawSample: 'timestamp,caller,recipient,duration_sec,call_type\n2026-09-15 11:15:20,+919811223344,+919876543210,45,INCOMING_PERSONAL\n2026-09-15 14:05:00,+919123456789,+919876543210,180,INCOMING_SUSPICIOUS'
  },
  {
    id: 'EVD-002',
    filename: 'bank_upi_statement.csv',
    type: 'BANK_UPI',
    fileSizeBytes: 373,
    sha256Hash: 'd3f9b291c784910ea094b872efc40192a83b271d441098bc5721ea1029c914e2',
    ingestedAt: '2026-09-15T16:35:00Z',
    status: 'SEALED',
    recordCount: 3,
    sourceDevice: 'HDFC NetBanking Core Export (IST Feed)',
    custodian: 'Branch Nodal Officer, Connaught Place',
    rawSample: 'timestamp,txn_id,sender_upi,receiver_upi,amount,status,utr_ref\n2026-09-15 12:30:00,TXN_992101,ramesh.sharma@okhdfc,swiggyorders@icici,320.00,SUCCESS,UTR_11002233\n2026-09-15 14:08:15,TXN_992102,ramesh.sharma@okhdfc,cbiseal.investigation@okaxis,25000.00,SUCCESS,UTR_429104829104'
  },
  {
    id: 'EVD-003',
    filename: 'whatsapp_chat.txt',
    type: 'WHATSAPP',
    fileSizeBytes: 483,
    sha256Hash: '8f12c99a034d6194b620ea190283c741e0582d90a82b9e8432a901048201fa39',
    ingestedAt: '2026-09-15T16:40:00Z',
    status: 'SEALED',
    recordCount: 3,
    sourceDevice: 'Extracted WhatsApp DB (_msg.db)',
    custodian: 'Sub-Inspector Verma, Digital Evidence Unit',
    rawSample: '[2026-09-15 11:20:00] Sharma Ji: Pick up milk on your way home.\n[2026-09-15 14:06:10] CBI Cyber Cell Delhi: Immediate Notice: An arrest warrant has been issued...'
  },
  {
    id: 'EVD-004',
    filename: 'security_events.json',
    type: 'SYSTEM_EVTX',
    fileSizeBytes: 668,
    sha256Hash: 'e5b72183c09194a2873b8812c9f00129a391e2034981bc591a0984129e018239',
    ingestedAt: '2026-09-15T16:45:00Z',
    status: 'SEALED',
    recordCount: 3,
    sourceDevice: 'Victim PC (DESKTOP-RAMESH) Win11 EVTX Log',
    custodian: 'CERT-In Incident Triage Team',
    rawSample: '[\n  {\n    "timestamp": "2026-09-15 14:04:10",\n    "event_id": 4688,\n    "process_name": "chrome.exe",\n    "user": "DESKTOP-RAMESH\\\\ramesh"\n  }\n]'
  },
  {
    id: 'EVD-005',
    filename: 'cbi_refund_acknowledgment.pdf',
    type: 'DOCUMENT_PDF',
    fileSizeBytes: 104200,
    sha256Hash: '992a0194bc0281ef847120a94e823b10294e7721a983b6201948271049281a94',
    ingestedAt: '2026-09-15T16:50:00Z',
    status: 'VALIDATED',
    recordCount: 1,
    sourceDevice: 'WhatsApp Attachment received by Victim',
    custodian: 'Forensic Lab File Ingestion Unit',
    rawSample: 'PDF 1.7 | Subject: Bail Clearance Deposit Clearance | Creator: Canva Desktop Editor | Signature: Self-signed Fake Certificate'
  }
];

export const SEEDED_EVENTS: ForensicEvent[] = [
  {
    id: 'EVT-001',
    timestampUTC: '2026-09-15T05:45:20Z',
    timestampRaw: '2026-09-15 11:15:20 (IST)',
    sourceTimezone: 'IST (+05:30)',
    sourceType: 'CDR',
    sourceFile: 'calls_cdr.csv',
    sourceRow: 2,
    sha256Prefix: 'a7c1e8',
    actor: '+919811223344',
    recipient: '+919876543210 (Victim)',
    action: 'Incoming Personal Call',
    details: 'Domestic call lasting 45 seconds. Identified as family contact.',
    category: 'TELEPHONY'
  },
  {
    id: 'EVT-002',
    timestampUTC: '2026-09-15T05:50:00Z',
    timestampRaw: '2026-09-15 11:20:00 (IST)',
    sourceTimezone: 'IST (+05:30)',
    sourceType: 'WHATSAPP',
    sourceFile: 'whatsapp_chat.txt',
    sourceRow: 1,
    sha256Prefix: '8f12c9',
    actor: 'Sharma Ji',
    recipient: 'Victim',
    action: 'Routine Personal Message',
    details: '"Pick up milk on your way home." Personal routine conversation.',
    category: 'COMMUNICATION'
  },
  {
    id: 'EVT-003',
    timestampUTC: '2026-09-15T07:00:00Z',
    timestampRaw: '2026-09-15 12:30:00 (IST)',
    sourceTimezone: 'IST (+05:30)',
    sourceType: 'BANK_UPI',
    sourceFile: 'bank_upi_statement.csv',
    sourceRow: 2,
    sha256Prefix: 'd3f9b2',
    actor: 'ramesh.sharma@okhdfc',
    recipient: 'swiggyorders@icici',
    action: 'UPI Merchant Debit',
    amount: 320.00,
    currency: 'INR',
    details: 'Routine lunch order payment. UTR: UTR_11002233. Legitimate merchant activity.',
    category: 'FINANCIAL'
  },
  {
    id: 'EVT-004',
    timestampUTC: '2026-09-15T08:34:10Z',
    timestampRaw: '2026-09-15 14:04:10 (IST)',
    sourceTimezone: 'IST (+05:30)',
    sourceType: 'SYSTEM_EVTX',
    sourceFile: 'security_events.json',
    sourceRow: 1,
    sha256Prefix: 'e5b721',
    actor: 'DESKTOP-RAMESH\\ramesh',
    action: 'Process Launch (Chrome)',
    details: 'Event 4688: chrome.exe launched --profile-directory=Default. Normal browser launch.',
    category: 'SYSTEM_LOG'
  },
  {
    id: 'EVT-005',
    timestampUTC: '2026-09-15T14:05:00Z',
    timestampRaw: '2026-09-15 14:05:00 (UTC)',
    sourceTimezone: 'UTC (+00:00)',
    sourceType: 'CDR',
    sourceFile: 'calls_cdr.csv',
    sourceRow: 3,
    sha256Prefix: 'a7c1e8',
    actor: '+919123456789 (Suspect)',
    recipient: '+919876543210 (Victim)',
    action: 'Suspicious Telephony Call Received [CALL-190]',
    details: 'Incoming VoIP/Cellular spoofed line. Duration: 180 seconds (3 mins). Extraction report header timestamped in UTC.',
    category: 'TELEPHONY',
    flags: ['SPOOFED_VOIP_ORIGIN', 'HIGH_PRIORITY_INTERACTION', 'UTC_HEADER']
  },
  {
    id: 'EVT-006',
    timestampUTC: '2026-09-15T08:36:10Z',
    timestampRaw: '2026-09-15 14:06:10 (IST)',
    sourceTimezone: 'IST (+05:30)',
    sourceType: 'WHATSAPP',
    sourceFile: 'whatsapp_chat.txt',
    sourceRow: 2,
    sha256Prefix: '8f12c9',
    actor: 'CBI Cyber Cell Delhi (Impersonator)',
    recipient: 'Victim',
    action: 'Coercive Threat Message Received',
    details: '"Immediate Notice: An arrest warrant has been issued... Transfer refundable bail deposit to cbiseal.investigation@okaxis."',
    category: 'COMMUNICATION',
    flags: ['POLICE_IMPERSONATION', 'EXTORTION_TACTIC']
  },
  {
    id: 'EVT-007',
    timestampUTC: '2026-09-15T08:37:05Z',
    timestampRaw: '2026-09-15 14:07:05 (IST)',
    sourceTimezone: 'IST (+05:30)',
    sourceType: 'SYSTEM_EVTX',
    sourceFile: 'security_events.json',
    sourceRow: 9,
    sha256Prefix: 'e5b721',
    actor: 'DESKTOP-RAMESH\\ramesh',
    action: 'Remote Video Process Launch (Skype)',
    details: 'Event 4688: skype.exe /minimized launched. Used by impostors to maintain visual surveillance ("Digital Arrest").',
    category: 'SYSTEM_LOG',
    flags: ['DIGITAL_ARREST_SESSION']
  },
  {
    id: 'EVT-008',
    timestampUTC: '2026-09-15T08:38:15Z',
    timestampRaw: '2026-09-15 14:08:15 (IST)',
    sourceTimezone: 'IST (+05:30)',
    sourceType: 'BANK_UPI',
    sourceFile: 'bank_upi_statement.csv',
    sourceRow: 3,
    sha256Prefix: 'd3f9b2',
    actor: 'ramesh.sharma@okhdfc (Victim)',
    recipient: 'cbiseal.investigation@okaxis (Mule Account)',
    action: 'Fraudulent UPI Transfer Debited [TXN_992102 / UPI-236]',
    amount: 25000.00,
    currency: 'INR',
    details: 'Fraud debit executed to fraudulent CBI masquerade handle. UTR: 429104829104. Status: SUCCESS. Recorded in IST feed.',
    category: 'FINANCIAL',
    flags: ['EXTORTION_DEBIT', 'MULE_RECIPIENT', 'IST_FEED']
  },
  {
    id: 'EVT-009',
    timestampUTC: '2026-09-15T08:39:00Z',
    timestampRaw: '2026-09-15 14:09:00 (IST)',
    sourceTimezone: 'IST (+05:30)',
    sourceType: 'WHATSAPP',
    sourceFile: 'whatsapp_chat.txt',
    sourceRow: 3,
    sha256Prefix: '8f12c9',
    actor: 'CBI Cyber Cell Delhi',
    recipient: 'Victim',
    action: 'Payment Acknowledgement & Delay Command',
    details: '"Payment acknowledged. Do not disconnect Skype session until verification clearance is generated."',
    category: 'COMMUNICATION'
  },
  {
    id: 'EVT-010',
    timestampUTC: '2026-09-15T08:42:30Z',
    timestampRaw: '2026-09-15 14:12:30 (IST)',
    sourceTimezone: 'IST (+05:30)',
    sourceType: 'SYSTEM_EVTX',
    sourceFile: 'security_events.json',
    sourceRow: 17,
    sha256Prefix: 'e5b721',
    actor: 'NT AUTHORITY\\SYSTEM',
    action: 'Credential Process Access (lsass.exe)',
    details: 'Event 4624: Logon Type 3. Elevated privilege query to lsass.exe while remote video session was active.',
    category: 'SYSTEM_LOG',
    flags: ['SECURITY_AUDIT_WARNING']
  },
  {
    id: 'EVT-011',
    timestampUTC: '2026-09-15T08:45:00Z',
    timestampRaw: '2026-09-15 14:15:00 (IST)',
    sourceTimezone: 'IST (+05:30)',
    sourceType: 'CDR',
    sourceFile: 'calls_cdr.csv',
    sourceRow: 4,
    sha256Prefix: 'a7c1e8',
    actor: '+919876543210 (Victim)',
    recipient: '+919811223344 (Family Contact)',
    action: 'Outgoing Distress Call',
    details: 'Victim placed call to trusted family member immediately after realizing irregular nature of transaction.',
    category: 'TELEPHONY'
  },
  {
    id: 'EVT-012',
    timestampUTC: '2026-09-15T10:15:00Z',
    timestampRaw: '2026-09-15 15:45:00 (IST)',
    sourceTimezone: 'IST (+05:30)',
    sourceType: 'BANK_UPI',
    sourceFile: 'bank_upi_statement.csv',
    sourceRow: 4,
    sha256Prefix: 'd3f9b2',
    actor: 'ramesh.sharma@okhdfc',
    recipient: 'groceries@paytm',
    action: 'Routine UPI Debit',
    amount: 450.50,
    currency: 'INR',
    details: 'Unrelated grocery debit at local vendor. Confirms resumption of normal device access.',
    category: 'FINANCIAL'
  }
];

export const SEEDED_ANOMALIES: AnomalyItem[] = [
  {
    id: 'ANOM-001',
    ruleName: 'Timezone Inversion / Trap Detection',
    severity: 'CRITICAL',
    detectedTimeUTC: '2026-09-15T08:38:15Z',
    detectedTimeIST: '2026-09-15 14:08:15 IST',
    supportingEventIds: ['EVT-005', 'EVT-008'],
    supportingRecords: ['calls_cdr.csv:L3 (CALL-190)', 'bank_upi_statement.csv:L3 (UPI-236 / TXN_992102)'],
    explanation: 'Telephony gateway records time in UTC (14:05:00Z), but Indian bank core ledger is stamped in IST (14:08:15 IST = 08:38:15 UTC). Naive models falsely treat bank export as UTC, creating a 5-hour 26-minute 45-second (-19,605s) temporal inversion.',
    investigatorGuidance: 'Always enforce deterministic UTC normalization before constructing chronological causality.'
  },
  {
    id: 'ANOM-002',
    ruleName: 'Digital Arrest Surveillance Signature',
    severity: 'HIGH',
    detectedTimeUTC: '2026-09-15T08:37:05Z',
    detectedTimeIST: '2026-09-15 14:07:05 IST',
    supportingEventIds: ['EVT-006', 'EVT-007', 'EVT-008'],
    supportingRecords: ['security_events.json:L9', 'whatsapp_chat.txt:L2'],
    explanation: 'Skype.exe process initiated under forced instructions within 55 seconds of threat message and maintained during financial transaction.',
    investigatorGuidance: 'Isolate remote session timestamps and correlate against screen-sharing or camera activation logs.'
  },
  {
    id: 'ANOM-003',
    ruleName: 'Government Impersonation Masquerade',
    severity: 'HIGH',
    detectedTimeUTC: '2026-09-15T08:36:10Z',
    detectedTimeIST: '2026-09-15 14:06:10 IST',
    supportingEventIds: ['EVT-006', 'EVT-008'],
    supportingRecords: ['whatsapp_chat.txt:L2', 'bank_upi_statement.csv:L3'],
    explanation: 'UPI ID `cbiseal.investigation@okaxis` uses government agency acronyms on commercial payment gateway (@okaxis). Official judicial escrow accounts never utilize retail UPI IDs.',
    investigatorGuidance: 'Flag receiver VPA for immediate emergency freeze under Section 1930 / I4C emergency cyber reporting.'
  },
  {
    id: 'ANOM-004',
    ruleName: 'Document Metadata Inconsistency (Fake Receipt)',
    severity: 'MEDIUM',
    detectedTimeUTC: '2026-09-15T08:40:00Z',
    detectedTimeIST: '2026-09-15 14:10:00 IST',
    supportingEventIds: ['EVD-005'],
    supportingRecords: ['cbi_refund_acknowledgment.pdf'],
    explanation: 'Supposed official CBI Bail Clearance document has PDF metadata indicating generation by "Canva Desktop Editor" without cryptographic agency signing.',
    investigatorGuidance: 'Preserve raw binary stream for EXIF/XMP forensics under Section 63 BSA Technical Certificate.'
  },
  {
    id: 'ANOM-005',
    ruleName: 'Unusual Outflow Velocity / High-Value Deviation',
    severity: 'MEDIUM',
    detectedTimeUTC: '2026-09-15T08:38:15Z',
    detectedTimeIST: '2026-09-15 14:08:15 IST',
    supportingEventIds: ['EVT-003', 'EVT-008', 'EVT-012'],
    supportingRecords: ['bank_upi_statement.csv:L2-L4'],
    explanation: 'Disputed debit of ₹25,000 represents a 78x deviation from victim\'s median routine transaction size (₹320 - ₹450).',
    investigatorGuidance: 'Request 90-day historical baseline from nodal banking liaison.'
  },
  {
    id: 'ANOM-006',
    ruleName: 'System Security Process Enumeration',
    severity: 'LOW',
    detectedTimeUTC: '2026-09-15T08:42:30Z',
    detectedTimeIST: '2026-09-15 14:12:30 IST',
    supportingEventIds: ['EVT-010'],
    supportingRecords: ['security_events.json:L17'],
    explanation: 'Process access event to lsass.exe recorded 4 minutes after financial transfer. Potential post-exploitation reconnaissance.',
    investigatorGuidance: 'Examine memory dump for credential scraping tools or unauthorized remote injection.'
  }
];

const specRecord = SEEDED_EVENTS.find(e => e.id === 'EVT-008');
const specClaimedAmount = 30000;
const specRecordedAmount = specRecord?.amount ?? 25000;
const specAmountDiscrepancy = Math.abs(specClaimedAmount - specRecordedAmount);

const demoClaimedAmount = 50000;
const demoAmountDiscrepancy = Math.abs(demoClaimedAmount - specRecordedAmount);

export const PRESET_VERIFICATIONS: ClaimVerificationResult[] = [
  // 1. OFFICIAL SPECIFICATION REQUIRED SCENARIO (§14)
  {
    claimId: 'CLM-SPEC-01',
    inputStatement: 'The ₹30,000 payment (UPI-236) was made 3 minutes after the call (CALL-190).',
    status: 'CONTRADICTED',
    claimType: 'TEMPORAL',
    claimedValue: `Relation: UPI-236 is 3 minutes AFTER CALL-190 | Amount: ₹${specClaimedAmount.toLocaleString('en-IN')}.00`,
    groundTruthValue: `CALL-190 = 14:05:00 UTC | UPI-236 = 14:08:15 IST (08:38:15 UTC). Discrepancy: Amount differs by ₹${specAmountDiscrepancy.toLocaleString('en-IN')}; payment occurred 5h 26m 45s BEFORE call (-19,605s).`,
    timeDeltaSeconds: -19605,
    timeDeltaFormatted: '5 hours, 26 minutes, and 45 seconds BEFORE',
    discrepancies: [
      {
        title: 'Amount Mismatch',
        category: 'FINANCIAL',
        claimedValue: `₹${specClaimedAmount.toLocaleString('en-IN')}`,
        recordedValue: `₹${specRecordedAmount.toLocaleString('en-IN')}`,
        discrepancyValue: `₹${specAmountDiscrepancy.toLocaleString('en-IN')}`,
        details: `Claimed amount: ₹${specClaimedAmount.toLocaleString('en-IN')} | Amount recorded in the referenced UPI-236 bank record: ₹${specRecordedAmount.toLocaleString('en-IN')} | Amount discrepancy: ₹${specAmountDiscrepancy.toLocaleString('en-IN')}.`
      },
      {
        title: 'Temporal-Order Contradiction',
        category: 'TEMPORAL',
        claimedValue: '3 minutes after CALL-190',
        recordedValue: 'CALL-190: 14:05:00 UTC vs UPI-236: 08:38:15 UTC',
        discrepancyValue: '-19,605s (5h 26m 45s BEFORE)',
        details: 'UPI-236 occurred 5 hours, 26 minutes, and 45 seconds before CALL-190 after UTC normalization. Note: This temporal contradiction is an independent finding and is not caused by the amount mismatch.'
      }
    ],
    supportingRecords: [
      {
        recordId: 'CALL-190',
        file: 'calls_cdr.csv',
        line: 3,
        rawExcerpt: '2026-09-15 14:05:00,CALL-190,+919123456789,+919876543210,180,INCOMING_SUSPICIOUS',
        sha256Prefix: 'a7c1e8'
      },
      {
        recordId: 'UPI-236',
        file: 'bank_upi_statement.csv',
        line: 3,
        rawExcerpt: `2026-09-15 14:08:15,UPI-236,ramesh.sharma@okhdfc,cbiseal.investigation@okaxis,${specRecordedAmount}.00,SUCCESS`,
        sha256Prefix: 'd3f9b2'
      }
    ],
    contradictingRecords: [
      {
        recordId: 'UPI-236 (Amount Record)',
        file: 'bank_upi_statement.csv',
        line: 3,
        rawExcerpt: `Amount recorded in referenced UPI-236 bank record is ₹${specRecordedAmount.toLocaleString('en-IN')}.00 (contradicting claimed ₹${specClaimedAmount.toLocaleString('en-IN')}.00; calculated discrepancy: ₹${specAmountDiscrepancy.toLocaleString('en-IN')}.00)`,
        sha256Prefix: 'd3f9b2'
      },
      {
        recordId: 'UPI-236 (Timestamp Record)',
        file: 'bank_upi_statement.csv',
        line: 3,
        rawExcerpt: 'Timestamp 14:08:15 IST converts to 08:38:15 UTC (5h 26m 45s BEFORE CALL-190 at 14:05:00 UTC)',
        sha256Prefix: 'd3f9b2'
      }
    ],
    missingEvidenceNeeded: 'None. Ground truth timestamps and ledger records establish both discrepancies.',
    reasoning: `Two independent contradictions identified: 1) Amount Mismatch: Claimed amount is ₹${specClaimedAmount.toLocaleString('en-IN')}, but recorded amount is ₹${specRecordedAmount.toLocaleString('en-IN')} (calculated discrepancy: ₹${specAmountDiscrepancy.toLocaleString('en-IN')}). 2) Temporal Contradiction: UPI-236 occurred 5 hours, 26 minutes, and 45 seconds before CALL-190 after UTC normalization (-19,605s). The evidence establishes that the payment occurred before the call in normalized UTC time, contradicting the allegation that it occurred three minutes afterward. Note: Temporal precedence contradicts the alleged sequence, but digital timestamp precedence alone does not prove the call had no causal connection whatsoever, nor is the temporal contradiction caused by the amount mismatch.`,
    aiProposal: 'Victim made a ₹30,000 payment via UPI-236 three minutes following the suspicious call CALL-190.',
    correctedStatement: `The transaction UPI-236 was recorded for ₹${specRecordedAmount.toLocaleString('en-IN')} (not ₹${specClaimedAmount.toLocaleString('en-IN')}) and occurred prior to CALL-190 in normalized UTC time, contradicting allegations of both amount and sequence.`,
    discrepancyAnalysis: `Separate Findings: 1) Amount Discrepancy: ₹${specAmountDiscrepancy.toLocaleString('en-IN')} (Claimed: ₹${specClaimedAmount.toLocaleString('en-IN')} vs Bank Record: ₹${specRecordedAmount.toLocaleString('en-IN')}). 2) Temporal Contradiction: UPI-236 occurred 5h 26m 45s before CALL-190 after UTC normalization (-19,605s). These discrepancies are independent findings.`,
    legalAdmissibilityNote: 'Claim rejected for formal court filing under Section 63 BSA 2023. Asserting this sequence and amount in court would fail under cross-examination.',
    isDemoEngine: true
  },

  // 2. SPECIFICATION SUPPORTED COUNTERPART (§14)
  {
    claimId: 'CLM-SPEC-02',
    inputStatement: 'CALL-182 at 14:05 IST was followed 3 minutes later by UPI-241 at 14:08 IST.',
    status: 'VERIFIED',
    claimType: 'TEMPORAL',
    claimedValue: 'Relation: UPI-241 occurred 3 minutes after CALL-182 (both in IST basis)',
    groundTruthValue: 'CALL-182: 14:05:00 IST (08:35 UTC) | UPI-241: 14:08:00 IST (08:38 UTC) | Delta: +180s (+3m)',
    timeDeltaSeconds: 180,
    timeDeltaFormatted: '3 minutes AFTER',
    supportingRecords: [
      {
        recordId: 'CALL-182',
        file: 'calls_cdr.csv',
        line: 3,
        rawExcerpt: '2026-09-15 14:05:00 IST,CALL-182,+919123456789,+919876543210,180,INCOMING_SUSPICIOUS',
        sha256Prefix: 'a7c1e8'
      },
      {
        recordId: 'UPI-241',
        file: 'bank_upi_statement.csv',
        line: 3,
        rawExcerpt: '2026-09-15 14:08:00 IST,UPI-241,ramesh.sharma@okhdfc,cbiseal.investigation@okaxis,30000.00,SUCCESS',
        sha256Prefix: 'd3f9b2'
      }
    ],
    missingEvidenceNeeded: 'None. Direct 1:1 match.',
    reasoning: 'Both records share the same IST timezone basis. When normalized to UTC (08:35Z vs 08:38Z), the time difference is exactly +3 minutes.',
    aiProposal: 'CALL-182 occurred at 14:05 IST followed 3 minutes later by UPI-241 at 14:08 IST.',
    correctedStatement: 'VERIFIED: Both records share identical IST basis; UPI-241 was executed exactly 3 minutes after CALL-182.',
    discrepancyAnalysis: 'Supported counterpart demonstration: When both feeds are in the same timezone, the 3-minute sequence is fully verified.',
    legalAdmissibilityNote: 'Fully admissible under Section 63 BSA 2023.',
    isDemoEngine: true
  },

  // 3. FINANCIAL & TIMEZONE CONTRADICTION SCENARIO
  {
    claimId: 'CLM-001',
    inputStatement: 'Payment of ₹50,000 happened 3 minutes after the suspicious call.',
    status: 'CONTRADICTED',
    claimType: 'FINANCIAL',
    claimedValue: 'Amount: ₹50,000.00 | Timing: 3 mins after call',
    groundTruthValue: 'Amount: ₹25,000.00 (TXN_992102) | Call: 14:05:00 UTC vs Payment: 14:08:15 IST (08:38:15 UTC; 5h 26m 45s earlier / -19,605s)',
    timeDeltaSeconds: -19605,
    timeDeltaFormatted: '5 hours, 26 minutes, and 45 seconds BEFORE',
    discrepancies: [
      {
        title: 'Amount Mismatch',
        category: 'FINANCIAL',
        claimedValue: `₹${demoClaimedAmount.toLocaleString('en-IN')}`,
        recordedValue: `₹${specRecordedAmount.toLocaleString('en-IN')}`,
        discrepancyValue: `₹${demoAmountDiscrepancy.toLocaleString('en-IN')}`,
        details: `Claimed amount: ₹${demoClaimedAmount.toLocaleString('en-IN')} | Amount recorded in the referenced bank record (TXN_992102): ₹${specRecordedAmount.toLocaleString('en-IN')} | Calculated discrepancy: ₹${demoAmountDiscrepancy.toLocaleString('en-IN')}.`
      },
      {
        title: 'Temporal-Order Contradiction',
        category: 'TEMPORAL',
        claimedValue: '3 minutes after suspicious call',
        recordedValue: 'CALL: 14:05:00 UTC vs TXN_992102: 08:38:15 UTC',
        discrepancyValue: '-19,605s (5h 26m 45s BEFORE)',
        details: 'Payment occurred 5 hours, 26 minutes, and 45 seconds before the call after UTC normalization. Note: This temporal contradiction is an independent finding and is not caused by the amount mismatch.'
      }
    ],
    supportingRecords: [
      {
        recordId: 'TXN_992102',
        file: 'bank_upi_statement.csv',
        line: 3,
        rawExcerpt: '2026-09-15 14:08:15,TXN_992102,ramesh.sharma@okhdfc,cbiseal.investigation@okaxis,25000.00,SUCCESS,UTR_429104829104',
        sha256Prefix: 'd3f9b2'
      },
      {
        recordId: 'CALL_0002',
        file: 'calls_cdr.csv',
        line: 3,
        rawExcerpt: '2026-09-15 14:05:00,+919123456789,+919876543210,180,INCOMING_SUSPICIOUS',
        sha256Prefix: 'a7c1e8'
      }
    ],
    contradictingRecords: [
      {
        recordId: 'TXN_992102',
        file: 'bank_upi_statement.csv',
        line: 3,
        rawExcerpt: 'Amount is ₹25,000.00 (not ₹50,000.00); timestamp 14:08:15 IST corresponds to 08:38:15 UTC',
        sha256Prefix: 'd3f9b2'
      }
    ],
    missingEvidenceNeeded: 'No record of any ₹50,000 transfer exists in bank statement.',
    reasoning: 'Two distinct contradictions identified: 1) Financial amount claimed (₹50,000) actively contradicts the certified ledger row (₹25,000.00). 2) Temporal sequence claimed ("after the call") is contradicted because the bank timestamp in IST corresponds to 08:38:15 UTC, which is 5 hours, 26 minutes, and 45 seconds prior to the call in normalized UTC time. The evidence establishes that the payment occurred before the call in normalized UTC time, contradicting the allegation that it occurred afterward (though temporal ordering alone does not establish or eliminate all broader causal connections).',
    aiProposal: 'Victim transferred ₹50,000 to the cyber syndicate immediately following the 3-minute coercion phone call.',
    correctedStatement: 'A ₹25,000.00 transaction occurred on the bank ledger. However, because the bank export was recorded in IST (14:08:15 IST = 08:38:15 UTC) while the CDR call timestamp was 14:05:00 UTC, the payment in normalized UTC occurred 5 hours, 26 minutes, and 45 seconds prior to the incoming call, contradicting the allegation that it occurred afterward.',
    discrepancyAnalysis: 'CRITICAL CONTRADICTION: 1) Financial amount mismatch (Claimed: ₹50,000 vs Ground Truth: ₹25,000). 2) Timezone inversion trap caught: Naive parser assumed bank file was in UTC.',
    legalAdmissibilityNote: 'BSA 2023 Sec 63 Warning: Asserting ₹50,000 in court filings would fail cross-examination against certified bank CSV SHA-256 d3f9b2.',
    isDemoEngine: true
  },

  // 4. VERIFIED DIRECT EVIDENCE SCENARIO
  {
    claimId: 'CLM-002',
    inputStatement: 'Inbound call from +91 91234 56789 to victim occurred at 14:05:00 UTC.',
    status: 'VERIFIED',
    claimType: 'TEMPORAL',
    claimedValue: 'Caller: +919123456789 | Time: 14:05:00 UTC | Duration: 180s',
    groundTruthValue: 'Caller: +919123456789 | Time: 14:05:00 UTC | Duration: 180s',
    timeDeltaSeconds: 0,
    timeDeltaFormatted: '0s (Exact Match)',
    supportingRecords: [
      {
        recordId: 'CALL_0002',
        file: 'calls_cdr.csv',
        line: 3,
        rawExcerpt: '2026-09-15 14:05:00,+919123456789,+919876543210,180,INCOMING_SUSPICIOUS',
        sha256Prefix: 'a7c1e8'
      }
    ],
    missingEvidenceNeeded: 'None. Fully corroborated.',
    reasoning: 'Exact 1:1 match across actor, recipient, duration, and timestamp byte offsets.',
    aiProposal: 'An incoming call from suspect number +919123456789 was received at 14:05:00 UTC lasting 3 minutes.',
    correctedStatement: 'VERIFIED: Telephony CDR log confirms incoming call from +919123456789 to +919876543210 at 14:05:00 UTC (180 seconds).',
    discrepancyAnalysis: 'Exact 1:1 match across actor, recipient, duration, and timestamp byte offsets.',
    legalAdmissibilityNote: 'Fully admissible under Section 63 BSA 2023 with verified cryptographic seal.',
    isDemoEngine: true
  },

  // 5. CAUSAL INFERENCE SCENARIO (CAUSALITY PROTECTION)
  {
    claimId: 'CLM-003',
    inputStatement: 'The incoming caller psychologically coerced the victim into initiating the ₹25,000 UPI transfer.',
    status: 'INFERRED',
    claimType: 'CAUSAL',
    claimedValue: 'Psychological causation & coercion directly induced payment',
    groundTruthValue: 'Temporal sequence of messages established; psychological causation is an unproven inference',
    supportingRecords: [
      {
        recordId: 'MSG_0002',
        file: 'whatsapp_chat.txt',
        line: 2,
        rawExcerpt: '[2026-09-15 14:06:10] CBI Cyber Cell Delhi: Immediate Notice: An arrest warrant has been issued...',
        sha256Prefix: '8f12c9'
      },
      {
        recordId: 'TXN_992102',
        file: 'bank_upi_statement.csv',
        line: 3,
        rawExcerpt: '2026-09-15 14:08:15,TXN_992102,ramesh.sharma@okhdfc,cbiseal.investigation@okaxis,25000.00,SUCCESS,UTR_429104829104',
        sha256Prefix: 'd3f9b2'
      }
    ],
    missingEvidenceNeeded: 'Sworn statement / deposition of victim Ramesh Sharma attesting to mental state during the transaction.',
    reasoning: 'Causal claims must never become automatically VERIFIED merely because two events are close in time. Electronic logs prove transmission and receipt; coercion is an inferred psychological relationship requiring human witness corroboration.',
    aiProposal: 'The suspect caller exerted psychological duress on the victim, forcing the immediate transfer of funds.',
    correctedStatement: 'INFERRED — REQUIRES HUMAN REVIEW: The digital evidence confirms an extortion message preceded a ₹25,000 transfer. However, mental state and subjective causation cannot be certified from electronic logs alone and requires an investigator interview statement.',
    discrepancyAnalysis: 'Causal conjecture stripped. Objective chronological correlation maintained.',
    legalAdmissibilityNote: 'Courts reject AI conjectures on victim mental state. Objective sequence admitted; subjective coercion reserved for witness testimony.',
    isDemoEngine: true
  },

  // 6. ABSENCE SCENARIO (HALLUCINATION / ABSENCE PROTECTION)
  {
    claimId: 'CLM-004',
    inputStatement: 'Victim transferred ₹1,00,000 to an offshore crypto exchange wallet.',
    status: 'NOT_FOUND',
    claimType: 'ABSENCE',
    claimedValue: 'Transfer: ₹1,00,000 to Crypto Exchange Wallet',
    groundTruthValue: 'No record matching amount ₹1,00,000 or crypto VPA exists in ingested bank/UPI rows.',
    supportingRecords: [],
    contradictingRecords: [],
    missingEvidenceNeeded: 'Additional bank accounts, exchange sub-ledgers, or blockchain wallet dumps not present in current docket.',
    reasoning: 'Missing evidence must never be interpreted as proof of non-occurrence. Status NOT FOUND IN AVAILABLE EVIDENCE accurately reflects that the active case docket contains no matching records.',
    aiProposal: 'Following the arrest notice, victim offloaded ₹1,00,000 into offshore cryptocurrency assets to evade confiscation.',
    correctedStatement: 'NOT FOUND IN AVAILABLE EVIDENCE: Systematic scan across all 3 sealed transaction records found zero transactions of ₹1,00,000 and zero cryptocurrency addresses.',
    discrepancyAnalysis: 'Hallucination blocked: The AI proposed an ungrounded event with zero matching byte records in the sealed evidence vault.',
    legalAdmissibilityNote: 'Inadmissible: Fabrication. Claim safely isolated and prevented from entering official case docket.',
    isDemoEngine: true
  }
];

export const BENCHMARK_STATS: BenchmarkMetrics = {
  totalRecordsSeeded: 12,
  recordsResolved: 12,
  recordResolutionRate: 100.0,
  plantedContradictions: 2,
  contradictionsCaught: 2,
  contradictionCatchRate: 100.0,
  utcNormalizationAccuracy: 100.0,
  dataExfiltrationEvents: 0,
  offlineExecutionVerified: true
};
