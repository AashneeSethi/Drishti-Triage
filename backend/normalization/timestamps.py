import re
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Union, Optional, Tuple, NamedTuple

class NormalizedTimestamp(NamedTuple):
    timestamp_utc: str          # Formatted as YYYY-MM-DDTHH:MM:SSZ
    timestamp_original: str     # Raw string representation
    timezone_original: str      # Timezone name or offset
    timezone_basis: str         # "timestamp offset" | "metadata header" | "case default" | "epoch" | "assumed"
    is_assumed: bool            # True if no basis was found and UTC was defaulted

# Common datetime regex patterns
RE_EPOCH = re.compile(r"^\d{10,16}$")
RE_ISO_OFFSET = re.compile(r"([+-]\d{2}:?\d{2}|Z)$")

DATETIME_FORMATS = [
    # ISO formats
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S.%f",
    "%Y-%m-%dT%H:%M:%S.%f",
    # Indian / Commonwealth: DD/MM/YYYY
    "%d/%m/%Y %H:%M:%S",
    "%d-%m-%Y %H:%M:%S",
    "%d/%m/%Y %I:%M:%S %p",
    "%d-%m-%Y %I:%M:%S %p",
    "%d/%m/%Y %H:%M",
    "%d-%m-%Y %H:%M",
    "%d/%m/%Y %I:%M %p",
    "%d-%m-%Y %I:%M %p",
    # US formats: MM/DD/YYYY
    "%m/%d/%Y %H:%M:%S",
    "%m-%d-%Y %H:%M:%S",
    "%m/%d/%Y %I:%M:%S %p",
    "%m-%d-%Y %I:%M:%S %p",
    # Date only
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%m/%d/%Y",
]

def parse_timezone(tz_name: Optional[str]) -> Optional[ZoneInfo]:
    """Safely loads a ZoneInfo object, mapping common aliases."""
    if not tz_name:
        return None
    cleaned = tz_name.strip()
    alias_map = {
        "IST": "Asia/Kolkata",
        "UTC": "UTC",
        "GMT": "UTC",
        "Z": "UTC",
        "Asia/Calcutta": "Asia/Kolkata"
    }
    canonical = alias_map.get(cleaned, cleaned)
    try:
        return ZoneInfo(canonical)
    except Exception:
        return None

def normalize_timestamp(
    raw_val: Union[str, int, float],
    declared_timezone: Optional[str] = None,
    timezone_basis: Optional[str] = None,
    case_default_timezone: str = "Asia/Kolkata"
) -> NormalizedTimestamp:
    """
    Universal Multi-Dialect Timestamp Normalizer.
    Converts any timestamp to canonical ISO 8601 UTC while tracking the exact timezone basis.
    
    4-Tier Timezone Resolution:
    1. String Offset: Timestamp has explicit offset (+05:30, Z) -> "timestamp offset"
    2. Declared Header: File/Report header defines timezone -> "metadata header"
    3. Case Default: Case configuration defines timezone -> "case default"
    4. Fallback: Assumed UTC -> "assumed" (Triggers anomaly flag)
    """
    raw_str = str(raw_val).strip()

    # Case 1: Epoch Timestamp (10-digit sec, 13-digit ms, 16-digit us)
    if RE_EPOCH.match(raw_str):
        epoch_num = int(raw_str)
        if len(raw_str) >= 16:
            dt_utc = datetime.fromtimestamp(epoch_num / 1_000_000.0, tz=timezone.utc)
        elif len(raw_str) >= 13:
            dt_utc = datetime.fromtimestamp(epoch_num / 1000.0, tz=timezone.utc)
        else:
            dt_utc = datetime.fromtimestamp(epoch_num, tz=timezone.utc)
        
        utc_iso = dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        return NormalizedTimestamp(
            timestamp_utc=utc_iso,
            timestamp_original=raw_str,
            timezone_original="UTC",
            timezone_basis="epoch",
            is_assumed=False
        )

    # Case 2: ISO string with explicit timezone offset (+05:30, Z, etc.)
    offset_match = RE_ISO_OFFSET.search(raw_str)
    if offset_match:
        try:
            # Python 3.11+ datetime.fromisoformat handles offsets like +05:30 and Z
            clean_iso = raw_str.replace("Z", "+00:00")
            dt_aware = datetime.fromisoformat(clean_iso)
            dt_utc = dt_aware.astimezone(timezone.utc)
            utc_iso = dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
            return NormalizedTimestamp(
                timestamp_utc=utc_iso,
                timestamp_original=raw_str,
                timezone_original=offset_match.group(1),
                timezone_basis=timezone_basis or "timestamp offset",
                is_assumed=False
            )
        except Exception:
            pass

    # Case 3: Parse formatted string into naive datetime
    dt_naive = None
    for fmt in DATETIME_FORMATS:
        try:
            dt_naive = datetime.strptime(raw_str, fmt)
            break
        except ValueError:
            continue

    if dt_naive is None:
        raise ValueError(f"Unable to parse timestamp format: '{raw_str}'")

    # Resolve timezone using 4-tier hierarchy
    resolved_tz = None
    final_basis = ""
    is_assumed = False

    if declared_timezone:
        resolved_tz = parse_timezone(declared_timezone)
        if resolved_tz:
            final_basis = timezone_basis or "metadata header"

    if not resolved_tz and case_default_timezone:
        resolved_tz = parse_timezone(case_default_timezone)
        if resolved_tz:
            final_basis = "case default"

    if not resolved_tz:
        resolved_tz = ZoneInfo("UTC")
        final_basis = "assumed"
        is_assumed = True

    # Convert naive datetime in resolved_tz to UTC
    dt_aware = dt_naive.replace(tzinfo=resolved_tz)
    dt_utc = dt_aware.astimezone(timezone.utc)
    utc_iso = dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    return NormalizedTimestamp(
        timestamp_utc=utc_iso,
        timestamp_original=raw_str,
        timezone_original=str(resolved_tz),
        timezone_basis=final_basis,
        is_assumed=is_assumed
    )
