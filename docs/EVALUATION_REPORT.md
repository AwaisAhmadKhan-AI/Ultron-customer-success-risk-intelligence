# AI Evaluation Report — Ultron

**Report date:** 2026-10-21  
**Purpose:** Record actual verification evidence and make the remaining model/RAG evaluation work explicit.

## 1. Executive result

The automated backend test suite has a recorded complete result of **53 passed**. The frontend ESLint check and production build also passed after the frontend was split into page and shared modules. These are strong regression checks, but they are not equivalent to a measured 12-case end-to-end RAG evaluation.

A 12-case scenario catalog is supplied in `evaluation/cases.json`. Its structural validation can be run with `python evaluation/validate_cases.py`. That validator checks that the cases and required categories exist; it does **not** execute retrieval or call the LLM. Until the cases are run against the application and results are recorded, the evaluation dataset status is **prepared, not fully executed**.

## 2. Verified automated test evidence

### Backend

Latest complete run reported by the developer: `53 passed`. Coverage includes account assignment boundaries, authentication, search/filter validation, AI output/evidence validation, failure handling, and duplicate document upload protection.

`tests/test_ai_evaluation.py` contains 13 deterministic tests, including:

- supported risk finding and recommendation acceptance;
- multi-claim evidence support;
- insufficient evidence and no-source behavior;
- rejection of unknown source IDs, unsupported source types, invalid risk values, missing required fields and blank summaries;
- safe LLM/embedding provider failure handling;
- prompt-injection content marked as untrusted.

These are tests of selected service/validation paths. They are not a statistically meaningful accuracy score for an LLM or a complete retrieval benchmark.

### Frontend

The recorded checks after modularization were successful:

- `npm run lint` — pass.
- `npm run build` — pass (TypeScript build and Vite production build).

### Database/version control

The development database was verified at Alembic revision `cdf526010a2b (head)`. The modularization commit `c97c579` was pushed to `origin/main`, with local/remote divergence reported as `0 0` at that check.

## 3. Required 12-case evaluation coverage

| Required scenario category | Cases in catalog | Execution status |
|---|---|---|
| Straightforward supported questions (3) | EVAL-01 to EVAL-03 | Not yet recorded as end-to-end runs |
| Multi-source questions (2) | EVAL-04 to EVAL-05 | Not yet recorded as end-to-end runs |
| Unsupported questions (2) | EVAL-06 to EVAL-07 | Not yet recorded as end-to-end runs |
| Ambiguous question (1) | EVAL-08 | Not yet recorded as end-to-end run |
| Conflicting evidence (1) | EVAL-09 | Not yet recorded as end-to-end run |
| Exact identifier/search (1) | EVAL-10 | Not yet recorded as end-to-end run |
| Prompt injection (1) | EVAL-11 | Unit-level untrusted-input coverage exists; end-to-end run not recorded |
| Authorization/data leakage (1) | EVAL-12 | Authorization unit/API tests exist; this exact evaluation case not yet recorded |

## 4. Metrics required by the assessment

Do not fill these with estimates. Execute the catalog cases and record actual values in `evaluation/results_template.csv`.

| Metric | Current status | Measurement approach |
|---|---|---|
| Retrieval success / relevant-source hit rate | Not measured as a 12-case dataset metric | For each case, record whether the expected authorized source appears in retrieved evidence; compute successful cases / applicable cases |
| Citation validity | Unit tests exist; dataset-level rate not measured | Valid cited source IDs / all returned citation IDs; also check source was retrieved and belongs to the authorized account |
| Supported-answer behavior | Not measured across the catalog | Mark whether claims are supported by supplied evidence, case by case |
| No-answer correctness | Not measured across the catalog | For unsupported cases, mark correctly abstained versus unsupported answer returned |
| Latency | No consolidated benchmark result recorded | Record wall-clock duration per run and state whether provider/network time is included |
| Token/cost usage | Not measured in a consolidated report | Record provider usage fields if returned; if unavailable, mark `unavailable`, do not infer values |
| Security failures | Selected automated tests pass; complete manual attack run not recorded here | Record any cross-account exposure, prompt injection success, unauthorized citation or other failure; target is zero observed failures in the tested cases |

The requirement's example p95 target for non-AI API calls is an engineering target, not a measured result. Do not claim it is met without a reproducible benchmark and recorded environment.

## 5. How to execute and record

1. Run `python evaluation/validate_cases.py` from the repository root.
2. Start the backend and frontend with a known test database and controlled test users.
3. Prepare only synthetic test data for all expected source records; include at least two accounts owned by different CSMs.
4. Run each case in `evaluation/cases.json` through the real flow. For the exact-identifier, injection and cross-account cases, keep the source data and request/response evidence.
5. Fill `evaluation/results_template.csv` with `PASS`, `FAIL`, or `BLOCKED`, observed behavior, retrieved-source IDs, citation validity, latency and token/cost fields when measurable.
6. Summarize numerator/denominator for each rate. Keep failed cases and describe their fixes instead of deleting or weakening them.
7. Commit the completed report/results only after the recorded run is real.

## 6. Current conclusion

Selected safety and validation paths have automated coverage and the existing backend suite passes. A reproducible live/provider-backed evaluation with dataset-level retrieval, answer, citation, latency and token/cost measurements remains an open deliverable. This report intentionally does not invent benchmark results.
