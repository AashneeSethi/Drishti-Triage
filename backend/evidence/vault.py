import os
import stat
import json
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from backend.evidence.hashing import compute_file_sha256, verify_file_integrity
from backend.evidence.custody import CustodyLedger, CustodyRecord

class EvidenceVault:
    """
    Multi-Case Evidence Vault.
    Guarantees:
    1. Read-only original preservation (chmod 444).
    2. Working analysis copies for non-destructive inspection.
    3. Immutable hash-chained custody tracking.
    4. Instant verification of bit-level tampering.
    5. Direct click-to-verify source row lookups.
    """

    def __init__(self, root_dir: str | Path = "cases"):
        self.root_dir = Path(root_dir)
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def _get_case_dir(self, case_id: str) -> Path:
        return self.root_dir / case_id

    def create_case(
        self,
        case_id: str,
        title: str = "",
        default_timezone: str = "Asia/Kolkata"
    ) -> Dict[str, Any]:
        case_dir = self._get_case_dir(case_id)
        case_dir.mkdir(parents=True, exist_ok=True)
        (case_dir / "vault" / "originals").mkdir(parents=True, exist_ok=True)
        (case_dir / "vault" / "analysis").mkdir(parents=True, exist_ok=True)

        meta_file = case_dir / "case_meta.json"
        if not meta_file.exists():
            meta = {
                "case_id": case_id,
                "title": title or f"Case {case_id}",
                "default_timezone": default_timezone,
                "created_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            with open(meta_file, "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2)
            # Initialize empty ledger
            ledger = CustodyLedger(case_dir / "custody_ledger.json")
            ledger.save()
            # Initialize empty artifact index
            with open(case_dir / "artifacts_index.json", "w", encoding="utf-8") as f:
                json.dump([], f, indent=2)
        else:
            with open(meta_file, "r", encoding="utf-8") as f:
                meta = json.load(f)
        return meta

    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        meta_file = self._get_case_dir(case_id) / "case_meta.json"
        if not meta_file.exists():
            return None
        with open(meta_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def list_cases(self) -> List[Dict[str, Any]]:
        cases = []
        for p in self.root_dir.iterdir():
            if p.is_dir() and (p / "case_meta.json").exists():
                with open(p / "case_meta.json", "r", encoding="utf-8") as f:
                    cases.append(json.load(f))
        return cases

    def get_custody_ledger(self, case_id: str) -> CustodyLedger:
        case_dir = self._get_case_dir(case_id)
        return CustodyLedger(case_dir / "custody_ledger.json")

    def _get_artifacts_index(self, case_id: str) -> List[Dict[str, Any]]:
        index_file = self._get_case_dir(case_id) / "artifacts_index.json"
        if not index_file.exists():
            return []
        with open(index_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_artifacts_index(self, case_id: str, items: List[Dict[str, Any]]) -> None:
        index_file = self._get_case_dir(case_id) / "artifacts_index.json"
        with open(index_file, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=2)

    def ingest_file(
        self,
        case_id: str,
        source_path: str | Path,
        original_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Ingests evidence into the case vault:
        1. Calculates SHA-256 hash.
        2. Assigns sequential ART-XXX ID.
        3. Saves read-only original (chmod 444).
        4. Saves analysis working copy.
        5. Appends record to the case's hash chain.
        """
        src = Path(source_path)
        if not src.is_file():
            raise FileNotFoundError(f"Source file does not exist: {source_path}")

        # Ensure case exists
        self.create_case(case_id)
        case_dir = self._get_case_dir(case_id)

        filename = original_filename or src.name
        file_sha256 = compute_file_sha256(src)
        file_size = src.stat().st_size
        ingest_time_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Determine next artifact ID
        artifacts = self._get_artifacts_index(case_id)
        next_num = len(artifacts) + 1
        artifact_id = f"ART-{next_num:03d}"

        # Target storage paths
        stored_name = f"{artifact_id}_{filename}"
        orig_target = case_dir / "vault" / "originals" / stored_name
        analysis_target = case_dir / "vault" / "analysis" / stored_name

        # If original exists, make writeable temporarily to overwrite (e.g. re-ingest)
        if orig_target.exists():
            orig_target.chmod(stat.S_IWRITE | stat.S_IREAD)

        # Copy original and set read-only (chmod 0o444: r--r--r--)
        shutil.copy2(src, orig_target)
        orig_target.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)

        # Copy analysis working copy (read/write)
        shutil.copy2(src, analysis_target)
        analysis_target.chmod(stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP)

        # Append to custody ledger
        ledger = self.get_custody_ledger(case_id)
        custody_rec = ledger.append(
            case_id=case_id,
            artifact_id=artifact_id,
            filename=filename,
            file_sha256=file_sha256,
            file_size_bytes=file_size,
            timestamp_utc=ingest_time_utc
        )

        # Record in index
        artifact_info = {
            "artifact_id": artifact_id,
            "case_id": case_id,
            "filename": filename,
            "stored_filename": stored_name,
            "file_sha256": file_sha256,
            "file_size_bytes": file_size,
            "timestamp_ingested_utc": ingest_time_utc,
            "custody_record_id": custody_rec.record_id,
            "original_path": str(orig_target),
            "analysis_path": str(analysis_target)
        }
        artifacts.append(artifact_info)
        self._save_artifacts_index(case_id, artifacts)

        return artifact_info

    def get_artifact(self, case_id: str, artifact_id: str) -> Optional[Dict[str, Any]]:
        artifacts = self._get_artifacts_index(case_id)
        for a in artifacts:
            if a["artifact_id"] == artifact_id:
                return a
        return None

    def list_artifacts(self, case_id: str) -> List[Dict[str, Any]]:
        return self._get_artifacts_index(case_id)

    def verify_case_integrity(self, case_id: str) -> Dict[str, Any]:
        """
        Complete mathematical integrity audit of the case:
        1. Validates custody ledger hash chain.
        2. Validates physical file SHA-256 hashes against ledger records.
        """
        ledger = self.get_custody_ledger(case_id)
        chain_valid, chain_issues = ledger.verify_chain()

        artifacts = self._get_artifacts_index(case_id)
        file_issues = []

        for art in artifacts:
            orig_path = Path(art["original_path"])
            if not orig_path.exists():
                file_issues.append({
                    "artifact_id": art["artifact_id"],
                    "filename": art["filename"],
                    "error": "ORIGINAL_FILE_MISSING",
                    "path": str(orig_path)
                })
                continue

            current_hash = compute_file_sha256(orig_path)
            if current_hash != art["file_sha256"]:
                file_issues.append({
                    "artifact_id": art["artifact_id"],
                    "filename": art["filename"],
                    "error": "BIT_TAMPERING_DETECTED",
                    "expected_sha256": art["file_sha256"],
                    "actual_sha256": current_hash
                })

        overall_intact = chain_valid and (len(file_issues) == 0)
        return {
            "case_id": case_id,
            "overall_intact": overall_intact,
            "chain_valid": chain_valid,
            "files_intact": len(file_issues) == 0,
            "chain_issues": chain_issues,
            "file_issues": file_issues
        }

    def get_raw_line(
        self,
        case_id: str,
        artifact_id: str,
        row_number: int,
        context_lines: int = 2
    ) -> Dict[str, Any]:
        """
        Click-to-Verify source lookup.
        Retrieves the exact 1-indexed row with surrounding context from the vault.
        """
        art = self.get_artifact(case_id, artifact_id)
        if not art:
            raise FileNotFoundError(f"Artifact {artifact_id} not found in case {case_id}")

        analysis_path = Path(art["analysis_path"])
        if not analysis_path.exists():
            raise FileNotFoundError(f"Analysis file missing: {analysis_path}")

        lines = []
        with open(analysis_path, "r", encoding="utf-8", errors="replace") as f:
            for idx, line in enumerate(f, start=1):
                lines.append((idx, line.rstrip("\r\n")))

        if row_number < 1 or row_number > len(lines):
            raise IndexError(f"Row {row_number} out of bounds (file has {len(lines)} lines)")

        target_line = lines[row_number - 1][1]
        start_idx = max(0, row_number - 1 - context_lines)
        end_idx = min(len(lines), row_number + context_lines)
        context = [{"row": l[0], "content": l[1], "is_target": (l[0] == row_number)} for l in lines[start_idx:end_idx]]

        return {
            "case_id": case_id,
            "artifact_id": artifact_id,
            "filename": art["filename"],
            "row_number": row_number,
            "target_line": target_line,
            "context": context,
            "file_sha256": art["file_sha256"]
        }

    def tamper_file_for_demo(self, case_id: str, artifact_id: str, byte_offset: int = 0) -> None:
        """
        Live demo utility (Beat 4:00-4:20):
        Flips a single byte in an original evidence file to demonstrate instantaneous tamper detection.
        """
        art = self.get_artifact(case_id, artifact_id)
        if not art:
            raise FileNotFoundError(f"Artifact {artifact_id} not found in case {case_id}")

        orig_path = Path(art["original_path"])
        orig_path.chmod(stat.S_IWRITE | stat.S_IREAD)
        with open(orig_path, "r+b") as f:
            f.seek(byte_offset)
            current_byte = f.read(1) or b"\x00"
            flipped = bytes([current_byte[0] ^ 0xFF])
            f.seek(byte_offset)
            f.write(flipped)
        orig_path.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)
