# DRISHTI TRIAGE

> **"AI proposes. Evidence proves."**

An evidence-verifiable, air-gapped digital forensics investigation framework designed for cybercrime triage, multi-source incident reconstruction, and electronic evidence compliance under Section 63 of the *Bharatiya Sakshya Adhiniyam, 2023* (BSA 2023).

---

## Key Modules

1. **Evidence Vault & Cryptographic Sealing:** Tamper-evident SHA-256 ingestion registry for telephony CDRs, banking/UPI statements, WhatsApp exports, and Windows EVTX system logs.
2. **Super-Timeline Reconstruction:** Normalized multi-source chronological timeline with UTC conversion and raw source preservation (protecting against Timezone Traps).
3. **Forensic Knowledge Graph:** Interactive entity graph with explicit separation between **Deterministic Records** (solid lines) and **Inferred Links** (dashed lines).
4. **The Contradiction Challenge (Claim Verifier):** Deterministic claim verifier that tests natural-language assertions against ground-truth byte records, identifying contradictions, causal overreach, and ungrounded fabrications.
5. **Anomaly & Pattern Analysis:** Automated detection of digital arrest surveillance patterns, impersonation VPAs, rapid transaction bursts, and document metadata discrepancies.
6. **Section 63 BSA 2023 Compliance:** Generates court-admissible electronic evidence technical certificates with complete hash manifests and line-level citations.

---

## Getting Started

### Prerequisites
- Node.js (v18+) & npm
- Python (3.10+)

### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```

The investigation workstation will be accessible at `http://localhost:5173/`.