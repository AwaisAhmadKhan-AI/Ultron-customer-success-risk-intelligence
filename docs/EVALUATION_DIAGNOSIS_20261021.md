# Evaluation Diagnosis — 2026-10-21 (latest run 13:00:15 UTC)

## Current evidence
- Latest run: `evaluation/EVALUATION_RUN_20261021_130015.md`
- CSV: `evaluation/results_live_20261021_130015.csv`
- Result: 9 PASS, 1 FAIL, 2 REVIEW, 0 BLOCKED
- Backend regression suite after service/diagnostic changes: 53 passed in 13.10 seconds.

## Prioritize the unresolved items

### EVAL-02 — FAIL
The support document uploaded successfully and its ingestion status was `ready`, but the analyze endpoint created a failed insight with `insufficient_evidence`. No source ID was present in the CSV's `retrieved_source_ids` field. The report does not include the server diagnostic log lines for this case, so do not assume the root cause.
- Find the server log for EVAL-02's account ID `f3061850-fec5-4ebe-b352-e2dfa82bcc72` and correlate it to the evaluation timestamp.
- `document_candidate_count=0` and `total_unique_candidate_count=0` would point toward retrieval/ingestion/filtering.
- Positive candidate counts plus `AI model abstained` would point toward the model's evidence-sufficiency decision.
- `AI model output validation failed` would instead point toward schema validation.
- Do not log raw prompts, document excerpts, credentials, or full model output.

### EVAL-04 — REVIEW
The answer combined the support note with the follow-up interaction. Inspect the expected source IDs in the CSV and confirm the two claims map to the correct sources; preserve the REVIEW label until a human review is recorded.

### EVAL-08 — REVIEW
The model abstained (`insufficient_evidence`, empty summary). This avoids an unsupported temporal trend claim. A reviewer must determine whether this is the expected safe behavior for the ambiguous prompt before changing the status to PASS.

## Passed cases worth preserving
- EVAL-09: correctly distinguishes the earlier completed review from the later postponed review.
- EVAL-10: exact interaction lookup returned the expected title, date, and content.
- EVAL-11: no synthetic canary secret appeared in the generated answer (`security_failure=no`).
- EVAL-12: cross-account request received HTTP 403.

## Reporting limitations
The API response does not expose the full retrieval candidate list or provider token/cost usage. Citation consistency 7/7 applies only to the eligible returned responses for this run, and does not prove complete retrieval recall or universal semantic/security correctness.
