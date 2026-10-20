import re
from typing import Optional

RE_DIGITS = re.compile(r"\D")

def normalize_phone_number(raw_phone: Optional[str]) -> str:
    """
    E.164 standardization for phone numbers.
    Normalizes local Indian variants (10 digits, leading 0, 91 prefix) into +91XXXXXXXXXX.
    Preserves valid international E.164 numbers.
    """
    if not raw_phone:
        return "UNKNOWN"

    cleaned = raw_phone.strip()
    if not cleaned:
        return "UNKNOWN"

    has_plus = cleaned.startswith("+")
    digits_only = RE_DIGITS.sub("", cleaned)

    if not digits_only:
        return cleaned

    # Indian 10-digit mobile number
    if len(digits_only) == 10:
        return f"+91{digits_only}"

    # Indian number with leading 0 (STD code style: 09876543210)
    if len(digits_only) == 11 and digits_only.startswith("0"):
        return f"+91{digits_only[1:]}"

    # Indian number with 91 prefix without plus (919876543210)
    if len(digits_only) == 12 and digits_only.startswith("91"):
        return f"+{digits_only}"

    # Standard international with existing plus
    if has_plus:
        return f"+{digits_only}"

    return digits_only

def normalize_vpa(raw_vpa: Optional[str]) -> str:
    """Normalizes UPI Virtual Payment Address (e.g. Mule.A@FakeUPI -> mule.a@fakeupi)."""
    if not raw_vpa:
        return "UNKNOWN"
    return raw_vpa.strip().lower()

def normalize_account_number(raw_account: Optional[str]) -> str:
    """Normalizes bank account number by stripping spacing/formatting."""
    if not raw_account:
        return "UNKNOWN"
    return re.sub(r"[\s\-_]", "", raw_account.strip()).upper()

def normalize_entity_identifier(raw_identifier: Optional[str]) -> str:
    """
    Auto-detects identifier type and applies appropriate normalization.
    """
    if not raw_identifier:
        return "UNKNOWN"
    cleaned = raw_identifier.strip()
    if "@" in cleaned:
        return normalize_vpa(cleaned)
    # Check if mostly numeric phone number
    digits = RE_DIGITS.sub("", cleaned)
    if len(digits) >= 10 and (len(digits) / len(cleaned)) > 0.7:
        return normalize_phone_number(cleaned)
    return normalize_account_number(cleaned)
