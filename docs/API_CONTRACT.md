# Customer Success Risk Intelligence Platform — API Contract

**Version:** 0.2 — updated to owner decisions
**Status:** Proposed v1 contract; adjust after implementation tests if a concrete reason appears.

## 1. API principles

- Base path: `/api/v1` (proposed).
- JSON request/response bodies except document upload, which uses `multipart/form-data`.
- Authentication is required for protected endpoints.
- Every account-scoped operation enforces resource-level authorization on the backend.
- Do not accept a client-supplied `account_id` as proof of permission.
- List endpoints are paginated and impose a maximum page size.
- Use Pydantic request/response schemas; do not expose password hashes or internal secrets.
- Enum and type errors return HTTP 422.

## 2. Common response and errors

Successful single-resource response (illustrative):

```json
{
  "data": {
    "id": "<uuid>",
    "name": "Acme Inc."
  }
}
```

Successful list response (illustrative):

```json
{
  "data": [],
  "pagination": {"limit": 20, "offset": 0, "total": 0}
}
```

Error response (illustrative):

```json
{
  "error": {
    "code": "RESOURCE_FORBIDDEN",
    "message": "You are not allowed to access this resource.",
    "request_id": "<correlation-id>"
  }
}
```

Do not return stack traces, raw SQL errors, API keys, or unfiltered provider responses.

## 3. Authentication / current user

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Verify credentials and return a JWT access token |
| `GET` | `/api/v1/me` | Return the current user's public profile and role |

V1 uses JWT bearer authentication. Proposed endpoints: `POST /api/v1/auth/login` returns an access token; `GET /api/v1/me` returns the current user profile. Do not return password hashes or tokens in logs.

## 4. Accounts

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/accounts` | List authorized accounts with filtering, sorting, pagination |
| `POST` | `/api/v1/accounts` | Create an account and assign it to the creating CSM in the same transaction |
| `GET` | `/api/v1/accounts/{account_id}` | Get authorized account detail |
| `PATCH` | `/api/v1/accounts/{account_id}` | Update allowed account fields |
| `POST` | `/api/v1/accounts/{account_id}/archive` | Archive account |
| `POST` | `/api/v1/accounts/{account_id}/restore` | Restore an archived account if authorized |

Proposed list query parameters:

- `q`: search by account name; industry/domain only if included in the schema.
- `risk_level`: repeated or comma-separated low/medium/high/critical values; choose one stable representation.
- `status`: active/renewal_pending/churned. `at_risk` belongs to the separate risk-level concept, not the account status enum.
- `renewal_within_days`: supported integer window such as 30, 60, 90.
- `has_open_tasks`: boolean.
- `include_archived`: default false; permission-checked.
- `sort_by`: allow-listed value (`renewal_date`, `risk_level`, `last_interaction_at`).
- `limit`: default 20; maximum 100 (proposed).
- `offset`: default 0; non-negative.

Authorization scope must be applied before all these filters.

## 5. Account-scoped records

The following endpoint patterns reflect v1 decisions; all endpoints still require authentication, account-scope authorization, schema validation, and tests.

| Entity | Proposed endpoint | Main operations |
|---|---|---|
| Contacts | `/api/v1/accounts/{account_id}/contacts` | GET list, POST create; GET/PATCH/DELETE individual contact; DELETE is scoped to authorized account and must respect FK integrity |
| Interactions | `/api/v1/accounts/{account_id}/interactions` | GET list, POST create; limited correction/update, archive only under an explicit rule |
| Tasks | `/api/v1/accounts/{account_id}/tasks` | GET list, POST create; GET/PATCH/DELETE individual task; mark done |
| Risk signals | `/api/v1/accounts/{account_id}/risk-signals` | GET list, POST manual signal; acknowledge/resolve/dismiss actions |
| Documents | `/api/v1/accounts/{account_id}/documents` | GET list, POST upload; GET metadata; archive |
| AI insights | `/api/v1/accounts/{account_id}/ai-insights` | GET history, POST generate; GET a specific insight |

Every route must verify account access and validate that child/source records refer to the same account.

## 6. Document ingestion

`POST /api/v1/accounts/{account_id}/documents`

- Content type: `multipart/form-data`.
- Input: one PDF, TXT, or Markdown file; DOCX excluded from v1.
- Maximum upload size: 10 MB.
- Backend checks authorization, extension/content type, size, and duplicate content hash.
- Response indicates document ID and ingestion status; extraction can finish asynchronously or synchronously depending on the existing project and deadline. If asynchronous, expose status via `GET /api/v1/documents/{document_id}`.
- Repeated upload of identical content to the same account must follow a documented idempotency/deduplication response.

## 7. Generate AI insight

`POST /api/v1/accounts/{account_id}/ai-insights`

Proposed request:

```json
{
  "question": "Why might this account be at risk?",
  "include_interactions": true,
  "include_documents": true
}
```

Proposed successful response:

```json
{
  "data": {
    "id": "<uuid>",
    "account_id": "<uuid>",
    "status": "completed",
    "suggested_risk_level": "high",
    "summary": "...",
    "risk_factors": ["..."],
    "recommended_actions": ["..."],
    "confidence": "medium",
    "evidence": [
      {
        "source_type": "document",
        "source_id": "<verified-source-id>",
        "title": "Renewal meeting notes",
        "date": "2026-10-10",
        "excerpt": "..."
      }
    ]
  }
}
```

This is a proposed contract, not production code. Exact fields/values must match the selected provider, Pydantic schema, and data model. The model's citations must be matched to retrieved evidence before they are returned. The AI suggested risk never automatically overwrites `accounts.risk_level`.

## 8. HTTP status conventions

| Status | Use |
|---|---|
| 200 | Successful read/update/action |
| 201 | Resource created |
| 202 | Processing accepted but not yet complete, if asynchronous ingestion is used |
| 401 | Unauthenticated |
| 403 | Authenticated but resource access is not permitted; required for the assignment's authorization attack test |
| 404 | Resource not found, or consistently concealed by policy |
| 409 | Duplicate upload/conflict when not returned as an idempotent success |
| 413 | Upload exceeds maximum size |
| 415 | Unsupported media type |
| 422 | Invalid request or enum/filter values |
| 429 | Provider/request rate limit when applicable |
| 502/503/504 | Safe upstream/provider failure or timeout mapping, according to the API's agreed error contract |

Choose one consistent policy for inaccessible-vs-missing resources to avoid leaking resource existence.

## 9. Required tests for the contract

- Valid account list and detail requests return only allowed accounts.
- Invalid filters return 422.
- User A modifying a URL to use User B's account ID receives 403 (or the documented concealment behavior if approved by the lead; the assignment states 403).
- Child records cannot be attached across account boundaries.
- Duplicate file upload behaves according to the documented idempotency rule.
- AI response with invalid schema or invented citations is not returned as a valid insight.
- Insufficient-evidence request follows a safe no-answer behavior.
