# Authorization Matrix — Ultron

**Status:** Implemented baseline for v1; verify against current endpoint behavior before changing policy.  
**Scope:** One application role (`csm`) with account-assignment-based access. Admin/Manager roles are out of scope for v1.

## Policy

Authentication answers “who is making this request?” Authorization answers “may that user access this account and its records?” A valid JWT is not sufficient by itself. The backend must enforce account scope for each protected request; frontend hiding is not a security boundary.

A CSM may work only with accounts assigned to that user through `account_assignments`, including the account's related contacts, interactions, tasks, risk signals, documents, and AI evidence. Account assignment and authorization are server-side. Retrieval must be scoped before evidence is sent to an LLM.

## Matrix

| Resource/action | Authenticated CSM + assigned account | Authenticated CSM + unassigned account | Unauthenticated/invalid token |
|---|---|---|---|
| Login | Authenticate credentials; receive access token on success | Same login rules; assignment does not replace authentication | Login endpoint accepts credentials; protected resources require token |
| Current-user profile (`/auth/me`) | Allow valid active user | Same user can only retrieve own profile | Reject with `401` |
| List accounts | Return only accounts in the caller's permitted scope, subject to filters/pagination | Must not disclose other users' account records | Reject with `401` |
| Read/update account | Allow operations supported by endpoint and schema | Reject resource access; the assessment expects `403` for an ID-tampering attack | Reject with `401` |
| Create account | Create within the current user’s permitted workflow and assign owner/scope server-side | Client cannot assign itself to another user’s account by passing an arbitrary ID | Reject with `401` |
| Archive/unarchive account | Allow for assigned account, subject to endpoint policy | Reject | Reject with `401` |
| Contacts and interactions | Read/create/update/archive only under an assigned account and entity lifecycle rules | Reject even if a valid child-record ID is supplied | Reject with `401` |
| Tasks | Read/create/update/complete/cancel only within an assigned account | Reject | Reject with `401` |
| Risk signals | Read/create/acknowledge/resolve/dismiss only within an assigned account; dismissal requires a reason | Reject | Reject with `401` |
| Documents | Upload/list/archive only within an assigned account; validate file type/size and deduplicate per account | Reject; never expose document metadata or chunks from another account | Reject with `401` |
| AI insights and evidence | Run analysis only against authorized account evidence; validate output and citations before returning it | Reject before cross-account evidence can enter model context | Reject with `401` |

## Observed verification evidence

- The backend test suite passed **53 tests** in the latest complete run recorded on 2026-10-21.
- Test names include account assignment boundaries, account listing scope, CSM assignment authorization, unassigned account `403`, nonexistent account `404`, and account-isolated listing.
- AI-evaluation tests include prompt-injection text being marked untrusted; AI-insight service tests cover unknown citations, insufficient evidence, malformed output and provider failure.

These tests are evidence of the covered cases, not proof of every possible endpoint or production deployment configuration. Any new account-scoped endpoint must receive a corresponding cross-scope test.

## Required manual attack rehearsal

1. Create/sign in as CSM A assigned to Account A.
2. Obtain an Account B ID assigned only to CSM B.
3. While authenticated as A, request Account B detail by changing the URL/resource ID.
4. Repeat for at least one related resource and an AI/document endpoint.
5. Confirm the API denies the request and that no data from B appears in the response, logs, retrieval context, or AI evidence.
6. Record the exact request, response status, and date in the evaluation/results log.

## Policy limits

- No Admin/Manager role is implemented in v1.
- Record retention duration and formal audit-log retention are not defined; archive/history behavior is used where appropriate, and automatic purge is out of scope.
- The matrix describes the intended policy. A route that does not yet have a test should be marked as not verified until tested.
