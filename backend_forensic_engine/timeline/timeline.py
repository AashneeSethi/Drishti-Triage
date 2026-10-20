
from datetime import datetime, timezone

from event_utils import event_value


def sort_events_by_utc(events):
    """Sort dictionary or object events by their UTC timestamps."""

    def utc_key(event):
        event_id = event_value(event, "event_id", "UNKNOWN")
        timestamp = event_value(event, "timestamp_utc")

        if not timestamp:
            raise ValueError(
                f"Missing timestamp_utc for event: {event_id}"
            )

        try:
            parsed = datetime.fromisoformat(
                timestamp.replace("Z", "+00:00")
            )
        except (ValueError, AttributeError):
            raise ValueError(
                f"Invalid timestamp for event: {event_id}"
            )

        if parsed.tzinfo is None or parsed.utcoffset() is None:
            raise ValueError(
                f"Timestamp must include a timezone: {event_id}"
            )

        return parsed.astimezone(timezone.utc)

    return sorted(events, key=utc_key)

