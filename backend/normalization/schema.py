from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class Locator(BaseModel):
    """Pinpoints the exact source record in an evidence artifact."""
    file: str = Field(..., description="Original evidence filename")
    row: int = Field(..., description="1-indexed row number in the file")

class UnifiedEvent(BaseModel):
    """
    Fixed schema contract for all normalized forensic events (Section 5).
    Guarantees who, what, when (original + UTC + basis), source, artifact,
    and exact locator inside the artifact.
    """
    event_id: str = Field(..., description="Unique event identifier")
    case_id: str = Field(..., description="Parent case identifier")
    artifact_id: str = Field(..., description="Evidence artifact ID (e.g. ART-001)")
    source_type: Literal["call", "upi", "whatsapp", "evtx", "media", "generic"] = Field(
        ..., description="Type of evidence source"
    )
    timestamp_utc: str = Field(..., description="ISO 8601 UTC timestamp: YYYY-MM-DDTHH:MM:SSZ")
    timestamp_original: str = Field(..., description="Raw timestamp string as found in source")
    timezone_original: str = Field(..., description="Timezone name or offset of the source")
    timezone_basis: str = Field(
        ..., description="Reason for timezone determination (header, device setting, case default, assumed)"
    )
    actor: str = Field(..., description="Subject or initiator (normalized phone, account, VPA, entity)")
    target: str = Field(..., description="Receiver or destination entity")
    action: str = Field(..., description="Action performed: CALL, TRANSFER, MESSAGE, etc.")
    amount: Optional[float] = Field(None, description="Monetary amount if applicable")
    currency: Optional[str] = Field("INR", description="Currency code (e.g. INR)")
    status: str = Field("SUCCESS", description="Event status: SUCCESS, FAILED, MISSED, etc.")
    locator: Locator = Field(..., description="Exact file and 1-indexed row locator")
    raw_details: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Original unparsed fields and metadata"
    )
