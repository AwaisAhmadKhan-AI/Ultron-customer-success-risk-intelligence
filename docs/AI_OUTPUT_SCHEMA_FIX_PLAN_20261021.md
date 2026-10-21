# AI output schema fix — implementation note

## Why this change is proposed

The captured `AIModelOutput` validator accepts a sufficient-evidence answer only if it contains a non-empty summary, confidence, and at least one risk factor or recommendation. But the evaluation includes factual questions whose correct answer can be a short summary (for example, a renewal month or an interaction's source title/date) without needing to label that fact a risk factor. Those outputs can become `invalid_model_output`, masking the actual answer behavior.

## Intended behavior

1. Add `summary_evidence`, a bounded list of `{source_type, source_id}` references, to the internal AI model output schema.
2. Require cited `summary_evidence` when there is a sufficient-evidence result that has no risk factor/recommendation. The prompt asks for summary evidence for all grounded factual summaries.
3. Validate every summary citation against the same account-scoped candidate map used for risk-factor and recommendation citations.
4. Persist summary citations through the existing `AIInsightEvidence` table with `claim_supported` prefixed by `Summary:`. This avoids adding a database migration just to represent this claim type.
5. Add a direct explicit-UUID interaction lookup constrained by both interaction ID and account ID. This supplements—not replaces—the existing recent-interaction context.
6. Emit sanitized Pydantic validation locations/types/messages to backend logs for future invalid model outputs. Raw provider output, prompts, source excerpts, credentials, and secrets are not logged.

## What this does not do

- It does not disable citation validation or accept IDs not in the candidate set.
- It does not allow cross-account retrieval. The exact interaction lookup includes `Interaction.account_id == account_id`.
- It does not guarantee that every provider response will follow the updated prompt. The next live run and regression tests are required.
- It does not expose token/cost data; the current response schema still lacks provider usage counters.

## Verification after applying

From `backend/` with the virtual environment active:

```bash
pytest
```

Then inspect the generated diff and run the isolated live evaluation. Specific expected checks:

- EVAL-01: `completed`, summary includes December, and the renewal document is returned as cited evidence.
- EVAL-10: `completed`, exact interaction UUID is cited, the stored title/date are correct, and the answer repeats the exact title/date requested.
- EVAL-09: both dated sources are retrieved/cited and conflict wording reflects both records.
- EVAL-08: no unsupported improvement/decline trend claim.
- EVAL-12: remains HTTP 403 for CSM-A requesting a CSM-B-only account.

If EVAL-01 or EVAL-10 still reports `invalid_model_output`, inspect the newly sanitized backend validation log. Do not change a failing case to PASS manually.
