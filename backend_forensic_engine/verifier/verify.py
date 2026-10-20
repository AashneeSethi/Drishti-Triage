
from datetime import datetime, timezone

from event_utils import event_value


VERIFIED = "VERIFIED"
INFERRED = "INFERRED — REQUIRES HUMAN REVIEW"
CONTRADICTED = "CONTRADICTED"
NOT_FOUND = "NOT FOUND IN AVAILABLE EVIDENCE"


def parse_utc(timestamp):
    """Parse a timezone-aware timestamp and convert it to UTC."""
    if not timestamp:
        raise ValueError("Missing timestamp")

    parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("Timestamp must include a timezone")

    return parsed.astimezone(timezone.utc)


def verify_temporal_order(
    event_a,
    event_b,
    expected_order="A_BEFORE_B",
):
    """
    Verify the chronological order of two evidence events.

    A_BEFORE_B means event A should occur before event B.
    B_BEFORE_A means event B should occur before event A.
    """
    id_a = event_value(event_a, "event_id", "UNKNOWN")
    id_b = event_value(event_b, "event_id", "UNKNOWN")

    timestamp_a = event_value(event_a, "timestamp_utc")
    timestamp_b = event_value(event_b, "timestamp_utc")

    if not timestamp_a or not timestamp_b:
        return {
            "status": INFERRED,
            "reason": "A timestamp is missing; temporal order cannot be checked.",
            "matched_event_ids": [id_a, id_b],
        }

    try:
        dt_a = parse_utc(timestamp_a)
        dt_b = parse_utc(timestamp_b)
    except (ValueError, AttributeError):
        return {
            "status": INFERRED,
            "reason": "A timestamp is invalid or lacks timezone information.",
            "matched_event_ids": [id_a, id_b],
        }

    delta_seconds = (dt_b - dt_a).total_seconds()

    if expected_order == "A_BEFORE_B":
        correct_order = delta_seconds > 0
    elif expected_order == "B_BEFORE_A":
        correct_order = delta_seconds < 0
    else:
        return {
            "status": INFERRED,
            "reason": "Unsupported expected_order value.",
            "matched_event_ids": [id_a, id_b],
        }

    if delta_seconds == 0:
        return {
            "status": CONTRADICTED,
            "reason": "Both events have the same UTC timestamp; strict order is not established.",
            "matched_event_ids": [id_a, id_b],
            "delta_seconds": delta_seconds,
        }

    return {
        "status": VERIFIED if correct_order else CONTRADICTED,
        "reason": (
            "UTC timestamps support the claimed event order."
            if correct_order
            else "UTC timestamps contradict the claimed event order."
        ),
        "matched_event_ids": [id_a, id_b],
        "delta_seconds": delta_seconds,
    }


def verify_claim(claim, evidence_events):
    """
    Verify a structured claim against available evidence.

    For temporal claims, use:
    {
        "claim_type": "TEMPORAL_ORDER",
        "event_a_id": "CALL-190",
        "event_b_id": "UPI-236",
        "expected_order": "A_BEFORE_B"
    }
    """
    if claim.get("is_causal") is True:
        return {
            "status": INFERRED,
            "reason": "Causal claims require human review.",
            "matched_event_ids": [],
        }

    claim_type = str(claim.get("claim_type", "")).upper()

    if claim_type == "TEMPORAL_ORDER":
        events_by_id = {
            event_value(event, "event_id"): event
            for event in evidence_events
        }

        event_a = events_by_id.get(claim.get("event_a_id"))
        event_b = events_by_id.get(claim.get("event_b_id"))

        if event_a is None or event_b is None:
            return {
                "status": NOT_FOUND,
                "reason": "One or both events were not found.",
                "matched_event_ids": [
                    event_id
                    for event_id in (
                        claim.get("event_a_id"),
                        claim.get("event_b_id"),
                    )
                    if event_id not in events_by_id
                ],
            }

        return verify_temporal_order(
            event_a,
            event_b,
            claim.get("expected_order", "A_BEFORE_B"),
        )

    relevant = []

    for event in evidence_events:
        action = str(event_value(event, "action", "")).upper()

        if action != claim_type:
            continue

        if claim.get("actor") is not None:
            if event_value(event, "actor") != claim["actor"]:
                continue

        if claim.get("target") is not None:
            if event_value(event, "target") != claim["target"]:
                continue

        relevant.append(event)

    if not relevant:
        return {
            "status": NOT_FOUND,
            "reason": "No matching event was found in the available evidence.",
            "matched_event_ids": [],
        }

    expected_amount = claim.get("amount")

    amount_matches = [
        event for event in relevant
        if expected_amount is None
        or event_value(event, "amount") == expected_amount
    ]

    if not amount_matches:
        return {
            "status": CONTRADICTED,
            "reason": "Matching events exist, but their amounts differ from the claim.",
            "matched_event_ids": [
                event_value(event, "event_id")
                for event in relevant
            ],
        }

    successful_matches = [
        event for event in amount_matches
        if str(event_value(event, "status", "")).upper()
        in {"SUCCESS", "COMPLETED"}
    ]

    if successful_matches:
        return {
            "status": VERIFIED,
            "reason": "A matching successful event was found.",
            "matched_event_ids": [
                event_value(event, "event_id")
                for event in successful_matches
            ],
        }

    return {
        "status": INFERRED,
        "reason": "A matching event exists, but success is not established.",
        "matched_event_ids": [
            event_value(event, "event_id")
            for event in amount_matches
        ],
    }

