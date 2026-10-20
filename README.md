# Drishti-Triage
# DRISHTI-TRACE — Forensic Engine

## Overview
The Forensic Engine is a backend module of DRISHTI-TRACE, an AI-assisted digital forensics and investigation system. It processes structured event data, organizes events chronologically, builds relationships between entities, detects suspicious activity patterns, and evaluates claims against available evidence.

The engine is designed to support investigators by organizing evidence and highlighting patterns that may require further investigation. Its findings should be treated as analytical support, not as conclusive proof of wrongdoing.

## Features

### 1. Timeline Reconstruction
- Sorts events using UTC timestamps.
- Validates timezone-aware timestamps.
- Organizes events chronologically for investigation.

### 2. Evidence Graph Construction
- Builds a directed graph from processed events.
- Represents relationships between entities and transactions.
- Uses NetworkX MultiDiGraph to support multiple relationships between the same entities.

### 3. Anomaly Detection
Implements rule-based detection for:
- Transaction bursts.
- Failed payments followed by retries.
- Potential onward money flows between entities.

These rules flag suspicious patterns for further review rather than automatically determining fraud.

### 4. Claim Verification
- Evaluates claims against the available event timeline.
- Checks temporal ordering for relevant events.
- Identifies claims that cannot be verified from the available evidence.
- Flags causal claims for human review instead of treating correlation as proof of causation.

### 5. Analysis Pipeline
The central `pipeline.py` module combines timeline reconstruction, graph construction, anomaly detection, and claim verification into a unified analysis workflow.

## Project Structure

```text
backend_forensic_engine/
├── anomalies/
│   ├── rules.py
│   ├── test_money_flow.py
│   └── test_rules.py
├── graph/
│   ├── build.py
│   └── test_build.py
├── timeline/
│   ├── timeline.py
│   └── test_timeline.py
├── verifier/
│   ├── verify.py
│   └── test_verify.py
├── event_utils.py
├── pipeline.py
├── test_event_utils.py
└── test_pipeline.py
```

## Technology Stack
- Python
- NetworkX
- pytest
- Python datetime and timezone handling

## Running the Tests

Run these commands from the `backend_forensic_engine` directory.

Install the required packages if they are not already installed:

```bash
pip install pytest networkx
```

Run the complete test suite:

```bash
python -m pytest -v
```

**Test status:** All 26 tests passed in the development environment before the folder rename. Re-run the suite after integration to confirm compatibility with the complete project.

## Integration
The Forensic Engine is intended to receive structured events from the evidence-processing or parsing module. Its analysis output can then be connected to the backend API and frontend dashboard.

Integration should verify:
- Compatibility of event fields and timestamp formats.
- Correct Python import paths after the folder rename.
- Consistent API response formats.
- Successful end-to-end execution with real or representative test data.

## Limitations
- Detection is based on predefined rules and depends on the quality and completeness of the input data.
- A flagged anomaly does not independently establish fraud or criminal activity.
- Claim verification is limited to the evidence and checks currently implemented.
- Human review is necessary before drawing investigative conclusions.

## Contribution
This module was developed as part of the DRISHTI-TRACE project. Contributions and integration changes should be made through feature branches and reviewed before merging into the main branch.
