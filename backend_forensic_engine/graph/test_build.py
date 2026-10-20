
from build import build_graph


def test_graph_creates_sender_transaction_and_receiver():
    events = [
        {
            "event_id": "UPI-241",
            "actor": "ACC-A",
            "target": "ACC-B",
            "action": "TRANSFER",
            "locator": {
                "file": "statement.csv",
                "row": 183
            }
        }
    ]

    graph = build_graph(events)

    assert graph.number_of_nodes() == 3
    assert graph.number_of_edges() == 2

    assert graph.has_edge("ACC-A", "UPI-241")
    assert graph.has_edge("UPI-241", "ACC-B")


def test_graph_preserves_original_evidence_locator():
    events = [
        {
            "event_id": "UPI-241",
            "actor": "ACC-A",
            "target": "ACC-B",
            "locator": {
                "file": "statement.csv",
                "row": 183
            }
        }
    ]

    graph = build_graph(events)

    edge_data = graph.get_edge_data("ACC-A", "UPI-241")

    assert edge_data is not None

    evidence = next(iter(edge_data.values()))

    assert evidence["event_id"] == "UPI-241"
    assert evidence["locator"]["file"] == "statement.csv"
    assert evidence["locator"]["row"] == 183


def test_multiple_transactions_between_same_accounts_are_preserved():
    events = [
        {
            "event_id": "UPI-241",
            "actor": "ACC-A",
            "target": "ACC-B",
            "action": "TRANSFER",
            "amount": 25000,
            "locator": {"file": "statement.csv", "row": 183}
        },
        {
            "event_id": "UPI-242",
            "actor": "ACC-A",
            "target": "ACC-B",
            "action": "TRANSFER",
            "amount": 10000,
            "locator": {"file": "statement.csv", "row": 184}
        }
    ]

    graph = build_graph(events)

    assert graph.number_of_nodes() == 4
    assert graph.number_of_edges() == 4

    first_transaction = graph.nodes["UPI-241"]
    second_transaction = graph.nodes["UPI-242"]

    assert first_transaction["locator"]["row"] == 183
    assert second_transaction["locator"]["row"] == 184
    assert first_transaction["amount"] == 25000
    assert second_transaction["amount"] == 10000
