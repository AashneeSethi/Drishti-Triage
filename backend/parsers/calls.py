import csv
import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Union

from backend.parsers.base import BaseParser
from backend.parsers.aliases import CALL_LOG_ALIASES, map_columns, score_match
from backend.normalization.schema import UnifiedEvent, Locator
from backend.normalization.timestamps import normalize_timestamp
from backend.normalization.entities import normalize_phone_number

class CallLogCSVParser(BaseParser):
    """
    Adaptive Parser for Android & Forensic Call Log Exports (Cellebrite, Oxygen, Android CSV dumps).
    Handles arbitrary column variations via alias matching while maintaining strict 1-indexed row locators.
    """
    source_type = "call"

    REQUIRED_FIELDS = ["caller", "timestamp"]
    OPTIONAL_FIELDS = ["receiver", "duration", "direction", "call_id", "timezone", "timezone_basis"]

    def can_parse(
        self,
        headers: List[str],
        sample_rows: List[Dict[str, str]]
    ) -> Tuple[bool, float, Dict[str, str]]:
        mapping = map_columns(headers, CALL_LOG_ALIASES)
        confidence = score_match(mapping, self.REQUIRED_FIELDS, self.OPTIONAL_FIELDS)
        return (confidence >= 0.60), confidence, mapping

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
        mapping = map_columns(headers, CALL_LOG_ALIASES)
        if column_overrides:
            mapping.update(column_overrides)

        col_caller = mapping.get("caller")
        col_receiver = mapping.get("receiver")
        col_timestamp = mapping.get("timestamp")
        col_duration = mapping.get("duration")
        col_direction = mapping.get("direction")
        col_call_id = mapping.get("call_id")
        col_tz = mapping.get("timezone")
        col_tz_basis = mapping.get("timezone_basis")

        if not col_caller or not col_timestamp:
            raise ValueError(
                f"Cannot parse call log {path.name}: Missing required caller or timestamp columns. "
                f"Detected headers: {headers}"
            )

        events: List[UnifiedEvent] = []

        with open(path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f, delimiter=delimiter)
            for row_dict in reader:
                line_num = reader.line_num  # 1-indexed row number in the file

                raw_ts = row_dict.get(col_timestamp, "").strip()
                if not raw_ts:
                    continue

                raw_caller = row_dict.get(col_caller, "").strip()
                raw_receiver = row_dict.get(col_receiver, "").strip() if col_receiver else ""
                raw_duration = row_dict.get(col_duration, "").strip() if col_duration else "0"
                raw_direction = row_dict.get(col_direction, "INCOMING").strip().upper() if col_direction else "INCOMING"
                raw_call_id = row_dict.get(col_call_id, "").strip() if col_call_id else ""

                declared_tz = row_dict.get(col_tz, "").strip() if col_tz else None
                tz_basis = row_dict.get(col_tz_basis, "").strip() if col_tz_basis else None

                # Normalize timestamp to UTC
                ts_norm = normalize_timestamp(
                    raw_val=raw_ts,
                    declared_timezone=declared_tz or None,
                    timezone_basis=tz_basis or ("report header" if declared_tz else None),
                    case_default_timezone=case_default_timezone
                )

                # Normalize phone numbers
                actor = normalize_phone_number(raw_caller)
                target = normalize_phone_number(raw_receiver) if raw_receiver else "UNKNOWN"

                # Standardize event_id
                event_id = raw_call_id if raw_call_id else f"CALL-{line_num:03d}"

                # Standardize status/action
                status = "SUCCESS"
                if "MISSED" in raw_direction or "REJECTED" in raw_direction:
                    status = "MISSED"
                elif "OUTGOING" in raw_direction:
                    status = "OUTGOING"
                else:
                    status = "INCOMING"

                # Duration parsing
                try:
                    duration_sec = int(re.sub(r"\D", "", raw_duration)) if raw_duration else 0
                except Exception:
                    duration_sec = 0

                event = UnifiedEvent(
                    event_id=event_id,
                    case_id=case_id,
                    artifact_id=artifact_id,
                    source_type="call",
                    timestamp_utc=ts_norm.timestamp_utc,
                    timestamp_original=ts_norm.timestamp_original,
                    timezone_original=ts_norm.timezone_original,
                    timezone_basis=ts_norm.timezone_basis,
                    actor=actor,
                    target=target,
                    action="CALL",
                    amount=None,
                    currency=None,
                    status=status,
                    locator=Locator(file=path.name, row=line_num),
                    raw_details={
                        "raw_row": row_dict,
                        "duration_sec": duration_sec,
                        "direction": raw_direction,
                        "is_timezone_assumed": ts_norm.is_assumed
                    }
                )
                events.append(event)

        return events
