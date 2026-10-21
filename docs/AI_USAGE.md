
# AI Usage Log

## Purpose

This document records meaningful AI-assisted engineering work performed
during the development of the Customer Success Risk Intelligence Platform.

AI tools are used to support reasoning, implementation, debugging, and
review. The developer remains responsible for understanding the code,
making engineering decisions, and verifying the results.

## Entry 1 — Authentication Troubleshooting

- **Date:** 2026-10-20
- **Problem:** The frontend displayed `Invalid or expired authentication token`.
- **Tool:** ChatGPT
- **Why AI was used:** To investigate the authentication issue before making
  changes to the backend security implementation.
- **Recommendation:** Sign out, refresh the browser, and sign in again to
  obtain a fresh authentication token.
- **Accepted:** Yes
- **Human verification:** The developer signed in again and reported that
  account details and filtering subsequently worked.
- **Result:** The visible authentication error was resolved during local
  testing. The underlying cause was not conclusively established.

## Entry 2 — AI Provider Troubleshooting

- **Date:** 2026-10-20
- **Problem:** AI analysis returned `insufficient_evidence` and
  `llm_provider_error`.
- **Tool:** ChatGPT
- **Why AI was used:** To distinguish a provider connectivity/configuration
  problem from a problem in the application's AI analysis workflow.
- **Recommendation:** Test the configured Groq model independently and
  inspect the application workflow without exposing API credentials.
- **Accepted:** Yes
- **Human verification:** An independent test request to Groq returned
  HTTP 200 and valid JSON. After restarting the backend, the developer
  reported a completed analysis with risk factors, recommendations, and
  evidence citations.
- **Result:** The independent provider request and the end-to-end analysis
  subsequently worked. The original cause of the provider error was not
  conclusively established.

## Entry 3 — Frontend TypeScript Correction

- **Date:** 2026-10-20
- **Problem:** The frontend build failed because `None` was used where
  TypeScript requires `null`.
- **Tool:** ChatGPT
- **Why AI was used:** To identify and correct the TypeScript compilation
  errors with a small, targeted patch.
- **Recommendation:** Replace the two incorrect assignments with
  `selectedAccountIdRef.current = null`.
- **Accepted:** Yes
- **Human verification:** The developer ran `npm run build` and
  `npm run lint`.
- **Result:** The production build succeeded and ESLint reported no
  warnings or errors.

## Entry 4 — AI Analysis and Evidence Review

- **Date:** 2026-10-20
- **Problem:** Verify that AI-generated account analysis uses supporting
  customer evidence and does not silently change the stored account risk.
- **Tool:** ChatGPT
- **Why AI was used:** To review the observed AI response and identify
  further acceptance tests.
- **Recommendation:** Check the summary, suggested risk, confidence,
  risk factors, recommended actions, source references, and insufficient
  evidence behaviour.
- **Accepted:** Partially
- **Human verification:** The developer shared a successful analysis
  containing a summary, suggested medium risk, medium confidence, several
  recommendations, a document citation, and an interaction citation.
- **Result:** A successful evidence-grounded analysis was observed.
  Dedicated final verification of all AI security and failure scenarios
  remains outstanding.

## Entry 5 — Automated Test Review

- **Date:** 2026-10-20
- **Problem:** Determine which engineering requirements still need
  explicit verification before project handoff.
- **Tool:** ChatGPT
- **Why AI was used:** To inspect the test inventory and compare it with
  the assignment's acceptance requirements.
- **Recommendation:** Audit authorization boundaries, document
  deduplication, migration round-trips, prompt injection, performance,
  and the AI evaluation suite.
- **Accepted:** Yes
- **Human verification:** The developer ran the test inventory script.
  It found 46 test functions across the listed test files, including
  13 AI evaluation test functions. A separate full test run had
  previously reported 50 passed tests.
- **Result:** Some relevant test files and scenarios exist, but matching
  tests, passing results, and acceptance-level coverage still need to
  be verified for every requirement.

## Open Verification Items

The following work must not be marked complete until it has been tested
and the results recorded:

- Verify document upload, ingestion, and duplicate-upload behaviour.
- Demonstrate an unauthorized cross-account request is rejected.
- Test prompt injection and retrieval isolation using separate accounts.
- Verify migration upgrade, downgrade, and upgrade again.
- Measure one real performance issue and document the improvement.
- Run and report the required AI evaluation cases and metrics.
- Verify the frontend's remaining required record-management workflows.
- Complete credential rotation and confirm database connectivity afterwards.
- Run the final backend tests, frontend build, and frontend lint.

## Logging Rules

For every significant AI-assisted change:

1. Record the actual problem and the recommendation.
2. State whether the recommendation was accepted or modified.
3. Record the command, test, or manual check used for verification.
4. Record the actual result, including failures and limitations.
5. Never claim a test passed unless it was actually run and passed.
6. Never include passwords, API keys, access tokens, or other secrets
   in this file.
