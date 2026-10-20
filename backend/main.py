import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.evidence.vault import EvidenceVault
from backend.parsers.registry import ParserRegistry
from backend.normalization.schema import UnifiedEvent

app = FastAPI(
    title="DRISHTI-triage Evidence Vault & Parsing Engine",
    description="Foundational Layer 1-3 Services: Case-Agnostic Vault, Hash-Chained Custody, Universal Timestamp Normalizer, and Adaptive Forensic Parsers.",
    version="1.2.0"
)

# Enable CORS for frontend UI (Teammate 4)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

vault = EvidenceVault(root_dir="cases")
parser_registry = ParserRegistry()

# In-memory case event store (persisted alongside case or queried dynamically)
case_events_store: Dict[str, List[UnifiedEvent]] = {}

class CreateCaseRequest(BaseModel):
    case_id: str
    title: Optional[str] = ""
    default_timezone: Optional[str] = "Asia/Kolkata"

# ----------------- CASE MANAGEMENT ----------------- #

@app.post("/api/cases", summary="Create or register a forensic case")
def create_case(req: CreateCaseRequest):
    meta = vault.create_case(
        case_id=req.case_id,
        title=req.title or "",
        default_timezone=req.default_timezone or "Asia/Kolkata"
    )
    if req.case_id not in case_events_store:
        case_events_store[req.case_id] = []
    return {"status": "success", "case": meta}

@app.get("/api/cases", summary="List all forensic cases")
def list_cases():
    return {"cases": vault.list_cases()}

@app.get("/api/cases/{case_id}", summary="Get case metadata")
def get_case(case_id: str):
    case = vault.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    return {"case": case}

# ----------------- EVIDENCE VAULT & CUSTODY ----------------- #

@app.post("/api/cases/{case_id}/evidence/upload", summary="Upload evidence file to vault")
async def upload_evidence(
    case_id: str,
    file: UploadFile = File(...)
):
    case = vault.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    # Save uploaded file to temp buffer
    temp_dir = Path("cases") / case_id / "tmp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / file.filename

    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Ingest into vault (computes SHA-256, assigns ART-XXX, writes to custody ledger)
    try:
        artifact_info = vault.ingest_file(
            case_id=case_id,
            source_path=temp_path,
            original_filename=file.filename
        )
    finally:
        if temp_path.exists():
            temp_path.unlink()

    return {
        "status": "success",
        "message": f"Evidence ingested into vault as {artifact_info['artifact_id']}",
        "artifact": artifact_info
    }

@app.get("/api/cases/{case_id}/evidence", summary="List all artifacts for a case")
def list_artifacts(case_id: str):
    return {"artifacts": vault.list_artifacts(case_id)}

@app.get("/api/cases/{case_id}/custody", summary="View hash-chained custody ledger")
def get_custody_ledger(case_id: str):
    ledger = vault.get_custody_ledger(case_id)
    is_valid, issues = ledger.verify_chain()
    return {
        "case_id": case_id,
        "is_chain_intact": is_valid,
        "total_records": len(ledger.records),
        "issues": issues,
        "records": [r.model_dump() for r in ledger.records]
    }

@app.post("/api/cases/{case_id}/verify-integrity", summary="Complete cryptographic integrity audit")
def verify_integrity(case_id: str):
    result = vault.verify_case_integrity(case_id)
    return result

@app.post("/api/cases/{case_id}/tamper-demo/{artifact_id}", summary="Simulate 1-byte file tampering for live demo")
def tamper_demo(case_id: str, artifact_id: str):
    vault.tamper_file_for_demo(case_id=case_id, artifact_id=artifact_id, byte_offset=0)
    audit = vault.verify_case_integrity(case_id)
    return {
        "status": "tampered",
        "message": f"Flipped 1 byte in {artifact_id} original evidence.",
        "post_tamper_audit": audit
    }

# ----------------- PARSING & INGESTION ----------------- #

@app.post("/api/cases/{case_id}/evidence/{artifact_id}/ingest", summary="Parse an artifact into Unified Events")
def ingest_artifact(
    case_id: str,
    artifact_id: str,
    forced_source_type: Optional[str] = Query(None)
):
    case = vault.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    art = vault.get_artifact(case_id, artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found")

    analysis_path = art["analysis_path"]
    case_tz = case.get("default_timezone", "Asia/Kolkata")

    try:
        parser, events, confidence = parser_registry.parse_file(
            filepath=analysis_path,
            artifact_id=artifact_id,
            case_id=case_id,
            case_default_timezone=case_tz,
            forced_source_type=forced_source_type
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Persist in case events
    if case_id not in case_events_store:
        case_events_store[case_id] = []

    # Replace existing events from this artifact if re-ingesting
    case_events_store[case_id] = [e for e in case_events_store[case_id] if e.artifact_id != artifact_id]
    case_events_store[case_id].extend(events)

    return {
        "status": "success",
        "artifact_id": artifact_id,
        "parser_used": parser.__class__.__name__,
        "source_type": parser.source_type,
        "confidence": confidence,
        "events_count": len(events)
    }

@app.post("/api/cases/{case_id}/ingest-all", summary="Auto-detect and ingest all artifacts in case")
def ingest_all(case_id: str):
    case = vault.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    artifacts = vault.list_artifacts(case_id)
    results = []
    case_tz = case.get("default_timezone", "Asia/Kolkata")

    if case_id not in case_events_store:
        case_events_store[case_id] = []

    for art in artifacts:
        try:
            parser, events, confidence = parser_registry.parse_file(
                filepath=art["analysis_path"],
                artifact_id=art["artifact_id"],
                case_id=case_id,
                case_default_timezone=case_tz
            )
            # Remove existing events from this artifact
            case_events_store[case_id] = [e for e in case_events_store[case_id] if e.artifact_id != art["artifact_id"]]
            case_events_store[case_id].extend(events)

            results.append({
                "artifact_id": art["artifact_id"],
                "filename": art["filename"],
                "status": "success",
                "events_count": len(events),
                "parser": parser.__class__.__name__
            })
        except Exception as e:
            results.append({
                "artifact_id": art["artifact_id"],
                "filename": art["filename"],
                "status": "error",
                "error": str(e)
            })

    total_events = len(case_events_store.get(case_id, []))
    return {"case_id": case_id, "total_events": total_events, "results": results}

@app.get("/api/cases/{case_id}/events", summary="Get all normalized unified events for a case")
def get_events(
    case_id: str,
    source_type: Optional[str] = None,
    status: Optional[str] = None
):
    events = case_events_store.get(case_id, [])
    if source_type and isinstance(source_type, str):
        events = [e for e in events if e.source_type == source_type]
    if status and isinstance(status, str):
        events = [e for e in events if e.status == status]
    return {
        "case_id": case_id,
        "total": len(events),
        "events": [e.model_dump() for e in events]
    }

# ----------------- CLICK-TO-VERIFY (GROUNDING) ----------------- #

@app.get("/api/cases/{case_id}/evidence/{artifact_id}/row/{row_number}", summary="Click-to-Verify exact source row")
def get_source_row(
    case_id: str,
    artifact_id: str,
    row_number: int,
    context_lines: int = 2
):
    try:
        data = vault.get_raw_line(
            case_id=case_id,
            artifact_id=artifact_id,
            row_number=row_number,
            context_lines=context_lines
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
