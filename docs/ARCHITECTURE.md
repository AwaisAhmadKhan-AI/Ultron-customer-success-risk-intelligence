# Customer Success Risk Intelligence Platform — Architecture

**Version:** 0.2 — updated to owner decisions
**Status:** Working v1 architecture baseline

## 1. Purpose

Describe the major components, their responsibilities, and how a request moves through the system. The goal is to keep the app understandable, secure, testable, and possible to change without mixing every responsibility together.

## 2. Proposed high-level architecture

```text
React + TypeScript UI
        |
        | HTTPS / JSON REST API
        v
FastAPI routers and request/response validation
        |
        +--> Authentication and resource-level authorization
        |
        +--> Business services
        |       +--> Account / Contact / Interaction / Task services
        |       +--> Risk signal service
        |
        +--> AI orchestration service
        |       +--> Authorized retrieval service
        |       |       +--> PostgreSQL records
        |       |       +--> Document chunks + pgvector
        |       +--> LLM provider adapter
        |       +--> Structured-output validation
        |       +--> Citation / evidence validation
        |
        v
Repository / data-access layer
        |
        v
PostgreSQL (+ pgvector extension)

Private document storage <-- document metadata in PostgreSQL
```

The UI never connects directly to PostgreSQL or to the LLM provider. It communicates with the backend API. The backend is responsible for authorization, validation, business rules, database access, and safe AI orchestration. V1 uses JWT bearer auth, one `csm` role, Groq for LLM calls, Jina `jina-embeddings-v3` (1024 dimensions), and Tailwind CSS.

## 3. Component responsibilities

### Frontend — React + TypeScript
- Shows the dashboard, account details, tasks, documents, risk signals, and AI insights.
- Collects user input and calls FastAPI endpoints.
- Handles loading, empty, success, validation-error, permission-denied, and AI-failure states.
- Does not enforce security by hiding buttons alone; server authorization remains authoritative.
- Uses server/API data as the source of truth for persisted records.

### API layer — FastAPI routers
- Defines HTTP endpoints and request/response schemas.
- Performs input validation and translates service results into HTTP responses.
- Avoids embedding complex business logic directly in route functions.

### Authentication and authorization
- Authentication establishes who the caller is.
- Authorization checks what the identified caller may do.
- Every protected account operation verifies resource access on the server.
- Account listing starts from the caller's allowed account scope; user-supplied filters only narrow that result set.

### Service layer
- Implements business decisions such as account/task state changes, archive behavior, risk-signal resolution, and duplicate-upload rules.
- Coordinates repositories and transaction boundaries.
- Enforces cross-entity consistency (for example, ensuring a contact belongs to the account referenced by an interaction).

### Repository/data-access layer
- Encapsulates SQLAlchemy queries and persistence operations.
- Applies account-scope predicates to protected reads and writes, or accepts an already-verified scope in a way that cannot be bypassed.
- Supports pagination and query optimization.

### Database — PostgreSQL + pgvector
- Stores structured business records and document chunks.
- Stores vector embeddings in `document_chunks` using pgvector if that is approved and installed.
- Uses primary keys, foreign keys, unique/check constraints, indexes, and Alembic migrations to protect data integrity.

### Document ingestion
- Verifies authorization, file type, and size before accepting a file.
- Computes a content hash for duplicate detection.
- Stores the file in approved private storage and metadata in PostgreSQL.
- Extracts text, divides it into chunks, creates embeddings, and records ingestion status.
- Does not treat document text as trusted instructions.

### AI orchestration
- Re-checks access to the requested account.
- Retrieves only evidence within authorized account scope.
- Sends explicit system instructions and clearly delimited evidence to the LLM adapter.
- Validates the returned structure and verifies every citation against retrieved records/chunks.
- Stores an AI insight separately from the account's authoritative `risk_level`.
- Returns a safe no-answer or failure result when evidence/output validation fails.

## 4. Important request flows

### 4.1 Load an account dashboard
1. User signs in; the backend resolves their identity.
2. The frontend requests the account list with filters and pagination.
3. Backend authorization derives the user's allowed account IDs from `account_assignments`.
4. Repository applies that scope first, then status/risk/date/task filters.
5. API returns a bounded page of accounts and dashboard fields.

### 4.2 Create a follow-up task
1. Frontend submits task fields to FastAPI.
2. Request schema validates types and allowed enum values.
3. Backend checks the user can access the referenced account and is allowed to assign the task to the selected user.
4. Service enforces task rules and writes through the repository in a transaction.
5. API returns the created task; frontend refreshes or updates server state.

### 4.3 Ask AI to analyze an account
1. API authenticates the caller and checks permission for the account.
2. Retrieval selects relevant interactions and document chunks only from that authorized account scope.
3. Retrieved sources are packaged with source IDs and text as untrusted evidence.
4. LLM adapter applies timeout and returns a structured candidate result.
5. Schema validator checks fields/enums; citation validator checks IDs and excerpts against retrieved evidence.
6. If evidence is insufficient or validation fails, return a safe no-answer/failure response; do not treat it as a valid insight.
7. Valid insight and evidence references are persisted separately from the stored account risk level.

## 5. Proposed module boundaries

Names are illustrative; align them with the existing repository if one already exists.

```text
frontend/src/
  features/accounts/
  features/contacts/
  features/interactions/
  features/tasks/
  features/documents/
  features/ai-insights/
  shared/api/
  shared/components/

backend/app/
  main.py
  api/routers/
  api/schemas/
  core/config.py
  core/security.py
  db/session.py
  models/
  repositories/
  services/
  ai/llm_adapter.py
  ai/retrieval.py
  ai/schemas.py
  ai/citations.py
```

Do not reorganize a working existing repository only to match these exact names. Preserve established conventions unless there is a clear reason to change them.

## 6. Key decisions and trade-offs

| Decision | Why | Trade-off / check |
|---|---|---|
| Router → service → repository | Separates HTTP, business logic, and persistence | More files/boilerplate; test service and API boundaries |
| PostgreSQL as primary store | Relational constraints and transactions for business data | Requires thoughtful schema/indexes |
| PostgreSQL + pgvector for initial RAG | Keeps structured records and vectors close; easier account filters | Must verify extension availability and vector-index performance |
| LLM provider adapter | Centralizes timeout/config and enables mocks/provider changes | Extra abstraction; tests should cover adapter contract |
| AI risk separate from stored risk | Maintains human control and clear source-of-truth | UI must explain both values clearly |
| Server-side account scope before retrieval | Prevents cross-account evidence reaching the model | Retrieval queries are more complex; test leakage explicitly |

## 7. Failure behavior

- Invalid request fields: return HTTP 422 with a safe, structured validation error.
- Unauthenticated request: return HTTP 401.
- Authenticated user without resource permission: return HTTP 403, as required by the assignment.
- Missing resource within an otherwise permitted scope: use a consistent not-found policy (HTTP 404 may reduce resource-existence disclosure); agree and document the policy.
- Database/provider failure: return a safe error without secrets, stack traces, or customer content in the response.
- AI timeout, malformed output, unsupported answer, or invalid citation: do not return a trusted insight; report a safe no-answer/failure state and log a correlation ID.

## 8. Local implementation assumptions

- The project starts from an empty `E:\Ultron` app folder; only the `Docs` folder currently exists.
- Use JWT bearer authentication and the `csm` role for v1, with two CSM users assigned to different accounts.
- Use Groq through the OpenAI-compatible API adapter and Jina `jina-embeddings-v3` with 1024 dimensions. Actual credentials must live only in a local backend `.env` file and must never be pasted into chat or committed.
- Use local private file storage for development, with file metadata in PostgreSQL; enforce a 10 MB limit and accept PDF/TXT/Markdown.
- Define and document initial deterministic risk rules; authorized CSMs may update stored risk under those rules, while AI suggestions remain separate.
- Verify whether PostgreSQL server is installed/running and whether the pgvector extension is available. Docker is not currently installed according to the environment check.
- Use Tailwind CSS for frontend styling.
- Retention duration remains unspecified; no automatic purge will be implemented.
