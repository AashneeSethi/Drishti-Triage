
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from event_utils import event_value


def parse_utc(timestamp):
    """Parse a timezone-aware timestamp and convert it to UTC."""
    parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("Timestamp must include a timezone")

    return parsed.astimezone(timezone.utc)



def detect_transaction_bursts(events):
    """Flag 3+ successful outgoing transfers within 15 minutes."""
    debits = []

    for event in events:
        action = str(event_value(event, "action", "")).upper()
        status = str(event_value(event, "status", "")).upper()
        actor = event_value(event, "actor")
        event_id = event_value(event, "event_id")
        timestamp = event_value(event, "timestamp_utc")

        if action not in {"DEBIT", "TRANSFER", "UPI_DEBIT"}:
            continue

        if status not in {"SUCCESS", "COMPLETED"}:
            continue

        if not actor or not event_id or not timestamp:
            continue

        debits.append((
            parse_utc(timestamp),
            actor,
            event_id,
        ))

    debits.sort(key=lambda item: item[0])
    alerts = []
    window = timedelta(minutes=15)

    for start in range(len(debits)):
        start_time, start_actor, _ = debits[start]
        matching = []

        for end in range(start, len(debits)):
            current_time, current_actor, _ = debits[end]

            if current_time - start_time > window:
                break

            if current_actor == start_actor:
                matching.append(debits[end])

        if len(matching) >= 3:
            alerts.append({
                "anomaly_type": "TRANSACTION_BURST",
                "actor": start_actor,
                "event_ids": [item[2] for item in matching],
                "count": len(matching),
                "window_minutes": 15,
                "evidence_level": "DIRECT",
            })

    # Remove duplicate alerts with the same actor and event IDs.
    unique_alerts = []
    seen = set()

    for alert in alerts:
        key = (alert["actor"], tuple(alert["event_ids"]))
        if key not in seen:
            seen.add(key)
            unique_alerts.append(alert)

    return unique_alerts





def detect_failed_then_retried_payments(events):
    """Detect failed payments followed by successful payments
    to the same recipient. Supports dictionaries and event objects.
    """
    normalized = []

    for event in events:
        event_id = event_value(event, "event_id")
        timestamp = event_value(event, "timestamp_utc")
        actor = event_value(event, "actor")
        target = event_value(event, "target")
        status = str(event_value(event, "status", "")).upper()
        action = str(event_value(event, "action", "")).upper()

        if not event_id or not timestamp or not target:
            continue

        # Allow missing action in older tests, but exclude known calls.
        if action and action not in {"TRANSFER", "DEBIT", "UPI_DEBIT"}:
            continue

        if status not in {"FAILED", "FAILURE", "SUCCESS", "COMPLETED"}:
            continue

        normalized.append({
            "event_id": event_id,
            "timestamp": parse_utc(timestamp),
            "actor": actor,
            "target": target,
            "status": status,
        })

    normalized.sort(key=lambda event: event["timestamp"])
    alerts = []

    for failed in normalized:
        if failed["status"] not in {"FAILED", "FAILURE"}:
            continue

        for successful in normalized:
            if successful["status"] not in {"SUCCESS", "COMPLETED"}:
                continue

            if successful["timestamp"] <= failed["timestamp"]:
                continue

            if successful["target"] != failed["target"]:
                continue

            # If both senders are known, they must match.
            if (
                failed["actor"] is not None
                and successful["actor"] is not None
                and failed["actor"] != successful["actor"]
            ):
                continue

            alerts.append({
                "anomaly_type": "FAILED_THEN_RETRIED_PAYMENT",
                "event_ids": [
                    failed["event_id"],
                    successful["event_id"],
                ],
                "recipient": failed["target"],
                "evidence_level": "INFERRED",
                "warning": (
                    "The same recipient and event order suggest a retry, "
                    "but missing sender data prevents confirmation."
                    if failed["actor"] is None
                    or successful["actor"] is None
                    else "A matching retry pattern requires investigation."
                ),
            })

    return alerts



def detect_onward_money_flow(events):
    """
    Find possible onward transfers within 120 minutes,
    up to 4 hops, with amounts within 20%.
    Results are inferred leads, not proof of fund tracing.
    """
    transfers = []

    for event in events:
        status = str(event_value(event, "status", "")).upper()
        action = str(event_value(event, "action", "")).upper()
        actor = event_value(event, "actor")
        target = event_value(event, "target")
        event_id = event_value(event, "event_id")
        timestamp = event_value(event, "timestamp_utc")
        amount = event_value(event, "amount")

        if status not in {"SUCCESS", "COMPLETED"}:
            continue

        if action not in {"TRANSFER", "DEBIT", "UPI_DEBIT"}:
            continue

        if not actor or not target or not event_id or not timestamp:
            continue

        try:
            amount = float(amount)
        except (TypeError, ValueError):
            continue

        if amount <= 0:
            continue

        transfers.append({
            "event_id": event_id,
            "timestamp": parse_utc(timestamp),
            "actor": actor,
            "target": target,
            "amount": amount,
        })

    transfers.sort(key=lambda item: item["timestamp"])

    outgoing = {}
    for transfer in transfers:
        outgoing.setdefault(transfer["actor"], []).append(transfer)

    alerts = []
    seen = set()
    max_hops = 4
    max_seconds = 120 * 60
    tolerance = 0.20

    def explore(path, start_time, start_amount, current_account):
        if len(path) >= max_hops:
            return

        previous_time = path[-1]["timestamp"]

        for next_event in outgoing.get(current_account, []):
            next_time = next_event["timestamp"]

            if next_time <= previous_time:
                continue

            if (next_time - start_time).total_seconds() > max_seconds:
                break

            difference = abs(next_event["amount"] - start_amount) / start_amount
            if difference > tolerance:
                continue

            next_path = path + [next_event]

            if len(next_path) >= 2:
                ids = tuple(item["event_id"] for item in next_path)

                if ids not in seen:
                    seen.add(ids)
                    alerts.append({
                        "anomaly_type": "POSSIBLE_ONWARD_MONEY_FLOW",
                        "event_ids": list(ids),
                        "accounts": (
                            [next_path[0]["actor"]]
                            + [item["target"] for item in next_path]
                        ),
                        "hop_count": len(next_path),
                        "window_minutes": 120,
                        "amount_tolerance_percent": 20,
                        "evidence_level": "INFERRED",
                        "warning": (
                            "Time and amount similarity do not prove "
                            "that the same funds moved between accounts."
                        ),
                    })

            explore(
                next_path,
                start_time,
                start_amount,
                next_event["target"],
            )

    for transfer in transfers:
        explore(
            [transfer],
            transfer["timestamp"],
            transfer["amount"],
            transfer["target"],
        )

    return alerts

