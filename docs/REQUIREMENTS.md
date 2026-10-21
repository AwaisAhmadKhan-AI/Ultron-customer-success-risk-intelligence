# Customer Success Risk Intelligence Platform — Requirements

**Document:** `REQUIREMENTS.md`
**Version:** 0.3 — updated to owner decisions
**Status:** Working v1 baseline; the remaining policy note is retention duration.

## 1. Business Problem

Customer Success Managers (CSMs) manage many enterprise customer accounts, but information about each customer is fragmented across account records, notes, support interactions, meeting summaries, renewal information, and product feedback.

This makes it difficult to identify which accounts need attention, understand why an account may be at risk, find supporting evidence, and choose an appropriate next action.

## 2. Product Goal

Build an internal Customer Success workspace that brings account-related information together and helps CSMs identify and prioritize accounts requiring attention.

AI-assisted analysis will summarize potential risk factors and recommend possible actions using relevant, authorized evidence. CSMs remain responsible for reviewing that evidence and deciding what to do.

## 3. Users and Access Scope

### V1 user role: Customer Success Manager (CSM)

V1 uses one application role: `csm`. Create at least two CSM users with different account assignments to verify resource-level authorization. Users can access only accounts assigned to them and the records belonging to those accounts. A valid JWT alone must not grant access to every account. Manager/Admin roles are excluded from v1 unless a later confirmed requirement changes the scope.

**Supporting security records:** `users` and `account_assignments` support authentication and resource-level authorization. They are additional supporting tables, not extra core business entities.

## 4. Functional Requirements

### FR-01 — Account dashboard

The system shall provide an account overview, account status, stored risk level, recent interactions, and open tasks.

**Acceptance check:** An authorized user can see these details for accounts within their permitted scope.

### FR-02 — Account detail view

The system shall provide an account detail view with the account's related contacts, interactions/notes, tasks, risk signals, documents, and available AI insights.

**Acceptance check:** A user can review the relevant account information in one account context without manually searching unrelated records.

### FR-03 — Manage the seven core business entities

The workspace shall support the following seven core domain concepts:

1. Accounts
2. Contacts
3. Interactions
4. Tasks
5. Risk Signals
6. Documents
7. AI Insights

Not every entity needs the same operations. The allowed operations depend on the meaning and lifecycle of that entity. In v1, accounts, interactions, and documents are archived rather than hard-deleted; contacts and tasks support full CRUD, including delete. Risk signals retain resolution/dismissal history, and AI insights are generate/view only.

| Entity | Proposed v1 operations | Reason / constraints |
|---|---|---|
| Accounts | Create, view, update, archive/unarchive | Preserve history; archived accounts are excluded from normal lists by default. |
| Contacts | Create, view, update, delete (hard delete allowed within authorized scope) | User selected full CRUD for contacts. Verify related-record behaviour and use safe foreign-key constraints. |
| Interactions | Create, view, restricted correction/update, archive only when justified | Interactions represent historical records; preserve an audit trail for corrections. |
| Tasks | Create, view, update, delete, mark done | User selected full CRUD for tasks. Deleting a task must not bypass account authorization or corrupt unrelated records. |
| Risk Signals | Create manually or by rules, view, acknowledge, resolve, dismiss with reason | Preserve resolved/dismissed signals and reasons for audit. |
| Documents | Upload, view, archive | Documents have an ingestion and retrieval lifecycle; protect their source history. |
| AI Insights | Generate and view | AI insights are advisory generated outputs, not records users edit as if they were source facts. Regenerate a new insight rather than editing the model's result. |

### FR-04 — Account search and filtering

Account search and filters are required in v1. Filters must be combinable and applied on the server.

| Filter | Proposed behaviour |
|---|---|
| `q` | Case-insensitive search by account name; search industry/domain only if those fields are actually included in the data model. |
| `risk_level` | One or more of `low`, `medium`, `high`, `critical`. |
| `status` | One or more of `active`, `renewal_pending`, `churned`. See the status/risk distinction below. |
| `renewal_within_days` | Optional integer window; initially support agreed values such as 30, 60, or 90 days. |
| `has_open_tasks` | Boolean filter. |
| `include_archived` | Defaults to `false`; only authorized users may include archived accounts. |

**Result behaviour:**

- Account list endpoints must use pagination and enforce a maximum page size.
- Results may be sorted by renewal date, stored risk level, or last interaction date.
- The authorization scope is applied before the user-supplied filters. Filters can narrow a user's results but can never widen access.
- Invalid filter values return a validation error (HTTP 422), not a generic server error (HTTP 500).

**Search scope in v1:**

- Account search and filtering are required.
- Contacts can be searched by name/email, and interactions/tasks can be searched by text within the permitted account scope.
- Semantic search over documents is part of the RAG retrieval workflow and must be account-scoped.
- A single global search box that combines every entity into one result list is a stretch goal, not a prerequisite for the first version.

### FR-05 — Notes and interaction history

The system shall make account notes and recent customer interactions available in the relevant account context.

For v1, represent notes as a type of interaction or as a clearly defined account-related record; do not add a separate Notes entity without a requirement-driven reason.

**Acceptance check:** A user can see which account each interaction belongs to and review the history in context.

### FR-06 — Tasks and follow-up

The system shall let users create and track account-related tasks with a title, assignee, priority, due date, and status.

Proposed task statuses: `open`, `in_progress`, and `done`. The overdue state is computed from the due date and status rather than maintained as an unrelated manual status. Reminders are out of scope for v1.

**Acceptance check:** A user can find open or overdue tasks for an authorized account and track a task through its status changes.

### FR-07 — Account risk signals

The system shall display risk signals linked to an account and, where possible, to the source record that prompted the signal.

The following concepts must remain distinct:

| Concept | Meaning | Proposed source |
|---|---|---|
| Interaction | A source record such as a note, support event, or meeting summary | User entry or seed data |
| Risk signal | A structured flag for a possible problem, linked to its source when available | Manual entry or deterministic business rules |
| AI insight | An advisory analysis that summarizes authorized evidence and cites its sources | Generated by AI when requested |

A CSM may acknowledge, resolve, or dismiss a signal with a reason. Dismissed/resolved signals are retained for audit rather than permanently deleted.

### FR-08 — Stored risk level and AI-suggested risk level

Stored account risk levels shall use `low`, `medium`, `high`, or `critical`.

The stored risk level shall be set by documented deterministic rules or an authorized CSM. AI may recommend a separate risk level as part of an insight, but it must not silently overwrite the stored account risk level. The initial rules and who may manually override them must be documented before implementation.

### FR-09 — AI-assisted account analysis

The system shall provide AI-assisted account analysis with a structured result containing:

- Suggested risk level
- Summary
- Risk factors
- Recommended actions
- Supporting evidence references
- Confidence level

The output schema and allowed confidence values will be defined in the API/AI design. The CSM reviews the result and remains responsible for the final decision.

### FR-10 — Evidence and citations

AI-derived findings must provide relevant supporting evidence where available. Each citation should identify the source record, source type (at minimum document or interaction), title, date, and excerpt or chunk identifier.

A citation must be verified against evidence actually retrieved by the system. The system must not accept invented source IDs or excerpts as valid citations.

### FR-11 — Insufficient evidence and AI failure

When authorized records do not provide enough evidence, the system shall communicate that limitation rather than present an unsupported conclusion as fact.

The API and UI must safely handle AI timeouts, malformed structured output, insufficient evidence, and invalid citations. Failed or unvalidated AI output must not be shown as a trusted result.

### FR-12 — Document upload and ingestion

The system shall accept PDF, TXT, and Markdown (`.md`) documents in v1. DOCX is excluded from v1.

- Text extraction occurs server-side.
- Maximum upload size is 10 MB per file as the v1 working target.
- Duplicate detection uses a SHA-256 content hash with a uniqueness rule scoped to the account (for example, unique `(account_id, content_hash)`).
- Ingestion and retrieval must preserve account ownership so one account's documents cannot be retrieved in another account's context.

### FR-13 — Facts and AI conclusions

The UI and API shall distinguish source facts stored in the system from AI-generated summaries, inferences, risk suggestions, and recommendations.

**Acceptance check:** A user can identify which content came from a source record and which content was generated by AI.

## 5. Non-Functional and Engineering Requirements

### NFR-01 — Resource-level authorization

Authorization shall be enforced on the server for every protected operation. Users may access only permitted accounts and related records. The same restriction must apply to document retrieval and AI evidence construction.

**Verification:** Create at least two CSM users with different account scopes. Attempt to access User B's protected resource while authenticated as User A by changing the resource ID. The assignment's expected result is `403 Forbidden` for an unauthorized request.

### NFR-02 — Prompt-injection resistance

Instructions found inside uploaded customer documents shall be treated as untrusted data, not as system instructions. Document content must not override authorization or cause information from another account to be disclosed.

### NFR-03 — Retrieval isolation and grounding

Retrieval must be restricted to authorized account data before evidence is provided to the LLM. Answers and citations must be grounded in retrieved authorized evidence. The system must have a defined no-answer behaviour when evidence is insufficient.

### NFR-04 — Duplicate/retry safety

Repeated document ingestion or retried operations must not unintentionally create duplicate records. The implementation must document its idempotency/deduplication decision and demonstrate the behaviour with a test.

### NFR-05 — Database migration safety

Database schema changes shall be managed with Alembic. At least one meaningful migration must demonstrate `upgrade`, `downgrade`, and `upgrade` again, with the potential impact on existing data explained.

### NFR-06 — Maintainable architecture

The application shall keep frontend, API, business logic, persistence, and AI responsibilities separate. The proposed backend flow is:

`router → dependency/authentication/authorization → service/business logic → repository/data access → PostgreSQL`

AI orchestration, retrieval, structured-output validation, and citation validation should have identifiable responsibilities rather than being placed directly inside route handlers.

### NFR-07 — Performance and observability

The project must identify one real inefficiency, demonstrate or measure it, explain the cause, and show an improvement. Examples include N+1 queries, unbounded API lists, duplicate frontend requests, poor database filtering, or sending unnecessary context to an LLM.

Errors and important runtime events should be observable without logging secrets or unnecessarily exposing customer data.

**Initial v1 test targets selected for this build (not guaranteed performance results):**

- Exercise the application with approximately 500 seeded accounts.
- Maximum document size: 10 MB.
- Paginate list endpoints with a default page size of 20 and maximum of 100.
- Target p95 latency below 500 ms for non-AI API calls in the local test setup; record how and where it was measured.
- Set an AI request timeout of 30 seconds.

These are engineering test assumptions, not measured achievements. Document-retention duration remains unspecified; archive items by default and do not implement an automatic purge until a policy is defined.

### NFR-08 — AI evaluation

Include at least 12 representative AI evaluation cases: straightforward questions, multi-source questions, unsupported questions, an ambiguous question, conflicting evidence, exact-identifier/search, prompt injection, and authorization/data-leakage cases. Report retrieval success, citation validity, supported-answer/no-answer behaviour, latency, approximate token/cost usage, and security failures.

## 6. User Stories

1. **As a CSM,** I want to view authorized customer accounts with their status and risk level so that I can prioritize accounts requiring attention.
2. **As a CSM,** I want to review contacts, notes, interactions, documents, and tasks in an account context so that I can understand the customer's situation.
3. **As a CSM,** I want to search and filter accounts so that I can find relevant customers without scanning every record manually.
4. **As a CSM,** I want AI-assisted analysis with supporting evidence and recommended actions so that I can understand potential risks and make informed decisions.
5. **As a CSM,** I want to create and track follow-up tasks with due dates so that important actions are not forgotten.

## 7. Scope and Non-Goals

### In scope

- Internal Customer Success workspace for account-focused work.
- Dashboard showing account overview, status, stored risk level, recent interactions, and open tasks.
- Account details, notes, contacts, interactions, tasks, risk signals, documents, and AI insights.
- Account search/filtering and scoped text/semantic retrieval as defined above.
- Evidence-backed AI account analysis that keeps AI suggestions separate from stored facts/risk levels.
- Server-side resource authorization, prompt-injection handling, safe AI failure behaviour, and the required engineering demonstrations.

### Proposed non-goals

- AI will advise the CSM; it will not independently make final customer, commercial, or renewal decisions.
- Billing or payment processing is excluded unless explicitly requested.
- Replacing the company's entire CRM is not an objective.
- External CRM, support-desk, calendar, or email integrations are excluded from v1; information is entered manually or uploaded.
- Automatic customer renewal execution and reminders are excluded from v1.
- Permanent deletion is excluded for accounts, interactions, and documents in v1. Contacts and tasks support delete as selected; enforce account scope and referential integrity. Risk signals are resolved/dismissed with a reason, and AI insights remain read-only.

## 8. Assumptions and Open Questions

The current working decisions are:

1. **Roles:** V1 has the `csm` role only. At least two CSM users have different account assignments. Manager/Admin roles are out of scope for this build.
2. **Risk rules:** The stored risk level is set by documented deterministic rules or by an authorized CSM. AI suggestions remain separate. The exact rule thresholds still need to be defined during implementation.
3. **Status vocabulary:** Account status is `active`, `renewal_pending`, or `churned`. Risk level is separately `low`, `medium`, `high`, or `critical`; `at_risk` is not a status value.
4. **Filters:** Use the documented account filters, default page size 20, maximum 100, and sorting by renewal date, risk level, or last interaction date. `renewal_within_days` accepts bounded supported values (initially 30, 60, or 90).
5. **Documents:** PDF, TXT, and Markdown only in v1; 10 MB maximum per file. DOCX is out of scope.
6. **Citations:** Display source ID/type, title, date, and the verified excerpt or chunk ID.
7. **Deletion/archive:** Accounts, interactions, and documents use archive/soft-delete. Contacts and tasks support delete, subject to authorization and database constraints. Risk signals are acknowledged/resolved/dismissed with a reason and retained. AI insights are generate/view only.
8. **Performance:** Use the initial test targets in NFR-07 and record measurement method/results; targets are not claims until tested.
9. **Retention:** No automatic purge policy will be implemented in v1. Retention remains a documented limitation/open policy question.

## 9. Initial Acceptance Checklist

- [ ] Dashboard shows account overview, account status, stored risk level, recent interactions, and open tasks.
- [ ] An authorized user can view an account and its related records.
- [ ] Search/filtering is server-side, validated, paginated, and restricted to authorized account scope.
- [ ] Tasks can be tracked with assignee, due date, priority, and status.
- [ ] Risk signals can be acknowledged/resolved/dismissed while preserving the reason and history.
- [ ] AI insights contain risk factors, recommendations, confidence, and traceable supporting evidence.
- [ ] AI-suggested risk is not silently written over the stored account risk level.
- [ ] Insufficient evidence, timeouts, malformed output, and invalid citations produce safe outcomes.
- [ ] Prompt injection in a document does not override instructions or expose another account's data.
- [ ] At least two differently scoped CSM users are tested; cross-scope access returns `403 Forbidden` as required by the assignment.
- [ ] Repeated document upload is deduplicated according to the documented policy.
- [ ] A meaningful Alembic migration passes upgrade → downgrade → upgrade.
- [ ] A retrieval failure is diagnosed and documented.
- [ ] A real performance issue is measured and improved.
- [ ] The AI evaluation dataset contains at least 12 representative cases and reports the required metrics.

## 10. Architecture Decisions to Explain

These are working choices, not proof that the implementation is correct. Verify each through tests and document results.

| Decision | Requirement supported | Alternative | Reason for proposal | Trade-off / verification |
|---|---|---|---|---|
| Layered backend: router → dependency → service → repository | Maintainability and authorization | Put all logic in route handlers | Separates HTTP, business rules, and data access | More structure; test services and API routes. |
| Server-side account-scope authorization | Resource isolation | Role checks alone or frontend hiding | A valid token must not grant unrestricted access | Additional checks/queries; prove cross-scope access is denied. |
| Stored risk level based on rules or authorized CSM input; AI advisory | Fact/recommendation distinction | Let AI directly overwrite account risk | Easier to explain and test; preserves human control | Rules need explicit definitions; unit-test rules and ensure AI cannot overwrite stored risk. |
| PostgreSQL + pgvector | Database persistence and RAG | Separate relational and vector databases | Keeps account metadata and embeddings in one data platform for this project | Confirm query/filter behaviour with authorized-retrieval tests. |
| Filter retrieval by account scope before calling the LLM | Privacy and grounding | Filter after generation | Other accounts' evidence should never enter the model context | Requires scope-aware retrieval; run leakage tests. |
| LLM adapter plus schema validation | Maintainability and safe AI failure | Call provider SDK directly in business logic | Centralizes timeout/configuration and makes failures mockable | Extra abstraction; test timeout and malformed output. |
| Validate citations against retrieved chunks | Grounding | Trust model-generated citations | Prevents unsupported source references | Some answers may be rejected; test invalid citations. |
| No-answer behaviour for insufficient evidence | Trustworthiness | Always return an answer | Avoids presenting guesses as sourced facts | Lower answer coverage; test unsupported questions. |
| Treat document text as untrusted evidence | Prompt-injection resistance | Mix document text into trusted instructions | Separates trusted instructions from customer content | Not a complete guarantee by itself; run injection and data-leakage tests. |
| Account-scoped content hash for document deduplication | Idempotency | Accept every upload as new | Makes retrying an identical upload safe | Requires an appropriate unique constraint; upload the same document twice. |
| Entity-specific delete policy | Data integrity and history | Hard-delete everything | Archive accounts/interactions/documents; allow contact/task deletion; retain risk signal and AI insight history | Test foreign-key behaviour and authorization on every operation. |
| Pagination and query optimization | Performance | Unbounded lists and per-row queries | Limits response size and avoids common N+1 patterns | Adds query/loading decisions; measure before and after. |

## 11. Requirements Review Principle

For every important decision, explain which requirement it supports, what alternative was considered, why the chosen approach fits v1, what trade-off it creates, and how it will be tested. Retention duration remains an explicit unresolved policy question; do not implement automatic purging.
