import csv
import json
from pathlib import Path

def generate_synthetic_case(output_dir: Path) -> dict:
    """
    Generates realistic, dirty forensic CSV datasets and ground truth
    for 'Operation Digital Arrest' (SUTRAM 2026 v1.2 Benchmark Harness).
    
    Includes:
    1. The Timezone Trap (CALL-190 in UTC vs UPI-236 in IST).
    2. Control Pair (CALL-182 in IST vs UPI-241 in IST).
    3. Financial Fraud Engine Triggers:
       - Transaction Burst (UPI-241, UPI-244, UPI-247)
       - Failed-then-retried (UPI-246 failed -> UPI-247 success)
       - Money flow trail (Victim -> Mule A -> Mule B -> Mule C)
    4. Deliberate noise (legitimate calls and transactions).
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    evidence_dir = output_dir / "evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    # 1. Android Call Logs CSV
    call_logs_file = evidence_dir / "call_logs.csv"
    call_rows = [
        # Noise: morning routine
        {
            "call_id": "CALL-101",
            "caller_number": "+919811223344",
            "receiver_number": "+919123456789",
            "direction": "INCOMING",
            "timestamp_original": "2026-09-30 09:15:00",
            "timezone_original": "Asia/Kolkata",
            "timezone_basis": "device setting",
            "duration_sec": 45,
            "call_type": "VOICE"
        },
        # Storyline: First scam contact
        {
            "call_id": "CALL-170",
            "caller_number": "+919876543210",
            "receiver_number": "+919123456789",
            "direction": "INCOMING",
            "timestamp_original": "2026-09-30 14:01:00",
            "timezone_original": "Asia/Kolkata",
            "timezone_basis": "device setting",
            "duration_sec": 180,
            "call_type": "VOICE"
        },
        # Storyline: Control Call for UPI-241 (+3 min lead)
        {
            "call_id": "CALL-182",
            "caller_number": "+919876543210",
            "receiver_number": "+919123456789",
            "direction": "INCOMING",
            "timestamp_original": "2026-09-30 14:05:00",
            "timezone_original": "Asia/Kolkata",
            "timezone_basis": "device setting",
            "duration_sec": 120,
            "call_type": "VOICE"
        },
        # THE SIGNATURE TIMEZONE TRAP:
        # Exported from Cellebrite extraction tool with report header in UTC!
        # In UTC, 14:05:00Z corresponds to 19:35:00 IST!
        {
            "call_id": "CALL-190",
            "caller_number": "+919876543210",
            "receiver_number": "+919123456789",
            "direction": "INCOMING",
            "timestamp_original": "2026-09-30 14:05:00",
            "timezone_original": "UTC",
            "timezone_basis": "report header",
            "duration_sec": 120,
            "call_type": "VOICE"
        },
        # Noise: Missed delivery call
        {
            "call_id": "CALL-205",
            "caller_number": "+919988776655",
            "receiver_number": "+919123456789",
            "direction": "MISSED",
            "timestamp_original": "2026-09-30 15:30:00",
            "timezone_original": "Asia/Kolkata",
            "timezone_basis": "device setting",
            "duration_sec": 0,
            "call_type": "VOICE"
        }
    ]

    with open(call_logs_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(call_rows[0].keys()))
        writer.writeheader()
        writer.writerows(call_rows)

    # 2. Bank / UPI Statement CSV
    bank_statement_file = evidence_dir / "bank_statement.csv"
    bank_rows = [
        # Noise: Morning grocery
        {
            "txn_id": "UPI-210",
            "timestamp_original": "2026-09-30 08:30:00",
            "timezone_original": "Asia/Kolkata",
            "timezone_basis": "bank export header",
            "sender_account": "+919123456789",
            "sender_vpa": "victim@okhdfcbank",
            "receiver_account": "ACC-998811",
            "receiver_vpa": "groceries@okaxis",
            "amount": "450.00",
            "currency": "INR",
            "txn_type": "UPI_DEBIT",
            "status": "SUCCESS",
            "reference_no": "RRN-99881122"
        },
        # THE SIGNATURE TIMEZONE TRAP COUNTERPART:
        # At 14:08:00 IST -> 08:38:00 UTC.
        # Plausible false claim: 'UPI-236 was paid 3 minutes after CALL-190'
        # Reality in UTC: UPI-236 occurred 5 hours 27 minutes BEFORE CALL-190!
        {
            "txn_id": "UPI-236",
            "timestamp_original": "2026-09-30 14:08:00",
            "timezone_original": "Asia/Kolkata",
            "timezone_basis": "bank export header",
            "sender_account": "+919123456789",
            "sender_vpa": "victim@okhdfcbank",
            "receiver_account": "ACC-MULE-A",
            "receiver_vpa": "mule.a@fakeupi",
            "amount": "30000.00",
            "currency": "INR",
            "txn_type": "UPI_DEBIT",
            "status": "SUCCESS",
            "reference_no": "RRN-44001122"
        },
        # Storyline: Controlled True Payment (paired with CALL-182 at 14:05 IST)
        {
            "txn_id": "UPI-241",
            "timestamp_original": "2026-09-30 14:08:12",
            "timezone_original": "Asia/Kolkata",
            "timezone_basis": "bank export header",
            "sender_account": "+919123456789",
            "sender_vpa": "victim@okhdfcbank",
            "receiver_account": "ACC-MULE-A",
            "receiver_vpa": "mule.a@fakeupi",
            "amount": "25000.00",
            "currency": "INR",
            "txn_type": "UPI_DEBIT",
            "status": "SUCCESS",
            "reference_no": "RRN-44110022"
        },
        # Storyline: Burst Payment 2
        {
            "txn_id": "UPI-244",
            "timestamp_original": "2026-09-30 14:12:30",
            "timezone_original": "Asia/Kolkata",
            "timezone_basis": "bank export header",
            "sender_account": "+919123456789",
            "sender_vpa": "victim@okhdfcbank",
            "receiver_account": "ACC-MULE-A",
            "receiver_vpa": "mule.a@fakeupi",
            "amount": "40000.00",
            "currency": "INR",
            "txn_type": "UPI_DEBIT",
            "status": "SUCCESS",
            "reference_no": "RRN-44110033"
        },
        # Storyline: Burst Payment 3 - FAILED
        {
            "txn_id": "UPI-246",
            "timestamp_original": "2026-09-30 14:14:00",
            "timezone_original": "Asia/Kolkata",
            "timezone_basis": "bank export header",
            "sender_account": "+919123456789",
            "sender_vpa": "victim@okhdfcbank",
            "receiver_account": "ACC-MULE-A",
            "receiver_vpa": "mule.a@fakeupi",
            "amount": "10000.00",
            "currency": "INR",
            "txn_type": "UPI_DEBIT",
            "status": "FAILED",
            "reference_no": "RRN-44110044"
        },
        # Storyline: Burst Payment 4 - RETRIED & SUCCESS
        {
            "txn_id": "UPI-247",
            "timestamp_original": "2026-09-30 14:15:30",
            "timezone_original": "Asia/Kolkata",
            "timezone_basis": "bank export header",
            "sender_account": "+919123456789",
            "sender_vpa": "victim@okhdfcbank",
            "receiver_account": "ACC-MULE-A",
            "receiver_vpa": "mule.a@fakeupi",
            "amount": "10000.00",
            "currency": "INR",
            "txn_type": "UPI_DEBIT",
            "status": "SUCCESS",
            "reference_no": "RRN-44110055"
        },
        # Mule Hop 1: Mule A -> Mule B
        {
            "txn_id": "UPI-250",
            "timestamp_original": "2026-09-30 14:17:00",
            "timezone_original": "Asia/Kolkata",
            "timezone_basis": "bank export header",
            "sender_account": "ACC-MULE-A",
            "sender_vpa": "mule.a@fakeupi",
            "receiver_account": "ACC-MULE-B",
            "receiver_vpa": "mule.b@fakeupi",
            "amount": "20000.00",
            "currency": "INR",
            "txn_type": "UPI_TRANSFER",
            "status": "SUCCESS",
            "reference_no": "RRN-55220011"
        },
        # Mule Hop 2: Mule B -> Mule C
        {
            "txn_id": "UPI-255",
            "timestamp_original": "2026-09-30 14:21:00",
            "timezone_original": "Asia/Kolkata",
            "timezone_basis": "bank export header",
            "sender_account": "ACC-MULE-B",
            "sender_vpa": "mule.b@fakeupi",
            "receiver_account": "ACC-MULE-C",
            "receiver_vpa": "mule.c@fakeupi",
            "amount": "18000.00",
            "currency": "INR",
            "txn_type": "UPI_TRANSFER",
            "status": "SUCCESS",
            "reference_no": "RRN-66330022"
        }
    ]

    with open(bank_statement_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(bank_rows[0].keys()))
        writer.writeheader()
        writer.writerows(bank_rows)

    # 3. Ground Truth JSON
    ground_truth = {
        "case_id": "CASE-DT-2026-001",
        "case_name": "Operation Digital Arrest",
        "victim": {
            "name": "Ramesh Kumar (Fictional)",
            "phone": "+919123456789",
            "vpa": "victim@okhdfcbank"
        },
        "fraudster": {
            "phone": "+919876543210"
        },
        "mule_network": [
            {"tier": 1, "vpa": "mule.a@fakeupi", "account": "ACC-MULE-A"},
            {"tier": 2, "vpa": "mule.b@fakeupi", "account": "ACC-MULE-B"},
            {"tier": 3, "vpa": "mule.c@fakeupi", "account": "ACC-MULE-C"}
        ],
        "planted_traps": [
            {
                "trap_id": "TRAP-TIMEZONE-01",
                "description": "CALL-190 (UTC report header) vs UPI-236 (IST bank export)",
                "apparent_order_in_raw_strings": "UPI-236 is 3 minutes after CALL-190",
                "ground_truth_order_in_utc": "UPI-236 occurred 5 hours 27 minutes BEFORE CALL-190",
                "call_utc": "2026-09-30T14:05:00Z",
                "upi_utc": "2026-09-30T08:38:00Z",
                "expected_claim_status": "CONTRADICTED"
            },
            {
                "trap_id": "CONTROL-TIMEZONE-01",
                "description": "CALL-182 (IST device setting) vs UPI-241 (IST bank export)",
                "call_utc": "2026-09-30T08:35:00Z",
                "upi_utc": "2026-09-30T08:38:12Z",
                "utc_delta_seconds": 192,
                "expected_claim_status": "VERIFIED"
            }
        ],
        "anomalies": [
            {"type": "TRANSACTION_BURST", "window_minutes": 15, "txns": ["UPI-241", "UPI-244", "UPI-247"]},
            {"type": "FAILED_THEN_RETRIED", "failed": "UPI-246", "retried_success": "UPI-247"}
        ]
    }

    gt_file = output_dir / "ground_truth.json"
    with open(gt_file, "w", encoding="utf-8") as f:
        json.dump(ground_truth, f, indent=2)

    return {
        "call_logs_file": str(call_logs_file),
        "bank_statement_file": str(bank_statement_file),
        "ground_truth_file": str(gt_file)
    }

if __name__ == "__main__":
    out = Path(__file__).resolve().parent
    res = generate_synthetic_case(out)
    print("Synthetic case generated successfully:")
    for k, v in res.items():
        print(f"  {k}: {v}")
