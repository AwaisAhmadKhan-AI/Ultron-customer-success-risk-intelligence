# Ultron — API Contract (Implemented Route Map)

**Status date:** 2026-10-21  
**Base prefix:** `/api/v1`  
**Purpose:** A concise route map based on the current frontend integration and implemented resource families. The running FastAPI OpenAPI schema remains the final authority for exact field constraints and response schemas.

## 1. Common contract rules

- Protected routes use JWT bearer authentication.
- Account-scoped requests must be authorized by the backend against the current CSM's account assignments.
- Account or child-record IDs supplied by the browser are identifiers, not proof of permission.
- JSON bodies are used for normal create/update operations. Document upload uses `multipart/form-data`.
- The frontend reads an API error's `detail` value where available and shows safe error feedback.
- Never return password hashes, API keys or raw secret configuration in API responses or logs.

## 2. Authentication

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Accepts URL-encoded login credentials and returns a bearer access token on success |
| `GET` | `/api/v1/auth/me` | Returns the currently authenticated user's profile |

Invalid credentials/token paths are covered by authentication integration tests. Protected resources require a valid active user.

## 3. Accounts and overview

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/accounts` | Create an account in the current user's permitted workflow |
| `GET` | `/api/v1/accounts` | List authorized accounts with server-side search, filters and pagination |
| `GET` | `/api/v1/accounts/{account_id}` | Read an authorized account |
| `PATCH` | `/api/v1/accounts/{account_id}` | Update supported account fields |
| `POST` | `/api/v1/accounts/{account_id}/archive` | Archive account without hard deletion |
| `POST` | `/api/v1/accounts/{account_id}/unarchive` | Restore an archived account |
| `GET` | `/api/v1/accounts/{account_id}/overview` | Return account overview and related summary records |

Implemented account-list filters used by the frontend include `page`, `page_size`, `q`, `status`, `risk_level`, `renewal_within_days`, `has_open_tasks`, and `include_archived`. Exact allowed values and bounds are enforced by backend schemas/query validation.

## 4. Account-scoped records

Every route below must first authorize the parent account and ensure the referenced child record belongs to it.

### Contacts

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/accounts/{account_id}/contacts` | Create contact |
| `GET` | `/api/v1/accounts/{account_id}/contacts` | List contacts |
| `GET` | `/api/v1/accounts/{account_id}/contacts/{contact_id}` | Read contact |
| `PATCH` | `/api/v1/accounts/{account_id}/contacts/{contact_id}` | Update contact |
| `POST` | `/api/v1/accounts/{account_id}/contacts/{contact_id}/archive` | Archive contact |

### Interactions

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/accounts/{account_id}/interactions` | Record interaction |
| `GET` | `/api/v1/accounts/{account_id}/interactions` | List interactions |
| `GET` | `/api/v1/accounts/{account_id}/interactions/{interaction_id}` | Read interaction |
| `PATCH` | `/api/v1/accounts/{account_id}/interactions/{interaction_id}` | Correct supported fields |
| `POST` | `/api/v1/accounts/{account_id}/interactions/{interaction_id}/archive` | Archive interaction |

### Tasks

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/accounts/{account_id}/tasks` | Create follow-up task |
| `GET` | `/api/v1/accounts/{account_id}/tasks` | List tasks |
| `GET` | `/api/v1/accounts/{account_id}/tasks/{task_id}` | Read task |
| `PATCH` | `/api/v1/accounts/{account_id}/tasks/{task_id}` | Update task fields |
| `POST` | `/api/v1/accounts/{account_id}/tasks/{task_id}/complete` | Mark task completed |
| `POST` | `/api/v1/accounts/{account_id}/tasks/{task_id}/cancel` | Cancel task |

### Risk signals

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/accounts/{account_id}/risk-signals` | Create risk signal |
| `GET` | `/api/v1/accounts/{account_id}/risk-signals` | List risk signals |
| `GET` | `/api/v1/accounts/{account_id}/risk-signals/{signal_id}` | Read risk signal |
| `POST` | `/api/v1/accounts/{account_id}/risk-signals/{signal_id}/acknowledge` | Acknowledge signal |
| `POST` | `/api/v1/accounts/{account_id}/risk-signals/{signal_id}/resolve` | Resolve signal |
| `POST` | `/api/v1/accounts/{account_id}/risk-signals/{signal_id}/dismiss` | Dismiss signal; request body requires a `reason` |

### Documents

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/accounts/{account_id}/documents` | Upload document using multipart field `file` and optional `title` |
| `GET` | `/api/v1/accounts/{account_id}/documents` | List account documents |
| `POST` | `/api/v1/accounts/{account_id}/documents/{document_id}/archive` | Archive document |

Supported file extensions in the UI are PDF, TXT and Markdown; UI limit is 10 MB. Backend validation must remain the security boundary. Identical content uploaded again to the same account returns a conflict rather than silently duplicating the document.

### AI insights

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/accounts/{account_id}/ai-insights` | Generate an account analysis for the submitted question |

The request uses a JSON body containing the analysis `question`. The response includes insight status and, where available, summary, suggested risk, risk factors, recommended actions, confidence, and verified evidence. Recent insight summaries are presented through the account-overview data. The AI-suggested risk must not silently overwrite the stored account risk field.

## 5. HTTP error semantics

Observed and/or required status behavior includes:

| Status | Meaning |
|---|---|
| `401` | Missing, invalid, expired or otherwise unacceptable authentication |
| `403` | Authenticated user is not permitted to access the requested resource; the assignment's ID-tampering test expects `403` |
| `404` | Resource does not exist (exact concealment policy should be applied consistently) |
| `409` | Duplicate same-content document for an account |
| `422` | Invalid request parameters or schema fields |
| `5xx` | Unexpected backend/provider failure; do not expose internal secrets or stack traces to clients |

## 6. API contract verification checklist

- Account listing never returns accounts outside the current CSM's scope.
- Changing an account ID to another CSM's ID receives the expected forbidden response.
- A child-record ID from another account is not accessible by manipulating the URL.
- Document chunks and AI evidence are filtered by authorization before prompt construction.
- Invalid/unknown citation IDs are rejected; insufficient evidence and provider failures are handled safely.
- Repeating the same document upload follows the documented account-scoped deduplication rule.
- Generated OpenAPI (`/docs`) is checked when routes or request/response schemas change.

**Maintenance note:** Update this document when a route, request body, allowed enum, or response schema changes. Do not leave a design-proposal endpoint in this map if the actual route uses a different path.
