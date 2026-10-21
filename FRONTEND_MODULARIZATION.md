# Ultron frontend modularization

This patch preserves `App` as the authentication/session and data-orchestration layer and moves page JSX into four dedicated components:

- `pages/OverviewPage.tsx` — dashboard summary, selected account overview, contacts, interactions, and risk signals.
- `pages/AccountsPage.tsx` — search/filter, account directory, create/edit/archive/restore actions.
- `pages/TasksPage.tsx` — task management.
- `pages/DocumentsAIPage.tsx` — document upload, ingestion status, and AI analysis.
- `components/shared.tsx` — reusable UI components and result panels.
- `lib/presentation.ts` — formatting and presentation helpers.
- `types/app.ts` — domain types and a typed page context.

The refactor is structural: API requests, business event handlers, session state, and API error handling remain coordinated in `App.tsx`. The page modules receive those values through a typed context. This reduces the main App component's JSX and gives reviewers specific files to inspect.

After copying these files into the existing repository, run from `frontend/`:

```bash
npm run lint
npm run build
```

Then smoke-test login, all four pages, browser history/refresh, account CRUD/archive/restore, contact/interaction/task actions, document duplicate rejection, and AI citation rendering. Do not commit unless both checks pass.
