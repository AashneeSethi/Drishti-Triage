
from dataclasses import dataclass

from event_utils import event_value, locator_value


@dataclass
class SampleLocator:
    file: str
    row: int


@dataclass
class SampleEvent:
    event_id: str
    actor: str
    locator: SampleLocator


def test_reads_fields_from_dictionary():
    event = {"event_id": "UPI-241", "actor": "ACC-A"}

    assert event_value(event, "event_id") == "UPI-241"
    assert event_value(event, "actor") == "ACC-A"


def test_reads_fields_from_event_object():
    event = SampleEvent(
        event_id="UPI-241",
        actor="ACC-A",
        locator=SampleLocator("bank_statement.csv", 183),
    )

    assert event_value(event, "event_id") == "UPI-241"
    assert event_value(event, "actor") == "ACC-A"


def test_reads_locator_from_event_object():
    event = SampleEvent(
        event_id="UPI-241",
        actor="ACC-A",
        locator=SampleLocator("bank_statement.csv", 183),
    )

    assert locator_value(event, "file") == "bank_statement.csv"
    assert locator_value(event, "row") == 183
