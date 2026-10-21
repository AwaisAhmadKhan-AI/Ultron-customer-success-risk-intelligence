# Ultron — Architecture and Request Flows

**Status date:** 2026-10-21  
**Status:** Current implementation overview; where a layer is not consistently used, that limitation is called out rather than hidden.

## 1. System context

Ultron is an internal workspace for Customer Success Managers (CSMs). The React application lets an authenticated CSM select and manage assigned accounts, maintain account-related records, upload documents, and request evidence-grounded AI analysis. FastAPI owns the API boundary, authentication/authorization, validation and business operations. PostgreSQL is the source of truth for application records.

```text
Browser (React + TypeScript)
   | REST / JSON, or multipart for document upload
   v
FastAPI application (/api/v1)
   +-- authentication dependency (JWT/current user)
   +-- resource/account-scope authorization
   +-- API routers and Pydantic request/response schemas
   +-- business services
   |     +-- account / overview / contact / interaction / task / risk signal
   |     +-- document ingestion and deduplication
   |     +-- AI insight orchestration
   |     +-- embedding and retrieval services
   v
SQLAlchemy + PostgreSQL (+ vector support for embeddings)
```

The LLM provider is accessed from backend services. The browser must not receive provider API keys or have direct database access.

## 2. Frontend structure

The frontend uses React 19, TypeScript, Vite and Tailwind CSS. The main application shell remains in `frontend/src/App.tsx`; the large UI was split into these modules:

- `frontend/src/pages/OverviewPage.tsx` — dashboard and account overview UI.
- `frontend/src/pages/AccountsPage.tsx` — directory, filters and account management UI.
- `frontend/src/pages/TasksPage.tsx` — task workflows.
- `frontend/src/pages/DocumentsAIPage.tsx` — document upload and AI workspace.
- `frontend/src/components/shared.tsx` — shared UI components.
- `frontend/src/types/app.ts` — shared application types.
- `frontend/src/lib/presentation.ts` — presentation helpers.

The app shell still coordinates authentication, navigation, selected account, shared state and a portion of API request/handler logic. This is an initial modularization, not a claim that every API call and state hook has been moved to dedicated service/hook layers.

Page navigation is reflected in browser paths: `/`, `/accounts`, `/tasks`, and `/documents-ai`. Browser history/back-forward events synchronize the active view.

## 3. Backend structure and boundaries

- `backend/app/main.py` creates the FastAPI application and mounts routers.
- `backend/app/api/` exposes resource-specific HTTP routes and request validation.
- `backend/app/api/deps.py` contains shared request dependencies including current-user/account authorization logic.
- `backend/app/schemas/` defines Pydantic request/response models.
- `backend/app/services/` contains domain operations, document processing, AI insight orchestration, embeddings and retrieval.
- `backend/app/repositories/` contains repository/query modules for account and account-overview data.
- `backend/app/models/` defines SQLAlchemy persistence models and relationships.
- `backend/alembic/` holds schema migrations.

The project contains repository modules for account and account-overview queries. Do not claim every CRUD service uses a universal repository abstraction without reviewing the specific service; some services can interact with SQLAlchemy sessions directly. The important boundary is that routers should remain thin, authorization is server-side, and schemas/services/data access have identifiable responsibilities.

## 4. Main request flows

### 4.1 Account directory

1. React calls the account-list endpoint with search/filter/pagination parameters and a bearer token.
2. FastAPI authenticates the token and scopes the list to the current CSM's permitted account assignments.
3. Inputs are validated and query filters are applied server-side.
4. SQLAlchemy retrieves the page and total count; the API returns account records and pagination metadata.
5. React renders the records and selection controls.

### 4.2 Update an account-scoped record

1. React sends a request with the selected account ID and record ID.
2. FastAPI authenticates the user and checks the parent account assignment on the server.
3. The route validates the request schema and invokes the relevant service operation.
4. The service applies entity lifecycle rules and persistence constraints.
5. The client refreshes the account overview and shows a success/error message.

A valid JWT must not be treated as authorization for an arbitrary account ID.

### 4.3 Document upload and duplicate protection

1. React validates the extension and client-side size limit, then sends a multipart form containing `file` and optional `title`.
2. Backend verifies account scope and accepted upload rules.
3. The service calculates a content hash and persists the document/ingestion artifacts.
4. Account-scoped uniqueness and database constraints protect against duplicate content; a duplicate upload returns conflict rather than silently creating another logical document.
5. Document chunks/embeddings are used for authorized retrieval. Document text is untrusted input, not an instruction channel.

### 4.4 AI-assisted analysis

1. The API authenticates the CSM and authorizes the target account.
2. Retrieval is constrained to the account's authorized source records, including eligible document chunks and interactions.
3. The service constructs the evidence context and invokes the configured LLM adapter.
4. Structured output is validated; source IDs/types are checked against retrieved, authorized evidence before the insight is accepted.
5. The response separates AI suggestions from stored account fields and returns available source evidence/citations.
6. If evidence is missing, output is malformed, citations are invalid, or a provider fails, the service must not return an unsupported successful finding.

## 5. Data and security boundaries

- PostgreSQL is authoritative for account fields, assignments, contacts, interactions, tasks, risk signals and document/insight records.
- JWT establishes identity; `account_assignments` constrains account access.
- Authorization must happen before account data or chunks are constructed into the LLM context.
- Retrieved text is treated as untrusted evidence. It cannot override system policy or authorize cross-account access.
- Citations must reference actual retrieved source records; a citation string produced by a model is not proof by itself.
- The stored account risk level and AI-suggested risk level remain separate.

## 6. Migrations, testing and verification

- Alembic migrations are the mechanism for schema evolution.
- The development database was verified at revision `cdf526010a2b (head)` on 2026-10-21.
- The latest complete backend suite reported 53 passing tests.
- Frontend ESLint and TypeScript/Vite production build passed after page modularization.
- The account-assignment index was checked in a query plan. Observed buffer accesses decreased and the plan used the index; wall-clock measurements were noisy, so no quantified end-to-end latency improvement is claimed.
- A 12-case evaluation catalog is provided under `evaluation/`. Its structure validator does not run the LLM/RAG pipeline. Live outcomes and metrics still need to be recorded.

## 7. Known architecture limits

- `App.tsx` still has central shared state and action handlers; further extraction into API-client modules and domain hooks is possible.
- Repository abstraction is not confirmed uniform for every entity.
- Formal deployment observability, alerting, backup/restore and production secret-management controls need deployment-specific review.
- Data retention and audit-log retention periods remain policy questions.
