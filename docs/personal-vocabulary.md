# Personal vocabulary and free dictionary lookup

Use the bottom «Додати слово» section. Enter German, select «Знайти значення», review/edit Ukrainian and grammar, then explicitly add. Manual entry also works if sources have no result. Nouns require der/die/das; verb forms and literal example are optional. Existing dictionary keys cannot be overwritten by this form.

## Sources and provenance
- PONS Dictionary API is queried only for a catalogue-confirmed German–Ukrainian pair. Russian is never requested or displayed in the add-word form; Russian remains available solely through the pre-existing LEO link. On 2026-10-22 the live `/v1/dictionaries` catalogue contained no Ukrainian pair. The app reports `language_unavailable` and spends no translation reservation in that case. A Ukrainian text translator on the PONS website must not be confused with a dictionary API entitlement.
- If PONS cannot supply Ukrainian entries, open German Wiktionary supplies up to three Ukrainian translations from its German-language entry. The entry revision link and CC BY-SA 4.0 attribution are retained; any user edits mark the Ukrainian text as user wording. Missing or unavailable entries produce no fabricated translation.
- No paid translation/AI service, automatic paid upgrade, or bulk dictionary import is used.
- The user confirms the sense and final wording. A proposal is not a guarantee that all displayed PONS/Wiktionary senses are equivalent.

## Persistence and compatibility
Personal entries live in the signed-in user's existing versioned progress JSON as per-word `customWord` metadata. Existing counters, hidden words and cycles remain intact. The full corpus is seed + personal entries, without mutating any words script or original sentence. If a future corpus update adds the same key, the corpus entry wins while statistics survive. Older clients preserve unknown per-word metadata but cannot display personal entries until refreshed. CAS conflicts retain their existing stop-and-export behavior.

## Backend
`dictionary-lookup` stores `PONS_API_SECRET` only in Edge Function secrets. No value is logged, committed, or returned. Every lookup validates the user with Supabase Auth and requires an existing own progress profile through RLS. Origin/CORS is limited to GitHub Pages. `verify_jwt=false` delegates authentication to the handler's server-side Auth request; it does not permit anonymous lookups. `/health` only reveals configured/not configured, never queries a provider or returns a secret.

`docs/pons-quota-setup.sql` was applied as the remote `pons_free_quota_guard` migration. An atomic private counter stops this app at 900 provider queries per UTC month. Only the server's service role can reserve a request. Failed PONS calls conservatively consume a reservation. Provider responses 403/429 and quota-check failures never trigger a paid fallback. Usage outside this app is not counted here. The private quota table intentionally has deny-by-default RLS and no browser grants or policies; `trainer_progress` is not altered.

## Validation
55 regression tests: corpus/progress preservation, private-entry validation, duplicates, offline cross-device metadata, independent article logic, source separation, nested API entries, unauthorized requests, rate cap and no invented translations. Browser checks cover editing/add/search/restoration and 320/390/1280px with all text sizes. Live health confirms server secret configured; anonymous lookup returns 401. SQL rollback tests confirm atomic increments and a hard stop at 900, leaving no test quota rows. Actual PONS credentials/entitlement are verified by the user's first authenticated lookup; no user password or session was accessed for testing.

References:
- https://cmsassets.pons.com/files/uploads/pons/api/pons-dictionary-api-documentation-05fd70ce.pdf
- https://en.pons.com/p/online-dictionary/developers/api
- https://www.mediawiki.org/wiki/API:Parsing_wikitext
- https://supabase.com/docs/guides/functions/secrets
