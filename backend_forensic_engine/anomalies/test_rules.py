
from rules import (
    detect_transaction_bursts,
    detect_failed_then_retried_payments,
)


def test_three_successful_debits_within_15_minutes_are_flagged():
    events = [
        {
            "event_id": "UPI-241",
            "timestamp_utc": "2026-09-30T08:38:00Z",
            "action": "DEBIT",
            "status": "SUCCESS",
            "amount": 25000,
            "actor": "ACC-A",
        },
        {
            "event_id": "UPI-244",
            "timestamp_utc": "2026-09-30T08:42:00Z",
            "action": "DEBIT",
            "status": "SUCCESS",
            "amount": 40000,
            "actor": "ACC-A",
        },
        {
            "event_id": "UPI-248",
            "timestamp_utc": "2026-09-30T08:47:00Z",
            "action": "DEBIT",
            "status": "SUCCESS",
            "amount": 20000,
            "actor": "ACC-A",
        },
    ]

    alerts = detect_transaction_bursts(events)

    assert len(alerts) > 0
    assert alerts[0]["anomaly_type"] == "TRANSACTION_BURST"
    assert alerts[0]["count"] == 3
    assert set(alerts[0]["event_ids"]) == {
        "UPI-241",
        "UPI-244",
        "UPI-248",
    }


def test_failed_transactions_do_not_count_as_successful_debits():
    events = [
        {
            "event_id": "UPI-241",
            "timestamp_utc": "2026-09-30T08:38:00Z",
            "action": "DEBIT",
            "status": "SUCCESS",
        },
        {
            "event_id": "UPI-244",
            "timestamp_utc": "2026-09-30T08:42:00Z",
            "action": "DEBIT",
            "status": "FAILED",
        },
        {
            "event_id": "UPI-248",
            "timestamp_utc": "2026-09-30T08:47:00Z",
            "action": "DEBIT",
            "status": "SUCCESS",
        },
    ]

    alerts = detect_transaction_bursts(events)

    assert alerts == []


def test_failed_payment_followed_by_success_to_same_recipient():
    events = [
        {
            "event_id": "PAY-101",
            "timestamp_utc": "2026-09-30T08:30:00Z",
            "target": "ACC-B",
            "status": "FAILED",
        },
        {
            "event_id": "PAY-102",
            "timestamp_utc": "2026-09-30T08:35:00Z",
            "target": "ACC-B",
            "status": "SUCCESS",
        },
    ]

    alerts = detect_failed_then_retried_payments(events)

    assert len(alerts) == 1
    assert alerts[0]["anomaly_type"] == (
        "FAILED_THEN_RETRIED_PAYMENT"
    )
    assert alerts[0]["event_ids"] == ["PAY-101", "PAY-102"]


def test_success_to_different_recipient_is_not_flagged():
    events = [
        {
            "event_id": "PAY-101",
            "timestamp_utc": "2026-09-30T08:30:00Z",
            "target": "ACC-B",
            "status": "FAILED",
        },
        {
            "event_id": "PAY-102",
            "timestamp_utc": "2026-09-30T08:35:00Z",
            "target": "ACC-C",
            "status": "SUCCESS",
        },
    ]

    alerts = detect_failed_then_retried_payments(events)

    assert alerts == []
