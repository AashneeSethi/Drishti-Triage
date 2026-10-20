

from verify import (
    verify_claim,
    verify_temporal_order,
    VERIFIED,
    INFERRED,
    CONTRADICTED,
    NOT_FOUND,
)



def sample_event():
    return {
        "event_id": "TX-101",
        "action": "TRANSFER",
        "actor": "ACC-A",
        "target": "ACC-B",
        "amount": 10000,
        "status": "SUCCESS",
    }


def test_matching_successful_transfer_is_verified():
    claim = {
        "claim_type": "TRANSFER",
        "actor": "ACC-A",
        "target": "ACC-B",
        "amount": 10000,
    }

    result = verify_claim(claim, [sample_event()])

    assert result["status"] == VERIFIED
    assert result["matched_event_ids"] == ["TX-101"]


def test_different_amount_is_contradicted():
    claim = {
        "claim_type": "TRANSFER",
        "actor": "ACC-A",
        "target": "ACC-B",
        "amount": 15000,
    }

    result = verify_claim(claim, [sample_event()])

    assert result["status"] == CONTRADICTED


def test_missing_event_is_not_found():
    claim = {
        "claim_type": "TRANSFER",
        "actor": "ACC-X",
        "target": "ACC-Y",
        "amount": 5000,
    }

    result = verify_claim(claim, [sample_event()])

    assert result["status"] == NOT_FOUND


def test_causal_claim_requires_human_review():
    claim = {
        "claim_type": "TRANSFER",
        "actor": "ACC-A",
        "target": "ACC-B",
        "amount": 10000,
        "is_causal": True,
    }

    result = verify_claim(claim, [sample_event()])

    assert result["status"] == INFERRED


def test_temporal_order_verified_using_utc():
    event_a = {
        "event_id": "CALL-190",
        "timestamp_utc": "2026-09-30T08:00:00Z",
    }
    event_b = {
        "event_id": "UPI-236",
        "timestamp_utc": "2026-09-30T08:38:00Z",
    }

    result = verify_temporal_order(event_a, event_b)

    assert result["status"] == VERIFIED
    assert result["delta_seconds"] == 2280


def test_temporal_order_contradicted_using_utc():
    event_a = {
        "event_id": "CALL-190",
        "timestamp_utc": "2026-09-30T14:05:00Z",
    }
    event_b = {
        "event_id": "UPI-236",
        "timestamp_utc": "2026-09-30T08:38:00Z",
    }

    result = verify_temporal_order(event_a, event_b)

    assert result["status"] == CONTRADICTED
    assert result["delta_seconds"] == -19620


def test_temporal_order_with_missing_timestamp_requires_review():
    event_a = {
        "event_id": "CALL-190",
        "timestamp_utc": None,
    }
    event_b = {
        "event_id": "UPI-236",
        "timestamp_utc": "2026-09-30T08:38:00Z",
    }

    result = verify_temporal_order(event_a, event_b)

    assert result["status"] == INFERRED

