# Customer Success Risk Intelligence Platform — Security Model

**Version:** 0.2 — updated to owner decisions
**Status:** Working security baseline for two CSM users with separate account assignments.

## 1. Security goals

1. Users access only accounts and related records within their permitted scope.
2. AI retrieval never supplies another account's private evidence to the model.
3. Customer documents are treated as untrusted data, not instructions.
4. Secrets, credentials, and private customer content are not unnecessarily exposed in API responses or logs.
5. Authorization, ingestion, and AI failure paths are tested, not merely assumed.

## 2. Authentication vs authorization

- **Authentication:** Who is making the request? V1 verifies email/password credentials and issues a signed JWT bearer token.
- **Authorization:** Is this identified user allowed to perform this action on this specific resource?

A valid token proves identity; it does not grant access to every account. Authorization is checked server-side for every protected read, write, archive, and AI-analysis request.

## 3. V1 role and scope

V1 uses only the `csm` role. Create at least two CSM users with different `account_assignments`. Each user can access only assigned accounts and their related records. Manager and Admin roles are out of scope for this build.

## 4. Authorization enforcement flow

For an account-scoped request:

1. Authenticate the caller.
2. Load the caller's role and active status from a trusted backend context.
3. Determine allowed account IDs from `account_assignments` for the authenticated CSM.
4. Verify the requested account belongs to that permitted set.
5. Apply user filters only after access scope has been established.
6. For child records, verify parent/account consistency as well as resource permission.
7. For writes, check permission again before committing changes.

Never rely on frontend route guards, hidden UI controls, or a client-provided `user_id` as the authorization decision.

## 5. V1 authorization matrix

| Action | CSM |
|---|---|
| List/view assigned accounts | Yes, assigned accounts only |
| View related contacts/interactions/tasks/documents | Only within an assigned account |
| Create/update/delete a contact or task | Only within an assigned account, following entity rules |
| Archive an account, interaction, or document | Only within an assigned account, following entity rules |
| Resolve/dismiss a risk signal | Only within an assigned account; reason retained |
| Generate/view AI insight | Only within an assigned account |
| Assign accounts to users or manage roles | Not exposed as a v1 user operation |
| Read another CSM's unassigned account | No |

The assignment requires resource-level authorization and `403 Forbidden` for the ID-tampering test.

## 6. AI / RAG security controls

- Re-check permission for the specific account before retrieval.
- Filter interactions and document chunks by authorized account scope before sending evidence to the LLM.
- Enforce document-chunk/account/document ownership consistency.
- Treat retrieved customer text as untrusted quoted evidence; it cannot override system instructions or access controls.
- Do not provide the model with other accounts' records as hidden context.
- Validate structured output against a strict schema.
- Verify each cited source ID/chunk and excerpt against retrieved evidence.
- Reject or safely mark invalid citations; never fabricate replacement evidence.
- If no suitable evidence exists, return a no-answer/insufficient-evidence state.
- AI output cannot silently write over the stored account risk level.
- Do not store provider API keys or sensitive configuration in source control.

## 7. File upload and document security

- Require authorization for the parent account before accepting an upload.
- Allow only PDF, TXT, and Markdown files in v1.
- Enforce a 10 MB file limit in v1.
- Validate content type and file signature where practical; do not rely on the filename alone.
- Compute SHA-256 content hash and handle same-account duplicates idempotently.
- Store files privately; do not expose arbitrary filesystem paths or public URLs.
- Extract text in a controlled process and handle extraction errors safely.
- Keep archived/failed documents out of normal retrieval.
- Mark extracted document content as untrusted during prompt construction.

## 8. Secrets, errors, and logging

- Keep credentials in environment configuration or an approved secret manager; commit `.env.example` with placeholders only.
- Never commit real API keys, access tokens, passwords, or production customer data.
- Never return stack traces, SQL details, API keys, password hashes, or raw provider secrets in API responses.
- Use request/correlation IDs and safe error codes.
- Avoid logging full customer documents or prompts by default; log only the minimum needed for diagnosis, evaluation, and cost/latency monitoring.
- Document log retention and access policy when known; otherwise mark it as an open question.

## 9. Required security verification

1. Create User A and User B with different account assignments.
2. Sign in as User A and request User B's account using the real ID.
3. Confirm server returns 403 as required by the assessment.
4. Repeat against related endpoints: contact, interaction, task, document, and AI insight/retrieval.
5. Verify account filters cannot widen the assignment scope.
6. Place prompt-injection text inside a document and show it is treated as data, not trusted instructions.
7. Ask an AI question where evidence exists only in another account; retrieval must not expose it.
8. Test invalid citations, insufficient evidence, and AI timeout behavior.

## 10. Remaining policy notes

- V1 uses JWT bearer authentication and one `csm` application role.
- User offboarding/account reassignment should deactivate or remove account assignments so former users lose access immediately.
- Retention duration is not defined; v1 archives records and does not automatically purge them.
- Risk-level changes, signal dismissals, archiving, and assignment changes should be auditable; the exact audit-log retention duration is not defined.
