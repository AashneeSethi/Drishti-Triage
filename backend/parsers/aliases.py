import re
from typing import List, Dict, Tuple

def clean_column_name(col: str) -> str:
    """Cleans a column header: lowercases, removes non-alphanumeric chars, replaces spaces with underscores."""
    col_clean = re.sub(r"[^\w\s]", "", col.lower())
    return re.sub(r"\s+", "_", col_clean.strip())

# Comprehensive Alias Dictionaries for Real-World Forensic Evidence Sources

CALL_LOG_ALIASES = {
    "caller": [
        "caller", "calling_number", "from", "source", "sender", "caller_number",
        "originating_address", "phone_number", "calling_party", "source_number", "calling_no"
    ],
    "receiver": [
        "receiver", "receiving_number", "to", "destination", "target", "receiver_number",
        "callee", "destination_address", "called_party", "dialed_number", "receiving_no"
    ],
    "timestamp": [
        "timestamp", "timestamp_original", "time_stamp", "date", "call_date", "datetime", "time", "call_time",
        "start_time", "date_time", "call_timestamp", "initiated_at"
    ],
    "duration": [
        "duration", "duration_sec", "call_duration", "duration_seconds", "secs", "len",
        "duration_s", "call_length", "length_seconds"
    ],
    "direction": [
        "direction", "call_type", "type", "traffic_type", "in_out", "mode", "call_direction"
    ],
    "call_id": [
        "call_id", "id", "record_id", "call_no", "log_id"
    ],
    "timezone": [
        "timezone", "tz", "timezone_original", "tz_name"
    ],
    "timezone_basis": [
        "timezone_basis", "tz_basis", "basis"
    ]
}

BANK_STATEMENT_ALIASES = {
    "txn_id": [
        "txn_id", "transaction_id", "ref_no", "reference_no", "rrn", "utr",
        "cheque_no", "journal_no", "trans_id", "reference", "chqrefno", "tran_id"
    ],
    "timestamp": [
        "timestamp", "timestamp_original", "time_stamp", "txn_date", "transaction_date",
        "date", "datetime", "value_date", "posting_date", "trans_date", "transaction_timestamp", "date_time"
    ],
    "amount": [
        "amount", "txn_amount", "trans_amount", "transaction_amount", "amount_inr",
        "txn_val", "value"
    ],
    "debit": [
        "debit", "dr", "withdrawal", "withdrawal_amt", "dr_amount", "debit_amount"
    ],
    "credit": [
        "credit", "cr", "deposit", "deposit_amt", "cr_amount", "credit_amount"
    ],
    "sender": [
        "sender_vpa", "payer_vpa", "sender", "sender_account", "remitter_account", "from_account",
        "remitter", "payer", "source_account", "from"
    ],
    "receiver": [
        "receiver_vpa", "payee_vpa", "receiver", "receiver_account", "beneficiary_account", "to_account",
        "beneficiary", "payee", "target_account", "to", "narration", "description"
    ],
    "status": [
        "status", "txn_status", "result", "state", "transaction_status"
    ],
    "type": [
        "type", "txn_type", "transaction_type", "payment_mode", "mode", "channel"
    ],
    "timezone": [
        "timezone", "tz", "timezone_original", "tz_name"
    ],
    "timezone_basis": [
        "timezone_basis", "tz_basis", "basis"
    ]
}

def map_columns(headers: List[str], alias_dict: Dict[str, List[str]]) -> Dict[str, str]:
    """
    Matches actual file headers to canonical field names using alias lists.
    Returns: { canonical_field_name: actual_header_name }
    """
    mapped = {}
    cleaned_header_map = {clean_column_name(h): h for h in headers}

    for canonical, aliases in alias_dict.items():
        # First check exact canonical match
        if canonical in cleaned_header_map:
            mapped[canonical] = cleaned_header_map[canonical]
            continue

        # Check aliases
        for alias in aliases:
            cleaned_alias = clean_column_name(alias)
            if cleaned_alias in cleaned_header_map:
                mapped[canonical] = cleaned_header_map[cleaned_alias]
                break

    return mapped

def score_match(mapped: Dict[str, str], required_fields: List[str], optional_fields: List[str]) -> float:
    """
    Calculates a confidence score between 0.0 and 1.0 indicating how well
    the file headers match the expected schema for a parser plugin.
    """
    req_matched = sum(1 for f in required_fields if f in mapped)
    opt_matched = sum(1 for f in optional_fields if f in mapped)

    if not required_fields:
        return 0.0

    req_score = req_matched / len(required_fields)
    opt_score = (opt_matched / len(optional_fields)) if optional_fields else 0.0

    # 70% weight on required fields, 30% on optional fields
    return round((0.7 * req_score) + (0.3 * opt_score), 2)
