import unittest
from pathlib import Path
from backend.parsers.registry import ParserRegistry
from backend.parsers.calls import CallLogCSVParser
from backend.parsers.upi import BankStatementCSVParser

class TestParsers(unittest.TestCase):

    def setUp(self):
        self.registry = ParserRegistry()
        self.call_logs_path = Path("data/synthetic_case/evidence/call_logs.csv")
        self.bank_statement_path = Path("data/synthetic_case/evidence/bank_statement.csv")

    def test_call_log_parsing_and_locators(self):
        parser, events, confidence = self.registry.parse_file(
            filepath=self.call_logs_path,
            artifact_id="ART-001",
            case_id="CASE-DT-2026-001"
        )
        self.assertIsInstance(parser, CallLogCSVParser)
        self.assertGreater(len(events), 0)
        self.assertGreaterEqual(confidence, 0.70)

        # Validate CALL-182 (Row 4 in CSV: header=1, CALL-101=2, CALL-170=3, CALL-182=4)
        call_182 = next(e for e in events if e.event_id == "CALL-182")
        self.assertEqual(call_182.actor, "+919876543210")
        self.assertEqual(call_182.target, "+919123456789")
        self.assertEqual(call_182.action, "CALL")
        self.assertEqual(call_182.status, "INCOMING")
        self.assertEqual(call_182.locator.file, "call_logs.csv")
        self.assertEqual(call_182.locator.row, 4)
        self.assertEqual(call_182.timestamp_utc, "2026-09-30T08:35:00Z")

    def test_bank_statement_parsing_and_locators(self):
        parser, events, confidence = self.registry.parse_file(
            filepath=self.bank_statement_path,
            artifact_id="ART-002",
            case_id="CASE-DT-2026-001"
        )
        self.assertIsInstance(parser, BankStatementCSVParser)
        self.assertGreater(len(events), 0)
        self.assertGreaterEqual(confidence, 0.70)

        # Validate UPI-241 (25K debit to Mule A)
        upi_241 = next(e for e in events if e.event_id == "UPI-241")
        self.assertEqual(upi_241.amount, 25000.0)
        self.assertEqual(upi_241.currency, "INR")
        self.assertEqual(upi_241.actor, "victim@okhdfcbank")
        self.assertEqual(upi_241.target, "mule.a@fakeupi")
        self.assertEqual(upi_241.status, "SUCCESS")
        self.assertEqual(upi_241.locator.file, "bank_statement.csv")
        self.assertEqual(upi_241.locator.row, 4)
        self.assertEqual(upi_241.timestamp_utc, "2026-09-30T08:38:12Z")

        # Validate Failed Transaction (UPI-246)
        upi_246 = next(e for e in events if e.event_id == "UPI-246")
        self.assertEqual(upi_246.status, "FAILED")
        self.assertEqual(upi_246.amount, 10000.0)

        # Validate Retried Transaction (UPI-247)
        upi_247 = next(e for e in events if e.event_id == "UPI-247")
        self.assertEqual(upi_247.status, "SUCCESS")
        self.assertEqual(upi_247.amount, 10000.0)

    def test_adaptive_parsing_on_arbitrary_bank_format(self):
        """
        Proves the universal engine works on completely different bank schemas (e.g. SBI passbook style).
        """
        scratch_sbi = Path("tests/scratch_sbi.csv")
        sbi_content = (
            "Txn Date,Narration,Chq./Ref.No.,Withdrawal Amt.,Deposit Amt.,Closing Balance\n"
            "30/09/2026 14:08:12,UPI/CR/44110022/mule.a@fakeupi,RRN-44110022,25000.00,,52000.00\n"
            "30/09/2026 16:00:00,SALARY DEPOSIT,SAL-0099,,75000.00,127000.00\n"
        )
        try:
            with open(scratch_sbi, "w") as f:
                f.write(sbi_content)

            parser, events, confidence = self.registry.parse_file(
                filepath=scratch_sbi,
                artifact_id="ART-099",
                case_id="CASE-SBI-TEST"
            )
            self.assertEqual(len(events), 2)
            # Event 1: 25k withdrawal
            self.assertEqual(events[0].amount, 25000.0)
            self.assertEqual(events[0].locator.row, 2)
            # Event 2: 75k deposit
            self.assertEqual(events[1].amount, 75000.0)
            self.assertEqual(events[1].locator.row, 3)
        finally:
            if scratch_sbi.exists():
                scratch_sbi.unlink()

if __name__ == "__main__":
    unittest.main()
