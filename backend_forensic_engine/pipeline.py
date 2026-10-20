
from timeline.timeline import sort_events_by_utc
from graph.build import build_graph
from anomalies.rules import (
    detect_transaction_bursts,
    detect_failed_then_retried_payments,
    detect_onward_money_flow,
)
from verifier.verify import verify_claim


def analyze_case(events, claims=None):
    """
    Run the main forensic engines on normalized evidence events.

    Returns the sorted timeline, evidence graph, anomaly alerts,
    and claim-verification results.
    """
    if claims is None:
        claims = []

    # 1. Validate and sort events by UTC timestamp.
    timeline = sort_events_by_utc(events)

    # 2. Build the evidence graph.
    evidence_graph = build_graph(timeline)

    # 3. Run anomaly detectors.
    anomalies = []
    anomalies.extend(detect_transaction_bursts(timeline))
    anomalies.extend(detect_failed_then_retried_payments(timeline))
    anomalies.extend(detect_onward_money_flow(timeline))

    # 4. Verify supplied claims against available evidence.
    claim_results = []

    for claim in claims:
        result = verify_claim(claim, timeline)
        claim_results.append({
            "claim": claim,
            "result": result,
        })

    return {
        "timeline": timeline,
        "graph": evidence_graph,
        "anomalies": anomalies,
        "claim_results": claim_results,
        "event_count": len(timeline),
        "anomaly_count": len(anomalies),
        "claim_count": len(claim_results),
    }
