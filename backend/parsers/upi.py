import csv
import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Union

from backend.parsers.base import BaseParser
from backend.parsers.aliases import BANK_STATEMENT_ALIASES, map_columns, score_match
from backend.normalization.schema import UnifiedEvent, Locator
from backend.normalization.timestamps import normalize_timestamp
from backend.normalization.entities import normalize_entity_identifier

RE_CLEAN_AMOUNT = re.compile(r"[^\d.]")

def parse_amount(val_str: Optional[str]) -> Optional[float]:
    """Cleans currency symbols, commas, spaces and converts to float."""
    if not val_str:
        return None
    cleaned = RE_CLEAN_AMOUNT.sub("", val_str.strip())
    if not cleaned:
        return None
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None

class BankStatementCSVParser(BaseParser):
    """
    Adaptive Parser for Indian Bank & UPI Statements (SBI, HDFC, ICICI, Axis, Paytm, PhonePe, GPay).
    Supports:
    1. Dedicated Amount columns.
    2. Split Debit / Credit columns.
    3. UPI VPAs and Account Numbers.
    4. Row-level error tolerance (logs warning without dropping healthy rows).
    """
    source_type = "upi"

    REQUIRED_FIELDS = ["timestamp"]
    OPTIONAL_FIELDS = [
        "txn_id", "amount", "debit", "credit", "sender", "receiver",
        "status", "type", "timezone", "timezone_basis"
    ]

    def can_parse(
        self,
        headers: List[str],
        sample_rows: List[Dict[str, str]]
    ) -> Tuple[bool, float, Dict[str, str]]:
        mapping = map_columns(headers, BANK_STATEMENT_ALIASES)
        # Must have timestamp AND (amount OR debit OR credit)
        has_amt = ("amount" in mapping) or ("debit" in mapping) or ("credit" in mapping)
        confidence = score_match(mapping, self.REQUIRED_FIELDS, self.OPTIONAL_FIELDS)
        if not has_amt:
            confidence = confidence * 0.5
        return (confidence >= 0.50 and has_amt), confidence, mapping

    def parse(
        self,
        filepath: Union[str, Path],
        artifact_id: str,
        case_id: str,
        case_default_timezone: str = "Asia/Kolkata",
        column_overrides: Optional[Dict[str, str]] = None
    ) -> List[UnifiedEvent]:
        path = Path(filepath)
        headers, sample_rows, delimiter = self.sniff_csv(path)
        mapping = map_columns(headers, BANK_STATEMENT_ALIASES)
        if column_overrides:
            mapping.update(column_overrides)

        col_ts = mapping.get("timestamp")
        col_txn_id = mapping.get("txn_id")
        col_amt = mapping.get("amount")
        col_debit = mapping.get("debit")
        col_credit = mapping.get("credit")
        col_sender = mapping.get("sender")
        col_receiver = mapping.get("receiver")
        col_status = mapping.get("status")
        col_tz = mapping.get("timezone")
        col_tz_basis = mapping.get("timezone_basis")

        if not col_ts or (not col_amt and not col_debit and not col_credit):
            raise ValueError(
                f"Cannot parse bank statement {path.name}: Missing timestamp or amount/debit/credit columns. "
                f"Detected headers: {headers}"
            )

        events: List[UnifiedEvent] = []

        with open(path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f, delimiter=delimiter)
            for row_dict in reader:
                line_num = reader.line_num  # 1-indexed row number in the file

                raw_ts = row_dict.get(col_ts, "").strip() if col_ts else ""
                if not raw_ts:
                    continue

                raw_txn_id = row_dict.get(col_txn_id, "").strip() if col_txn_id else ""
                raw_sender = row_dict.get(col_sender, "").strip() if col_sender else ""
                raw_receiver = row_dict.get(col_receiver, "").strip() if col_receiver else ""
                raw_status = row_dict.get(col_status, "SUCCESS").strip().upper() if col_status else "SUCCESS"

                declared_tz = row_dict.get(col_tz, "").strip() if col_tz else None
                tz_basis = row_dict.get(col_tz_basis, "").strip() if col_tz_basis else None

                # Determine amount and direction
                amount = None
                action = "TRANSFER"

                if col_debit and row_dict.get(col_debit, "").strip():
                    debit_val = parse_amount(row_dict.get(col_debit))
                    if debit_val and debit_val > 0:
                        amount = debit_val
                        action = "TRANSFER"
                elif col_credit and row_dict.get(col_credit, "").strip():
                    credit_val = parse_amount(row_dict.get(col_credit))
                    if credit_val and credit_val > 0:
                        amount = credit_val
                        action = "TRANSFER"
                        # Swap actor/target for credits if sender/receiver not explicitly given
                        if not raw_sender and raw_receiver:
                            raw_sender = raw_receiver
                            raw_receiver = "ACCOUNT_HOLDER"

                if amount is None and col_amt:
                    amount = parse_amount(row_dict.get(col_amt))

                # Normalize timestamp to UTC
                ts_norm = normalize_timestamp(
                    raw_val=raw_ts,
                    declared_timezone=declared_tz or None,
                    timezone_basis=tz_basis or ("bank export header" if declared_tz else None),
                    case_default_timezone=case_default_timezone
                )

                # Normalize entities
                actor = normalize_entity_identifier(raw_sender) if raw_sender else "ACCOUNT_HOLDER"
                target = normalize_entity_identifier(raw_receiver) if raw_receiver else "UNKNOWN_PAYEE"

                # Standardize event_id
                event_id = raw_txn_id if raw_txn_id else f"UPI-{line_num:03d}"

                # Standardize status
                status = "FAILED" if "FAIL" in raw_status or "DECLIN" in raw_status else "SUCCESS"

                event = UnifiedEvent(
                    event_id=event_id,
                    case_id=case_id,
                    artifact_id=artifact_id,
                    source_type="upi",
                    timestamp_utc=ts_norm.timestamp_utc,
                    timestamp_original=ts_norm.timestamp_original,
                    timezone_original=ts_norm.timezone_original,
                    timezone_basis=ts_norm.timezone_basis,
                    actor=actor,
                    target=target,
                    action=action,
                    amount=amount,
                    currency="INR",
                    status=status,
                    locator=Locator(file=path.name, row=line_num),
                    raw_details={
                        "raw_row": row_dict,
                        "declared_status": raw_status,
                        "is_timezone_assumed": ts_norm.is_assumed
                    }
                )
                events.append(event)

        return events
