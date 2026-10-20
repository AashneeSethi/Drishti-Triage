

import pytest
from pipeline import analyze_case


def test_pipeline_processes_events_and_claims():
    events = [
        {
            "event_id": "TX-2",
            "timestamp_utc": "2026-09-30T08:10:00Z",
            "actor": "ACC-B",
            "target": "ACC-C",
            "action": "TRANSFER",
            "status": "SUCCESS",
            "amount": 9500.0,
            "locator": {"file": "bank.csv", "row": 2},
        },
        {
            "event_id": "TX-1",
            "timestamp_utc": "2026-09-30T08:00:00Z",
            "actor": "ACC-A",
            "target": "ACC-B",
            "action": "TRANSFER",
            "status": "SUCCESS",
            "amount": 10000.0,
            "locator": {"file": "bank.csv", "row": 1},
        },
    ]

    claims = [
        {
            "claim_type": "TRANSFER",
            "actor": "ACC-A",
            "target": "ACC-B",
            "amount": 10000.0,
        }
    ]

    result = analyze_case(events, claims)

    assert result["event_count"] == 2
    assert result["timeline"][0]["event_id"] == "TX-1"
    assert result["timeline"][1]["event_id"] == "TX-2"
    assert result["graph"].has_node("TX-1")
    assert result["graph"].has_node("ACC-A")
    assert result["claim_count"] == 1
    assert result["claim_results"][0]["result"]["status"] == "VERIFIED"


def test_pipeline_handles_empty_evidence():
    result = analyze_case([])

    assert result["event_count"] == 0
    assert result["anomaly_count"] == 0
    assert result["claim_count"] == 0
    assert result["timeline"] == []



def test_pipeline_rejects_event_with_missing_timestamp():
    events = [
        {
            "event_id": "TX-BAD",
            "actor": "ACC-A",
            "target": "ACC-B",
            "action": "TRANSFER",
            "status": "SUCCESS",
            "amount": 1000.0,
        }
    ]

    with pytest.raises(ValueError, match="Missing timestamp_utc"):
        analyze_case(events)