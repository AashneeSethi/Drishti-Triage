import unittest
import shutil
import asyncio
from pathlib import Path

from backend.main import (
    app,
    vault,
    create_case,
    CreateCaseRequest,
    get_custody_ledger,
    ingest_all,
    get_events,
    get_source_row,
    tamper_demo
)

class TestAPIEndpoints(unittest.TestCase):

    def setUp(self):
        self.case_id = "CASE-DIRECT-API-TEST"
        case_dir = Path("cases") / self.case_id
        if case_dir.exists():
            shutil.rmtree(case_dir)

    def tearDown(self):
        case_dir = Path("cases") / self.case_id
        if case_dir.exists():
            shutil.rmtree(case_dir)

    def test_direct_api_workflow(self):
        # 1. Create Case
        req = CreateCaseRequest(case_id=self.case_id, title="Direct API Test")
        res = create_case(req)
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["case"]["case_id"], self.case_id)

        # 2. Ingest Evidence Files directly via Vault
        call_log_path = Path("data/synthetic_case/evidence/call_logs.csv")
        art_call = vault.ingest_file(self.case_id, call_log_path, "call_logs.csv")
        self.assertEqual(art_call["artifact_id"], "ART-001")

        bank_path = Path("data/synthetic_case/evidence/bank_statement.csv")
        art_bank = vault.ingest_file(self.case_id, bank_path, "bank_statement.csv")
        self.assertEqual(art_bank["artifact_id"], "ART-002")

        # 3. View Custody Ledger endpoint
        custody_data = get_custody_ledger(self.case_id)
        self.assertTrue(custody_data["is_chain_intact"])
        self.assertEqual(custody_data["total_records"], 2)

        # 4. Ingest All Evidence endpoint
        ingest_summary = ingest_all(self.case_id)
        self.assertEqual(ingest_summary["case_id"], self.case_id)
        self.assertGreater(ingest_summary["total_events"], 10)

        # 5. Get Events endpoint (filtered by upi)
        events_resp = get_events(self.case_id, source_type="upi")
        self.assertGreater(events_resp["total"], 0)

        # 6. Click-to-Verify source row lookup endpoint
        row_data = get_source_row(self.case_id, "ART-002", row_number=4, context_lines=2)
        self.assertEqual(row_data["row_number"], 4)
        self.assertIn("UPI-241", row_data["target_line"])
        self.assertEqual(len(row_data["context"]), 5)

        # 7. Tamper demo endpoint
        tamper_data = tamper_demo(self.case_id, "ART-001")
        self.assertEqual(tamper_data["status"], "tampered")
        self.assertFalse(tamper_data["post_tamper_audit"]["overall_intact"])
        self.assertFalse(tamper_data["post_tamper_audit"]["files_intact"])

if __name__ == "__main__":
    unittest.main()
