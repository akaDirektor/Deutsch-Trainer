# One-click translation feedback

The user presses **Надіслати на перевірку** in the trainer. The app stores an idempotent report in a separate, owner-protected Supabase queue and shows acknowledgement without opening another site. A durable account-specific outbox retries on the existing online/focus/15-second synchronization loop and survives reloads. Duplicate clicks and retries reuse the same report ID. Existing unsent drafts remain drafts until the user presses Send; none are silently published.

The queue does not store or modify the vocabulary database, examples, hidden state or learning counters. Existing draft fields remain in per-word progress for compatibility, with optional `reportId` and `delivery` metadata; schema stays 1. Server acknowledgement, rather than a local draft save, triggers “Надіслано”. An offline/pending message is explicit. Actual dictionary review and a verified corpus correction are a later step; submission does not pretend to have checked/corrected a translation.

## Background delivery

`.github/workflows/translation-feedback.yml` runs about every 15 minutes, on manual dispatch, and on changes to its delivery files. It obtains a short-lived GitHub OIDC identity and asks the `feedback-dispatch` Edge Function for pending reports. That function verifies RS256 signatures against GitHub JWKS and requires the exact repository ID, repository name, main ref, workflow path, audience, issuer, expiry and an allowed event. No static GitHub credential is stored in Supabase or the browser. Only the job's ephemeral, minimally scoped GITHUB_TOKEN creates issues.

The function returns only report content (no account IDs, email or progress). The workflow creates a labelled issue, checks a stable report marker on retries, and acknowledges delivery in the queue. It runs serially to avoid duplicate issues. User-supplied content is JSON inside a code fence, never shell code. Logs contain counts/errors only, not credentials or report bodies. Lost receipts are retried without creating a second issue. The UI states that the word/comment will enter an open review list; the user does not have to visit GitHub.

GitHub schedules may be delayed, and GitHub can disable schedules in a public repository after prolonged inactivity. In that case the queue retains reports. Re-enable the workflow and run it manually to resume delivery; do not clear the queue. No fee-based dictionary/AI service was introduced.

## Database and deployment

Apply `supabase/003_translation_feedback.sql` after the existing progress schema, then deploy `supabase/functions/feedback-dispatch` with `index.ts`, `handler.mjs`, `oidc.mjs`, and `deno.json`. Gateway JWT verification is off only because the function verifies GitHub OIDC itself. `SUPABASE_SERVICE_ROLE_KEY` (or the server's `SUPABASE_SECRET_KEYS.default`) is used only inside this function and is never returned.

RLS permits profile owners to insert their own reports and read their own receipts. Insert column grants prevent clients setting dispatch status or issue URLs. Clients cannot update/delete queue records. Anonymous access is revoked. The service role can read reports and update delivery columns. Real-role transactional validation verified owner insert/read, rejection of another owner, anonymous rejection, and protected dispatch fields; the test row was rolled back. Existing learning progress was not edited.

Validation includes cryptographic OIDC signatures/claim rejection, dispatcher auth/receipts, worker retry deduplication, offline outbox reload, the actual Cloud module/browser flow, and the complete trainer regression suite. The initial main-branch workflow run verifies production OIDC/queue access without submitting any fake public issue.
