
from timeline.timeline import sort_events_by_utc


def test_events_are_sorted_chronologically():
    events = [
        {
            "event_id": "PAY-002",
            "timestamp_utc": "2026-09-13T08:10:00Z"
        },
        {
            "event_id": "CALL-001",
            "timestamp_utc": "2026-09-13T08:05:00Z"
        },
        {
            "event_id": "LOGIN-003",
            "timestamp_utc": "2026-09-13T08:07:00Z"
        }
    ]

    result = sort_events_by_utc(events)

    assert [event["event_id"] for event in result] == [
        "CALL-001",
        "LOGIN-003",
        "PAY-002"
    ]


def test_mixed_timezone_events_are_sorted_correctly():
    events = [
        {
            "event_id": "CALL-001",
            "timestamp_utc": "2026-09-13T14:05:00Z"
        },
        {
            "event_id": "PAY-001",
            "timestamp_utc": "2026-09-13T08:38:00Z"
        },
        {
            "event_id": "LOGIN-001",
            "timestamp_utc": "2026-09-13T14:07:00Z"
        }
    ]

    result = sort_events_by_utc(events)

    assert [event["event_id"] for event in result] == [
        "PAY-001",
        "CALL-001",
        "LOGIN-001"
    ]


import pytest


def test_missing_timestamp_raises_error():
    events = [
        {
            "event_id": "CALL-001",
            "timestamp_utc": "2026-09-13T08:05:00Z"
        },
        {
            "event_id": "PAY-001"
        }
    ]

    with pytest.raises(ValueError, match="Missing timestamp_utc"):
        sort_events_by_utc(events)


def test_timestamp_without_timezone_raises_error():
    events = [
        {
            "event_id": "CALL-001",
            "timestamp_utc": "2026-09-13T08:05:00"
        }
    ]

    with pytest.raises(ValueError, match="must include a timezone"):
        sort_events_by_utc(events)
