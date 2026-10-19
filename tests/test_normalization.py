import unittest
from datetime import datetime, timezone
from backend.normalization.timestamps import normalize_timestamp
from backend.normalization.entities import (
    normalize_phone_number,
    normalize_vpa,
    normalize_account_number,
    normalize_entity_identifier
)

class TestNormalizationEngine(unittest.TestCase):

    def test_epoch_timestamp(self):
        # 1759223300 = 2025-09-30 09:08:20 UTC
        res = normalize_timestamp("1759223300")
        self.assertEqual(res.timezone_basis, "epoch")
        self.assertEqual(res.timestamp_utc, "2025-09-30T09:08:20Z")

        # 13-digit epoch ms
        res_ms = normalize_timestamp("1759223300000")
        self.assertEqual(res_ms.timezone_basis, "epoch")
        self.assertEqual(res_ms.timestamp_utc, "2025-09-30T09:08:20Z")

    def test_iso_with_explicit_offset(self):
        res = normalize_timestamp("2026-09-30T14:08:12+05:30")
        self.assertEqual(res.timezone_basis, "timestamp offset")
        self.assertEqual(res.timestamp_utc, "2026-09-30T08:38:12Z")

    def test_indian_commonwealth_format(self):
        res = normalize_timestamp(
            "30/09/2026 14:08:12",
            declared_timezone="Asia/Kolkata",
            timezone_basis="bank export header"
        )
        self.assertEqual(res.timezone_basis, "bank export header")
        self.assertEqual(res.timestamp_utc, "2026-09-30T08:38:12Z")

    def test_the_signature_timezone_trap(self):
        """
        WOW #2 (Section 14 of master spec):
        CALL-190 is extracted in UTC (report header).
        UPI-236 is exported in IST (bank export header).
        Apparent wall-clock times:
           CALL-190: 14:05:00
           UPI-236:  14:08:00 (Looks like 3 minutes after the call!)
        Reality after UTC normalization:
           CALL-190: 14:05:00Z
           UPI-236:  08:38:00Z
           The payment occurred 5 hours 27 minutes BEFORE the call!
        """
        # 1. Normalizing CALL-190
        call_norm = normalize_timestamp(
            raw_val="2026-09-30 14:05:00",
            declared_timezone="UTC",
            timezone_basis="report header"
        )
        self.assertEqual(call_norm.timestamp_utc, "2026-09-30T14:05:00Z")
        self.assertEqual(call_norm.timezone_basis, "report header")

        # 2. Normalizing UPI-236
        upi_norm = normalize_timestamp(
            raw_val="2026-09-30 14:08:00",
            declared_timezone="Asia/Kolkata",
            timezone_basis="bank export header"
        )
        self.assertEqual(upi_norm.timestamp_utc, "2026-09-30T08:38:00Z")
        self.assertEqual(upi_norm.timezone_basis, "bank export header")

        # 3. Computing UTC delta
        dt_call = datetime.fromisoformat(call_norm.timestamp_utc.replace("Z", "+00:00"))
        dt_upi = datetime.fromisoformat(upi_norm.timestamp_utc.replace("Z", "+00:00"))
        delta_seconds = (dt_upi - dt_call).total_seconds()

        # Delta is -19,620 seconds = -327 minutes = -5 hours 27 minutes
        self.assertEqual(delta_seconds, -19620)
        self.assertTrue(delta_seconds < 0, "UPI-236 occurred BEFORE CALL-190 in true UTC time!")

    def test_timezone_control_pair(self):
        """
        Counterpart to the trap (Section 14):
        CALL-182 (14:05 IST) vs UPI-241 (14:08:12 IST)
        True gap: +3 minutes 12 seconds.
        """
        call_norm = normalize_timestamp("2026-09-30 14:05:00", declared_timezone="Asia/Kolkata")
        upi_norm = normalize_timestamp("2026-09-30 14:08:12", declared_timezone="Asia/Kolkata")

        self.assertEqual(call_norm.timestamp_utc, "2026-09-30T08:35:00Z")
        self.assertEqual(upi_norm.timestamp_utc, "2026-09-30T08:38:12Z")

        dt_call = datetime.fromisoformat(call_norm.timestamp_utc.replace("Z", "+00:00"))
        dt_upi = datetime.fromisoformat(upi_norm.timestamp_utc.replace("Z", "+00:00"))
        delta = (dt_upi - dt_call).total_seconds()

        self.assertEqual(delta, 192.0)  # +3 min 12 sec

    def test_entity_normalization(self):
        # Indian phone variants
        self.assertEqual(normalize_phone_number("9123456789"), "+919123456789")
        self.assertEqual(normalize_phone_number("09123456789"), "+919123456789")
        self.assertEqual(normalize_phone_number("919123456789"), "+919123456789")
        self.assertEqual(normalize_phone_number("+91 91234-56789"), "+919123456789")
        self.assertEqual(normalize_phone_number("+1 212 555 1234"), "+12125551234")

        # UPI VPAs
        self.assertEqual(normalize_vpa("Mule.A@FakeUPI"), "mule.a@fakeupi")
        self.assertEqual(normalize_vpa("  VICTIM@okHDFCBank  "), "victim@okhdfcbank")

        # Auto dispatcher
        self.assertEqual(normalize_entity_identifier("Mule.A@FakeUPI"), "mule.a@fakeupi")
        self.assertEqual(normalize_entity_identifier("9876543210"), "+919876543210")
        self.assertEqual(normalize_entity_identifier("ACC-998811"), "ACC998811")

if __name__ == "__main__":
    unittest.main()
