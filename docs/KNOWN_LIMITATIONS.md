# Known Limitations — Ultron

**Status date:** 2026-10-21. This list distinguishes verified implementation scope from items that need additional evidence.

## Product and policy limitations

1. **Single application role in v1:** The documented scope is the CSM role with account-assignment isolation. Admin/Manager workflows are not included.
2. **Retention policy is open:** Archive/history behavior is used for selected entities, but the data-retention period, purge policy and audit-log retention period have not been specified. Automatic purge should not be added without a policy decision.
3. **AI remains advisory:** The AI-suggested risk level is separate from the stored account risk level; a CSM remains responsible for decisions.
4. **Supported document types are limited:** The upload flow supports PDF, TXT and Markdown; DOCX is out of scope for v1. UI validation currently limits files to 10 MB.
5. **No production deployment evidence:** The available verification is from the local development/test environment. HTTPS termination, production secret management, backups, restore drills, monitoring alerts and deployment hardening require separate verification.

## AI/RAG/evaluation limitations

6. **The 12-case suite is cataloged, not yet fully measured:** `evaluation/cases.json` describes required cases. Its validator checks the catalog structure only. An actual model/retrieval run and completed `evaluation/results_template.csv` are still required.
7. **Dataset-level retrieval metrics are absent:** A query plan/index improvement was observed for account-assignment lookup, but this does not establish RAG retrieval success or end-to-end latency improvements.
8. **Latency and token/cost metrics are not consolidated:** Do not claim the local p95 target or cost performance is met until run data and methodology are recorded.
9. **Prompt-injection coverage is selected, not exhaustive:** Tests demonstrate selected untrusted-source handling; this does not guarantee resistance to every injection or multi-step data-exfiltration attempt.
10. **Provider failure paths have test coverage, but operational behavior varies:** Timeouts, provider rate limits, model changes and network outages should be tested against the chosen deployment configuration; unit tests using mocks do not replace live provider checks.

## Engineering and operational limitations

11. **`App.tsx` still coordinates shared state and API handlers:** Page views, reusable components, types and presentation helpers have been extracted. A future refactor may separate API clients, domain hooks and application state further. Avoid claiming the frontend is fully layered.
12. **Repository layering is not necessarily uniform:** The backend contains routers, services and repository modules, but each route's data-access pattern should be reviewed before claiming every entity follows a strict router → service → repository separation.
13. **Observability requires a deployment review:** Confirm log redaction, correlation/request IDs, operational dashboards, alerting and log retention before production use.
14. **Test status has scope:** The recorded 53 passing backend tests and successful frontend lint/build indicate automated checks pass at that revision. They do not prove all browser paths, production deployment settings, accessibility, or the required live evaluation metrics are complete.

## Before production or final assessment

- Run all 12 evaluation cases and complete their result rows.
- Demonstrate the account-scope attack manually for account, related-record, document and AI paths.
- Record a reproducible performance test and the exact index/query-plan evidence.
- Confirm `.env` and secrets are absent from Git history and use rotated credentials.
- Re-run backend tests, frontend lint/build, migrations and a clean-environment setup.
