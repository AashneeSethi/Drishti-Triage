import unittest
import shutil
import os
import stat
from pathlib import Path
from backend.evidence.hashing import compute_file_sha256, verify_file_integrity
from backend.evidence.custody import CustodyLedger
from backend.evidence.vault import EvidenceVault

def _on_rm_error(func, path, _exc_info):
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass

class TestEvidenceVault(unittest.TestCase):

    def setUp(self):
        self.test_cases_dir = Path("tests/scratch_cases")
        if self.test_cases_dir.exists():
            shutil.rmtree(self.test_cases_dir, onerror=_on_rm_error)
        self.test_cases_dir.mkdir(parents=True, exist_ok=True)
        self.vault = EvidenceVault(root_dir=self.test_cases_dir)

    def tearDown(self):
        if self.test_cases_dir.exists():
            shutil.rmtree(self.test_cases_dir, onerror=_on_rm_error)

    def test_sha256_computation(self):
        sample_file = self.test_cases_dir / "sample.txt"
        with open(sample_file, "w") as f:
            f.write("hello forensic world\n")
        h = compute_file_sha256(sample_file)
        self.assertEqual(len(h), 64)
        self.assertTrue(verify_file_integrity(sample_file, h))

    def test_custody_hash_chain_integrity(self):
        ledger_path = self.test_cases_dir / "test_ledger.json"
        ledger = CustodyLedger(ledger_path)
        
        r1 = ledger.append("C1", "ART-001", "file1.csv", "hash1111" + "0" * 56, 100)
        r2 = ledger.append("C1", "ART-002", "file2.csv", "hash2222" + "0" * 56, 200)
        r3 = ledger.append("C1", "ART-003", "file3.csv", "hash3333" + "0" * 56, 300)

        # Check hash chaining
        self.assertEqual(r1.prev_record_hash, CustodyLedger.GENESIS_HASH)
        self.assertEqual(r2.prev_record_hash, r1.record_hash)
        self.assertEqual(r3.prev_record_hash, r2.record_hash)

        is_valid, issues = ledger.verify_chain()
        self.assertTrue(is_valid)
        self.assertEqual(len(issues), 0)

        # Tamper with record 2 hash directly in memory
        ledger.records[1].record_hash = "tampered_hash_" + "0" * 50
        is_valid, issues = ledger.verify_chain()
        self.assertFalse(is_valid)
        self.assertGreater(len(issues), 0)

    def test_vault_ingestion_and_tamper_detection(self):
        case_id = "CASE-TEST-001"
        self.vault.create_case(case_id)

        sample_file = self.test_cases_dir / "evidence_evidence.csv"
        with open(sample_file, "w") as f:
            f.write("line 1: call data\nline 2: important log\nline 3: end of log\n")

        art = self.vault.ingest_file(case_id, sample_file, "evidence_evidence.csv")
        self.assertEqual(art["artifact_id"], "ART-001")

        # Initial check must be 100% intact
        audit = self.vault.verify_case_integrity(case_id)
        self.assertTrue(audit["overall_intact"])
        self.assertTrue(audit["chain_valid"])
        self.assertTrue(audit["files_intact"])

        # Test click-to-verify raw line retrieval
        row_data = self.vault.get_raw_line(case_id, "ART-001", row_number=2, context_lines=1)
        self.assertEqual(row_data["target_line"], "line 2: important log")
        self.assertEqual(row_data["row_number"], 2)
        self.assertEqual(len(row_data["context"]), 3)

        # Live Demo Bit-flip Tamper Move:
        self.vault.tamper_file_for_demo(case_id, "ART-001", byte_offset=5)
        tamper_audit = self.vault.verify_case_integrity(case_id)
        self.assertFalse(tamper_audit["overall_intact"])
        self.assertFalse(tamper_audit["files_intact"])
        self.assertEqual(len(tamper_audit["file_issues"]), 1)
        self.assertEqual(tamper_audit["file_issues"][0]["error"], "BIT_TAMPERING_DETECTED")

if __name__ == "__main__":
    unittest.main()
