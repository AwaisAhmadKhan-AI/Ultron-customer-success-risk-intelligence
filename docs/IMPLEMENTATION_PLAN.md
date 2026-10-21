# Customer Success Risk Intelligence Platform — Implementation Plan

**Version:** 0.2 — first implementation plan
**Status:** Start from `E:\Ultron`; no frontend/backend source code exists yet.

## 1. Guiding principle

Build a reliable non-AI application first, then add the AI/RAG layer. A chatbot must not hide broken CRUD, data modeling, or authorization. Work in small vertical slices and test each slice before extending it.

## 2. Phase 0 — Discovery and architecture (Monday deliverables)

- [x] Review `REQUIREMENTS.md` and record the owner's current v1 choices; revisit only if testing exposes a contradiction.
- [ ] Finalize the seven entities and supporting tables in `DATA_MODEL.md`.
- [ ] Document the component diagram and request flows in `ARCHITECTURE.md`.
- [ ] Define initial REST endpoints, request/response schemas, status codes, and error contract in `API_CONTRACT.md`.
- [ ] Define user/account scopes and AI/RAG security in `SECURITY_MODEL.md`.
- [ ] Keep remaining unknowns visible instead of silently guessing.
- [ ] Explain the architecture and its trade-offs before large-scale implementation; the assignment includes an architecture review gate.

**Exit check:** Explain the business problem, entity relationships, request path, authorization point, and AI evidence path without reading the document verbatim.

## 3. Phase 1 — Product foundation (Tuesday target)

### Step 1: Inspect and prepare the repository
- Inspect existing frontend/backend structure and preserve useful conventions.
- Verify Node 24, npm through `npm.cmd` if PowerShell blocks `npm.ps1`, Python 3.14, Git, and the installed PostgreSQL service/pgvector extension. Do not change PowerShell execution policy just to invoke npm.
- Add `.env.example` with placeholders only and `.gitignore` entries for `.env`, virtual environments, node_modules, build outputs, and local uploads. Verify no actual key is committed. Rotate any key exposed in chat before configuring a local `.env`.
- Check PostgreSQL Windows service and installation paths; `psql` not found may mean only the PATH is missing. Verify whether the pgvector extension is available before relying on it.

### Step 2: Backend foundation
- Create the FastAPI app startup and configuration from an empty `backend/` directory.
- Configure database engine/session lifecycle and a health endpoint.
- Define SQLAlchemy models for agreed core tables.
- Configure Alembic and create the initial migration.
- Verify upgrade on an empty database; use a disposable test database for downgrade tests.

### Step 3: Authorization baseline
- Implement email/password authentication with secure password hashing and JWT bearer tokens; keep resource authorization as a separate server-side check.
- Create at least two CSM users and distinct account assignments in test seed data.
- Add a reusable backend dependency/service that establishes allowed account scope.
- Test a guessed/changed account ID and require 403 as specified.

### Step 4: Core CRUD vertical slices
Recommended order:
1. Accounts: list/detail/create/update/archive, pagination, filters; assign a newly created account to its creator in the same database transaction.
2. Contacts: list/create/update/delete within an authorized account; define safe foreign-key behavior.
3. Interactions/notes: create/list, limited correction and archival policy.
4. Tasks: create/list/update/done with assignee, due date, priority, status.
5. Risk signals: create/list/acknowledge/resolve/dismiss; retain the reason and history.
6. Documents: metadata/upload validation and ingestion status; accept PDF/TXT/Markdown up to 10 MB (full RAG follows in Phase 2).

Each feature includes schema validation, server authorization, error handling, and API tests before moving on.

### Step 5: Frontend/API integration
- Scaffold React + TypeScript with Vite and configure Tailwind CSS. The installed Node 24 version exceeds Vite's current documented minimum (Node 20.19+ or 22.12+).
- Connect account list/detail, contacts/interactions, and task workflow to real API responses.
- Add loading, empty, validation error, forbidden, and server failure states.
- Confirm persisted data is loaded from the API/database rather than only local mock state.

**Exit check:** The application supports its core workflows without depending on AI.

## 4. Phase 2 — AI and knowledge layer (Wednesday target)

### Step 1: Document ingestion
- Validate file extension/content type and size.
- Calculate SHA-256 and handle duplicate uploads.
- Extract text from PDF/TXT/Markdown; record extraction failures.
- Split extracted text into chunks with stable IDs and metadata.
- Persist chunks with account/document ownership.

### Step 2: Embeddings and retrieval
- Use Jina `jina-embeddings-v3` with 1024 dimensions, and verify response dimensions before persisting vectors.
- Generate embeddings for chunks and store them with pgvector if available.
- Retrieve relevant chunks using similarity search plus mandatory account-scope filtering.
- Add a small retrieval test set and inspect returned source IDs/excerpts.

### Step 3: LLM adapter and structured output
- Place provider calls behind a small adapter with timeout and error mapping.
- Define a Pydantic schema for suggested risk level, summary, risk factors, recommended actions, evidence references, and confidence.
- Reject malformed or out-of-range output.
- Keep AI-suggested risk separate from the stored account risk level.

### Step 4: Citation validation and no-answer path
- Provide the model only retrieved, authorized evidence.
- Validate every citation against the retrieval result; verify ID and excerpt.
- Return insufficient-evidence/no-answer behavior when suitable support is absent.
- Treat document contents as untrusted data to reduce prompt-injection risk.
- Persist only validated insights and traceable evidence references.

**Exit check:** A question can be traced through authorization → retrieval → evidence → LLM → schema validation → citation validation → response, with safe failure behavior.

## 5. Phase 3 — Quality engineering (Thursday target)

- Unit tests for business rules and task/risk transitions.
- API tests for validation, authentication, authorization, and cross-account access.
- Duplicate upload/idempotency tests.
- Alembic upgrade → downgrade → upgrade test on a disposable database.
- AI timeout, malformed structured response, insufficient evidence, invalid citation, and prompt-injection tests.
- Retrieval failure: create a case where the source exists but retrieval misses it; diagnose extraction/chunking/metadata/filter/top-k/threshold/embedding/generation.
- Performance: measure one real issue (N+1, unbounded list, repeated request, or poor DB filtering), improve it, and record before/after evidence.
- Build at least 12 AI evaluation cases as specified in the assignment and report retrieval success, citation validity, no-answer behavior, latency/cost, and security failures.
- Responsive UI, accessibility, logs, README, and limitations cleanup.

## 6. Phase 4 — Production readiness and submission (Friday target)

- Run from a clean environment using documented instructions.
- Apply database migrations from a clean state.
- Run backend tests, frontend tests, lint, typecheck, production build, AI evaluation, and security checks.
- Review `.env.example` and Git history for secrets.
- Submit documentation, tests/evaluation evidence, final commit hash, setup instructions, and architecture diagram.
- Be ready to explain and modify important parts of the code.

## 7. Priority when time is limited

1. Correct authorization and data isolation.
2. Data model/migrations and core CRUD.
3. A stable dashboard and API integration.
4. Grounded AI analysis with verified citations and safe no-answer behavior.
5. Required negative tests and evidence of performance improvement.
6. Polish and optional search features.

Do not sacrifice the security gates to add more features.

## 8. Work session checkpoints for the current catch-up

The following is a realistic *first-pass catch-up schedule*, not a promise to deliver production quality in one night:

1. Review PK/FK and relationships; verify `DATA_MODEL.md`.
2. Complete the six discovery documents and mark open decisions.
3. Inspect the actual project repository; choose changes based on what already exists.
4. Run the app and database before making changes.
5. Complete one end-to-end non-AI slice (prefer account list/detail or tasks), including a test.
6. Implement/verify account-level authorization before AI retrieval.
7. Prepare the AI/RAG flow and implement the smallest testable slice if the foundation is stable.
8. Record what works, what fails, and what remains; do not label untested features complete.
