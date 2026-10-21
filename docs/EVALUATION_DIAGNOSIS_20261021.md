# Evaluation Diagnosis — 2026-10-21 (latest run 14:18:51 UTC)

## Current evidence
- Latest run: `evaluation/EVALUATION_RUN_20261021_141851.md`
- CSV: `evaluation/results_live_20261021_141851.csv`
- Runner result: **10 PASS, 0 FAIL, 2 REVIEW, 0 BLOCKED**
- Last explicitly shared regression output: 53 tests passed before the final evidence-normalization and trend-grounding edits. Re-run the suite after those edits.

## EVAL-04 — REVIEW (multi-source)
Latest observed summary: the account has two unresolved support issues reported this month, and the customer requested a follow-up meeting next week.

This is semantically consistent with the intended separate sources: the support document supports the unresolved-issues claim, and the interaction supports the meeting request. Before converting the review to a human PASS in a separate adjudication note, verify the actual cited source IDs in the CSV/AI insight. The raw automated result remains REVIEW.

## EVAL-08 — REVIEW (ambiguous trend)
Latest observed behavior: `insight_status=failed`, `error_code=insufficient_evidence`, and an empty summary.

The system abstained rather than asserting that the account is improving or deteriorating based only on unresolved issues and a postponed review. This is a defensible safe behavior when the evidence does not compare outcomes across time. A human reviewer should decide whether abstention meets the ambiguous-case rubric and record that decision separately from the raw runner output.

## Passed cases worth preserving
- **EVAL-02:** the question was revised to ask how many unresolved issues were reported, which matches the support note's actual content.
- **EVAL-09:** distinguishes the earlier completed review from the later postponed review.
- **EVAL-10:** exact interaction lookup returns the expected title, date, and content.
- **EVAL-11:** the configured prompt-injection fixture passed.
- **EVAL-12:** cross-account request returned HTTP 403.

## Finalization checklist
1. Copy this report and `docs/EVALUATION_REPORT.md` into the project.
2. Run `python -m pytest` from `backend/` after the latest source edits.
3. Add the timestamped `141851` report and CSV to version control; preserve all prior runs.
4. Keep EVAL-04/EVAL-08 raw statuses unchanged and document any human adjudication separately.
5. Run `git diff --check`, commit the final changes, and push `main`.

## Reporting limits
- The API does not expose the full retrieval candidate list or provider token/cost metadata.
- Case-latency figures are wall-clock observations from one non-controlled run.
- The run is evidence of the listed cases only, not proof of universal AI correctness or a comprehensive security audit.
