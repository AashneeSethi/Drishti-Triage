
from rules import detect_onward_money_flow


def test_two_linked_transfers_flag_possible_onward_flow():
    events = [
        {
            "event_id": "TX-1",
            "timestamp_utc": "2026-09-30T08:00:00Z",
            "actor": "ACC-A",
            "target": "ACC-B",
            "action": "TRANSFER",
            "status": "SUCCESS",
            "amount": 10000,
        },
        {
            "event_id": "TX-2",
            "timestamp_utc": "2026-09-30T08:30:00Z",
            "actor": "ACC-B",
            "target": "ACC-C",
            "action": "TRANSFER",
            "status": "SUCCESS",
            "amount": 9500,
        },
    ]

    alerts = detect_onward_money_flow(events)

    assert len(alerts) == 1
    assert alerts[0]["anomaly_type"] == "POSSIBLE_ONWARD_MONEY_FLOW"
    assert alerts[0]["event_ids"] == ["TX-1", "TX-2"]
    assert alerts[0]["evidence_level"] == "INFERRED"


def test_unrelated_accounts_do_not_flag_onward_flow():
    events = [
        {
            "event_id": "TX-1",
            "timestamp_utc": "2026-09-30T08:00:00Z",
            "actor": "ACC-A",
            "target": "ACC-B",
            "action": "TRANSFER",
            "status": "SUCCESS",
            "amount": 10000,
        },
        {
            "event_id": "TX-2",
            "timestamp_utc": "2026-09-30T08:30:00Z",
            "actor": "ACC-D",
            "target": "ACC-E",
            "action": "TRANSFER",
            "status": "SUCCESS",
            "amount": 9500,
        },
    ]

    alerts = detect_onward_money_flow(events)

    assert alerts == []
