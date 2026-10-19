import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from pydantic import BaseModel, Field

class CustodyRecord(BaseModel):
    record_id: str
    case_id: str
    artifact_id: str
    filename: str
    file_sha256: str
    file_size_bytes: int
    timestamp_ingested_utc: str
    prev_record_hash: str
    record_hash: str

def compute_record_hash(
    prev_record_hash: str,
    record_id: str,
    case_id: str,
    artifact_id: str,
    filename: str,
    file_sha256: str,
    file_size_bytes: int,
    timestamp_ingested_utc: str
) -> str:
    payload = f"{prev_record_hash}|{record_id}|{case_id}|{artifact_id}|{filename}|{file_sha256}|{file_size_bytes}|{timestamp_ingested_utc}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest().lower()

class CustodyLedger:
    """
    Cryptographic Hash-Chained Custody Ledger.
    Ensures mathematical proof of append-only audit trail without blockchain overhead.
    """
    GENESIS_HASH: str = "0" * 64

    def __init__(self, ledger_path: Optional[Path] = None):
        self.ledger_path = Path(ledger_path) if ledger_path else None
        self.records: List[CustodyRecord] = []
        if self.ledger_path and self.ledger_path.exists():
            self.load()

    def load(self) -> None:
        if not self.ledger_path or not self.ledger_path.exists():
            return
        with open(self.ledger_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            self.records = [CustodyRecord(**item) for item in data]

    def save(self) -> None:
        if not self.ledger_path:
            return
        self.ledger_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.ledger_path, "w", encoding="utf-8") as f:
            json.dump([r.model_dump() for r in self.records], f, indent=2)

    def append(
        self,
        case_id: str,
        artifact_id: str,
        filename: str,
        file_sha256: str,
        file_size_bytes: int,
        timestamp_utc: Optional[str] = None
    ) -> CustodyRecord:
        record_num = len(self.records) + 1
        record_id = f"REC-{record_num:03d}"
        
        prev_hash = self.records[-1].record_hash if self.records else self.GENESIS_HASH
        timestamp_ingested_utc = timestamp_utc or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        rec_hash = compute_record_hash(
            prev_record_hash=prev_hash,
            record_id=record_id,
            case_id=case_id,
            artifact_id=artifact_id,
            filename=filename,
            file_sha256=file_sha256,
            file_size_bytes=file_size_bytes,
            timestamp_ingested_utc=timestamp_ingested_utc
        )

        record = CustodyRecord(
            record_id=record_id,
            case_id=case_id,
            artifact_id=artifact_id,
            filename=filename,
            file_sha256=file_sha256,
            file_size_bytes=file_size_bytes,
            timestamp_ingested_utc=timestamp_ingested_utc,
            prev_record_hash=prev_hash,
            record_hash=rec_hash
        )
        self.records.append(record)
        self.save()
        return record

    def verify_chain(self) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Recomputes the entire hash chain from genesis to the latest record.
        Returns (is_valid, issues_list).
        """
        issues = []
        expected_prev = self.GENESIS_HASH

        for idx, rec in enumerate(self.records):
            # Check 1: prev_record_hash linkage
            if rec.prev_record_hash != expected_prev:
                issues.append({
                    "record_id": rec.record_id,
                    "index": idx,
                    "error": "PREV_HASH_MISMATCH",
                    "expected_prev": expected_prev,
                    "found_prev": rec.prev_record_hash
                })

            # Check 2: record hash integrity
            recomputed = compute_record_hash(
                prev_record_hash=rec.prev_record_hash,
                record_id=rec.record_id,
                case_id=rec.case_id,
                artifact_id=rec.artifact_id,
                filename=rec.filename,
                file_sha256=rec.file_sha256,
                file_size_bytes=rec.file_size_bytes,
                timestamp_ingested_utc=rec.timestamp_ingested_utc
            )
            if recomputed != rec.record_hash:
                issues.append({
                    "record_id": rec.record_id,
                    "index": idx,
                    "error": "RECORD_HASH_TAMPERED",
                    "expected_hash": recomputed,
                    "recorded_hash": rec.record_hash
                })

            expected_prev = rec.record_hash

        is_valid = len(issues) == 0
        return is_valid, issues
