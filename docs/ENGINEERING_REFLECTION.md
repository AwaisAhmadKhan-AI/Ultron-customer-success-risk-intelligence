# Engineering Reflection — Ultron

**Draft for candidate review:** Edit this document so every statement reflects decisions and experiments you personally understand and can explain.

## What I built

Ultron is a Customer Success workspace with account-scoped records, document ingestion, and AI-assisted analysis. The implementation uses React and TypeScript for the user interface, FastAPI for REST endpoints, PostgreSQL/SQLAlchemy for persistence, Alembic for schema migrations, and a provider-integrated AI layer for retrieval-grounded insight generation.

## Decisions and trade-offs

### Build a useful non-AI workflow first

Account and related-record CRUD, filtering, authentication, and authorization are foundational. The AI feature must not disguise missing or unsafe core behavior. The automated suite covers both the normal application paths and selected negative/failure cases.

### Enforce authorization on the server

A valid JWT proves identity, not access to every account. The backend checks account assignment and applies that scope to related data and AI evidence. This supports least privilege but requires every new endpoint and retrieval path to be tested for cross-account leakage.

### Preserve the difference between facts and recommendations

Stored account attributes remain the system's business facts. AI-generated risk suggestions and recommendations are advisory and need traceable evidence. Citation IDs must resolve to allowed source records, and insufficient or malformed output must fail safely rather than be treated as a successful analysis.

### Prevent duplicate document ingestion

The document service computes a content hash and enforces account-scoped uniqueness. This protects against repeated uploads of the same content for one account. The database constraint is important because an application-only “check then insert” can race under concurrent requests.

### Use migrations for schema evolution

Alembic migrations make schema changes explicit and reviewable. The added account-assignment index was exercised through downgrade and upgrade, and the development database is recorded at revision `cdf526010a2b` (`head`). A migration should be reviewed before being applied to any environment with valuable data.

### Optimize from query evidence, not a timing claim

A query-plan comparison showed the account-assignment lookup using `ix_account_assignments_user_id` with a bitmap index scan instead of scanning the assignment table, and observed buffer accesses decreased in that comparison. End-to-end timing samples were noisy, so no stable latency percentage is claimed. A stronger benchmark should run repeated controlled measurements with warm-up and report median/p95.

### Modularize the React UI

The large `App.tsx` was split into page files for Overview, Accounts, Tasks, and Documents & AI, plus shared components, presentation utilities, and shared types. This improves navigation and makes page responsibilities easier to find. The application shell still owns substantial shared state and handlers; further extraction into focused hooks and API modules is a possible next step, but should be done with regression tests in place.

## Verification evidence

- The most recent complete backend test run reported 53 passing tests.
- The modularized frontend passed ESLint and the TypeScript/Vite production build.
- The development database was verified at Alembic revision `cdf526010a2b`.
- The local `main` branch and GitHub `origin/main` were synchronized after the modularization commit `c97c579`.
- The 12-case scenario catalog and actual live-evaluation results are separate deliverables; the catalog must be executed and measured before claiming retrieval/latency/cost scores.

## What I learned / what I would improve next

1. I should treat generated or AI-assisted code as a proposal until I can trace the data flow, test failure conditions, and explain the trade-offs.
2. Architecture documents need to distinguish original design proposals from implemented behavior; status and endpoint paths should be reconciled after implementation.
3. A green unit test suite is necessary but is not a substitute for a reproducible end-to-end RAG evaluation.
4. Security assertions should be demonstrated with cross-account attempts, not inferred from successful login or frontend hiding.
5. Performance claims should state workload, environment, sample size, and metric. Query-plan improvement alone is not proof of lower user-visible latency.

## Final reflection before submission

Before submitting, I should be able to trace one UI request through the API, authorization dependency, business service, database query and response; explain citation validation and no-answer behavior; show a migration downgrade/upgrade; diagnose at least one retrieval failure; and describe exactly which evaluation metrics were measured and which remain unavailable.
