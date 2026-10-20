import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateTimeDifference, parseTimestampToUTC, formatUTC, formatIST } from '../src/utils/timezone.ts';
import { runDeterministicVerification } from '../src/services/verificationEngine.ts';
import { 
  CASE_METADATA, 
  SEEDED_ARTIFACTS, 
  SEEDED_EVENTS, 
  TIMEZONE_INVERSION_EVALUATION 
} from '../src/data/syntheticCase.ts';

test('1. Timezone Inversion Scenario: 14:05:00 UTC vs 14:08:15 IST returns precise delta (-19,605s) and temporal order', () => {
  const result = calculateTimeDifference(
    '2026-09-15 14:05:00',
    'UTC',
    '2026-09-15 14:08:15',
    'IST'
  );

  // Bank at 14:08:15 IST = 08:38:15 UTC. Call is 14:05:00 UTC.
  // Delta = 08:38:15 UTC - 14:05:00 UTC = -5 hours, 26 minutes, and 45 seconds (-19,605 seconds)
  assert.equal(result.deltaSeconds, -19605);
  assert.equal(result.deltaMinutes, -327);
  assert.equal(result.isPrior, true);
  assert.equal(result.isInversion, true);
  assert.equal(result.time2UTC, '2026-09-15 08:38:15 UTC');
  assert.equal(result.time1UTC, '2026-09-15 14:05:00 UTC');
  assert.equal(result.formattedDelta, '5h 26m 45s BEFORE');
  assert.match(result.explanation, /payment occurred 5h 26m 45s prior to the call/);

  // Also check precomputed dynamic evaluation in syntheticCase
  assert.equal(TIMEZONE_INVERSION_EVALUATION.deltaSeconds, -19605);
  assert.equal(TIMEZONE_INVERSION_EVALUATION.formattedDelta, '5h 26m 45s BEFORE');
  assert.equal(TIMEZONE_INVERSION_EVALUATION.isPrior, true);
});

test('2. §14 Specification Scenario: ₹30,000 claim / UPI-236 yields CONTRADICTED with independent amount & temporal discrepancies', () => {
  const statement = 'The ₹30,000 payment (UPI-236) was made 3 minutes after the call (CALL-190).';
  const result = runDeterministicVerification(statement);

  assert.equal(result.status, 'CONTRADICTED');
  assert.equal(result.claimId, 'CLM-SPEC-01');
  assert.equal(result.timeDeltaSeconds, -19605);
  assert.equal(result.timeDeltaFormatted, '5 hours, 26 minutes, and 45 seconds BEFORE');
  assert.match(result.reasoning, /Two independent contradictions identified/);
  assert.ok(result.supportingRecords.some(r => r.recordId === 'UPI-236'));
  assert.ok(result.supportingRecords.some(r => r.recordId === 'CALL-190'));
  assert.ok(result.contradictingRecords && result.contradictingRecords.length === 2);

  // Assert both independent discrepancy findings
  assert.ok(result.discrepancies && result.discrepancies.length === 2);

  // 1. Amount mismatch finding
  const amountDisc = result.discrepancies.find(d => d.category === 'FINANCIAL');
  assert.ok(amountDisc, 'Financial discrepancy finding must be present');
  assert.equal(amountDisc.title, 'Amount Mismatch');
  assert.equal(amountDisc.claimedValue, '₹30,000');
  assert.equal(amountDisc.recordedValue, '₹25,000');
  assert.equal(amountDisc.discrepancyValue, '₹5,000');
  assert.match(amountDisc.details, /Amount discrepancy: ₹5,000/);

  // 2. Temporal-order contradiction finding
  const temporalDisc = result.discrepancies.find(d => d.category === 'TEMPORAL');
  assert.ok(temporalDisc, 'Temporal discrepancy finding must be present');
  assert.equal(temporalDisc.title, 'Temporal-Order Contradiction');
  assert.equal(temporalDisc.claimedValue, '3 minutes after CALL-190');
  assert.match(temporalDisc.details, /5 hours, 26 minutes, and 45 seconds before CALL-190/);
  assert.match(temporalDisc.details, /independent finding and is not caused by the amount mismatch/);

  // Verify calculation is dynamically derived from underlying source record EVT-008
  const upiRecord = SEEDED_EVENTS.find(e => e.id === 'EVT-008');
  assert.ok(upiRecord && upiRecord.amount === 25000);
  const claimedAmount = 30000;
  const dynamicallyCalculatedDiscrepancy = Math.abs(claimedAmount - upiRecord.amount);
  assert.equal(dynamicallyCalculatedDiscrepancy, 5000);
  assert.equal(amountDisc.discrepancyValue, `₹${dynamicallyCalculatedDiscrepancy.toLocaleString('en-IN')}`);
});

test('3. ₹50,000-vs-₹25,000 demo scenario is evaluated correctly and yields CONTRADICTED', () => {
  const statement = 'Payment of ₹50,000 happened 3 minutes after the suspicious call.';
  const result = runDeterministicVerification(statement);

  assert.equal(result.status, 'CONTRADICTED');
  assert.equal(result.claimId, 'CLM-001');
  assert.equal(result.timeDeltaSeconds, -19605);
  assert.match(result.reasoning, /Financial amount claimed \(₹50,000\) actively contradicts the certified ledger/);
  assert.ok(result.contradictingRecords && result.contradictingRecords.length > 0);
  assert.equal(result.contradictingRecords[0].recordId, 'TXN_992102');
});

test('4. Direct evidence contradiction yields CONTRADICTED', () => {
  const statement = 'The victim paid ₹50000 to cyber cell';
  const result = runDeterministicVerification(statement);

  assert.equal(result.status, 'CONTRADICTED');
  assert.ok(result.contradictingRecords && result.contradictingRecords.length > 0);
});

test('5. Direct evidence support yields VERIFIED', () => {
  // Test direct telephony match
  const statement1 = 'Inbound call from +91 91234 56789 to victim occurred at 14:05:00 UTC.';
  const result1 = runDeterministicVerification(statement1);
  assert.equal(result1.status, 'VERIFIED');
  assert.equal(result1.claimId, 'CLM-002');
  assert.ok(result1.supportingRecords.some(r => r.file === 'calls_cdr.csv'));

  // Test counterpart specification scenario (CALL-182 and UPI-241 both in IST)
  const statement2 = 'CALL-182 at 14:05 IST was followed 3 minutes later by UPI-241 at 14:08 IST.';
  const result2 = runDeterministicVerification(statement2);
  assert.equal(result2.status, 'VERIFIED');
  assert.equal(result2.claimId, 'CLM-SPEC-02');
  assert.equal(result2.timeDeltaSeconds, 180);
});

test('6. Plausible inference lacking direct proof yields INFERRED — REQUIRES HUMAN REVIEW', () => {
  const statement = 'The incoming caller psychologically coerced the victim into initiating the ₹25,000 UPI transfer.';
  const result = runDeterministicVerification(statement);

  assert.equal(result.status, 'INFERRED');
  assert.equal(result.claimId, 'CLM-003');
  assert.match(result.correctedStatement, /INFERRED — REQUIRES HUMAN REVIEW/);
  assert.ok(result.missingEvidenceNeeded && result.missingEvidenceNeeded.includes('Sworn statement'));
});

test('7. Unsupported claim absent from evidence yields NOT FOUND IN AVAILABLE EVIDENCE', () => {
  const statement = 'Victim transferred ₹1,00,000 to an offshore crypto exchange wallet.';
  const result = runDeterministicVerification(statement);

  assert.equal(result.status, 'NOT_FOUND');
  assert.equal(result.claimId, 'CLM-004');
  assert.match(result.correctedStatement, /NOT FOUND IN AVAILABLE EVIDENCE/);
  assert.equal(result.supportingRecords.length, 0);
  assert.ok(result.missingEvidenceNeeded && result.missingEvidenceNeeded.length > 0);
});

test('8. Causal claims are not marked VERIFIED merely because timestamps are close or connected in graph', () => {
  const causalStatements = [
    'The caller forced the victim to pay ₹25,000',
    'The phone call caused the transaction to happen',
    'The threat message psychologically compelled the immediate transfer'
  ];

  for (const stmt of causalStatements) {
    const res = runDeterministicVerification(stmt);
    // Strict forensic rule: Causal claims must NEVER be marked VERIFIED
    assert.notEqual(res.status, 'VERIFIED', `Causal claim "${stmt}" was incorrectly marked VERIFIED`);
    assert.equal(res.status, 'INFERRED', `Causal claim "${stmt}" must be marked INFERRED`);
  }
});

test('9. Financial amounts and timestamps displayed on overview dashboard agree with underlying fixture', () => {
  // Underlying transactions in bank_upi_statement.csv
  const financialEvents = SEEDED_EVENTS.filter(e => e.category === 'FINANCIAL' && e.amount);
  const totalLedgerDebits = financialEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  // Row 2: 320.00 (Swiggy)
  // Row 3: 25000.00 (Disputed extortion)
  // Row 4: 450.50 (Groceries)
  // Total: 25770.50
  assert.equal(totalLedgerDebits, 25770.50);
  assert.equal(CASE_METADATA.totalLedgerDebitsINR, 25770.50);
  assert.equal(CASE_METADATA.disputedOutflowINR, 25000.00);
  assert.equal(CASE_METADATA.legitimateBaselineSpendINR, 770.50);
  assert.equal(CASE_METADATA.disputedOutflowINR + CASE_METADATA.legitimateBaselineSpendINR, CASE_METADATA.totalLedgerDebitsINR);

  // Check evidence artifact hash
  const bankArtifact = SEEDED_ARTIFACTS.find(a => a.filename === 'bank_upi_statement.csv');
  assert.ok(bankArtifact);
  assert.equal(bankArtifact.sha256Hash, 'd3f9b291c784910ea094b872efc40192a83b271d441098bc5721ea1029c914e2');
});

test('10. UI timezone handling preserves original timezone info and does not treat IST as UTC', () => {
  const callEvent = SEEDED_EVENTS.find(e => e.id === 'EVT-005');
  const bankEvent = SEEDED_EVENTS.find(e => e.id === 'EVT-008');

  assert.ok(callEvent);
  assert.ok(bankEvent);

  // Call export is stamped in UTC
  assert.equal(callEvent.sourceTimezone, 'UTC (+00:00)');
  assert.equal(callEvent.timestampUTC, '2026-09-15T14:05:00Z');

  // Bank export is stamped in IST
  assert.equal(bankEvent.sourceTimezone, 'IST (+05:30)');
  assert.equal(bankEvent.timestampUTC, '2026-09-15T08:38:15Z');
  assert.equal(bankEvent.timestampRaw, '2026-09-15 14:08:15 (IST)');

  // Converting 14:08:15 IST to UTC must equal 08:38:15Z, NEVER 14:08:15Z
  const parsedBankUTC = parseTimestampToUTC('2026-09-15 14:08:15', 'IST');
  assert.ok(parsedBankUTC);
  assert.equal(parsedBankUTC.toISOString(), '2026-09-15T08:38:15.000Z');

  // Formatting helpers
  const utcFormatted = formatUTC('2026-09-15T08:38:15Z');
  assert.match(utcFormatted, /08:38:15 UTC/);

  const istFormatted = formatIST('2026-09-15T08:38:15Z');
  assert.match(istFormatted, /14:08:15 IST/);
});

test('11. Backend API Adapter: adaptBackendArtifactToEvidenceArtifact maps server schema', async () => {
  const { adaptBackendArtifactToEvidenceArtifact } = await import('../src/types/backend.ts');
  const backendArt = {
    artifact_id: 'ART-002',
    case_id: 'CASE-LIVE-TEST-01',
    filename: 'bank_statement.csv',
    stored_filename: 'ART-002_bank_statement.csv',
    file_sha256: 'e9be8bac3f2e0cd09b27d612c3547647c275d8cc6a76238a8c656c44f61cc14f',
    file_size_bytes: 1458,
    timestamp_ingested_utc: '2026-10-20T08:25:33Z',
    custody_record_id: 'REC-002',
    original_path: 'cases/CASE-LIVE-TEST-01/vault/originals/ART-002_bank_statement.csv',
    analysis_path: 'cases/CASE-LIVE-TEST-01/vault/analysis/ART-002_bank_statement.csv'
  };

  const adapted = adaptBackendArtifactToEvidenceArtifact(backendArt);
  assert.equal(adapted.id, 'ART-002');
  assert.equal(adapted.filename, 'bank_statement.csv');
  assert.equal(adapted.type, 'BANK_UPI');
  assert.equal(adapted.fileSizeBytes, 1458);
  assert.equal(adapted.sha256Hash, 'e9be8bac3f2e0cd09b27d612c3547647c275d8cc6a76238a8c656c44f61cc14f');
  assert.equal(adapted.status, 'SEALED');
});

test('12. Backend API Adapter: adaptUnifiedEventToForensicEvent preserves raw timestamp, timezone basis, and locators', async () => {
  const { adaptUnifiedEventToForensicEvent } = await import('../src/types/backend.ts');
  const unifiedEvt = {
    event_id: 'UPI-241',
    case_id: 'CASE-LIVE-TEST-01',
    artifact_id: 'ART-002',
    source_type: 'upi' as const,
    timestamp_utc: '2026-09-30T08:38:12Z',
    timestamp_original: '2026-09-30 14:08:12',
    timezone_original: 'Asia/Kolkata',
    timezone_basis: 'bank export header',
    actor: 'victim@okhdfcbank',
    target: 'mule.a@fakeupi',
    action: 'TRANSFER',
    amount: 25000.0,
    currency: 'INR',
    status: 'SUCCESS',
    locator: {
      file: 'ART-002_bank_statement.csv',
      row: 4
    }
  };

  const adapted = adaptUnifiedEventToForensicEvent(unifiedEvt);
  assert.equal(adapted.id, 'UPI-241');
  assert.equal(adapted.category, 'FINANCIAL');
  assert.equal(adapted.sourceType, 'BANK_UPI');
  assert.equal(adapted.timestampUTC, '2026-09-30T08:38:12Z');
  assert.equal(adapted.timestampRaw, '2026-09-30 14:08:12 (Asia/Kolkata)');
  assert.match(adapted.sourceTimezone, /Asia\/Kolkata \[Basis: bank export header\]/);
  assert.equal(adapted.sourceFile, 'ART-002_bank_statement.csv');
  assert.equal(adapted.sourceRow, 4);
  assert.equal(adapted.actor, 'victim@okhdfcbank');
  assert.equal(adapted.recipient, 'mule.a@fakeupi');
  assert.equal(adapted.amount, 25000.0);
  assert.equal(adapted.currency, 'INR');
  assert.equal(adapted.sha256Prefix, 'ART-002');
  assert.ok(adapted.flags?.includes('HIGH_VALUE_TRANSACTION'));
});
