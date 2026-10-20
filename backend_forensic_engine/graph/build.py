
import networkx as nx

from event_utils import event_value, locator_value


def build_graph(events):
    """Build an evidence graph from dictionaries or UnifiedEvent objects."""
    graph = nx.MultiDiGraph()

    for event in events:
        event_id = event_value(event, "event_id")

        if not event_id:
            raise ValueError("Every event must have an event_id")

        actor = event_value(event, "actor")
        target = event_value(event, "target")

        locator = {
            "file": locator_value(event, "file"),
            "row": locator_value(event, "row"),
        }

        graph.add_node(
            event_id,
            node_type="event",
            action=event_value(event, "action"),
            timestamp_utc=event_value(event, "timestamp_utc"),
            timestamp_original=event_value(event, "timestamp_original"),
            timezone_original=event_value(event, "timezone_original"),
            timezone_basis=event_value(event, "timezone_basis"),
            source_type=event_value(event, "source_type"),
            artifact_id=event_value(event, "artifact_id"),
            amount=event_value(event, "amount"),
            currency=event_value(event, "currency"),
            status=event_value(event, "status"),
            locator=locator,
        )

        if actor:
            graph.add_node(actor, node_type="entity")
            graph.add_edge(
                actor,
                event_id,
                relationship="PARTICIPATED_IN",
                evidence_level="DIRECT",
                event_id=event_id,
                locator=locator,
            )

        if target:
            graph.add_node(target, node_type="entity")
            graph.add_edge(
                event_id,
                target,
                relationship="INVOLVES_TARGET",
                evidence_level="DIRECT",
                event_id=event_id,
                locator=locator,
            )

    return graph


if __name__ == "__main__":
    sample_events = [{
        "event_id": "UPI-241",
        "timestamp_utc": "2026-09-30T08:38:12Z",
        "actor": "ACC-A",
        "target": "ACC-B",
        "action": "TRANSFER",
        "status": "SUCCESS",
        "amount": 25000.0,
        "artifact_id": "ART-004",
        "locator": {"file": "bank_statement.csv", "row": 183},
    }]

    evidence_graph = build_graph(sample_events)

    print("Nodes:", evidence_graph.number_of_nodes())
    print("Edges:", evidence_graph.number_of_edges())
    print(
        "Evidence locator:",
        evidence_graph.nodes["UPI-241"]["locator"],
    )

