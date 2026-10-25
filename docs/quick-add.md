# Quick personal vocabulary entry

The bottom-of-page form is always visible: German input, editable Ukrainian translation, LEO link and Add. After 900ms without typing (or Enter), lookup starts automatically. Part of speech and optional grammar/example fields sit in a collapsed details block. A dictionary-provided noun article is applied automatically; an article supplied by the user is retained. Unknown grammar is not invented. No GitHub issue, import or separate search action is required to save a personal word.

## Lookup and attribution

Existing Ukrainian PONS/Wiktionary dictionary results take priority. If neither supplies Ukrainian, the server asks the anonymous free MyMemory GET endpoint with `langpair=de|uk`. It never supplies a paid key, an email, a user ID, progress data or a Russian translation request. Only the queried word/phrase is sent. The user explicitly authorized this automatic fallback on 2026-10-25.

MyMemory's anonymous allowance is 5000 characters/day (provider limits: https://mymemory.translated.net/doc/usagelimits.php). The endpoint has no billing credentials and cannot automatically upgrade. A limit/error produces an empty result and a short manual-entry message. Suggestions are labelled **Автоматичний переклад**, not dictionary-confirmed meanings. LEO stays a separate German–Russian check in a new tab. Machine output can be wrong or contextually inappropriate; it remains editable and is saved only after the user presses Add.

The client caches completed lookups in memory (up to 100). The server caches automatic suggestions for 30 minutes (up to 128, failed requests 1 minute) and shares in-flight identical requests. Every server request still authenticates the user and verifies an existing RLS-filtered trainer profile before provider access. The deployed function's existing `verify_jwt=false` is retained because authentication is explicitly performed against `/auth/v1/user`; unauthorized requests return 401. No auth, RLS, secrets, table or schema changes are made.

## Progress compatibility

Existing custom-word schema/enum values are unchanged so older clients can continue reading cloud progress. A user-confirmed machine suggestion has `customWord.translationOrigin=user`; its original query and automatic candidate are recorded separately as `stats[key].translationSuggestion`. This existing extensible per-word metadata survives old validation/cloning. An edited final Ukrainian translation remains in the normal customWord.uk field. No machine provider is falsely recorded as PONS or Wiktionary.

German edits invalidate old responses and remove the old word's translation/optional forms. A response cannot overwrite Ukrainian edited while the request was pending. Submitting a manual translation during lookup saves it and invalidates the pending response. Filter/cycle state and all existing per-word counters/hidden keys remain unchanged. Personal words continue using the established cloud snapshot path and become available through the whole vocabulary and global search; no canonical GitHub entries are replaced.

## Validation

75 regression tests pass, including free fallback priority/quota/caching/authentication, exact LEO reflexivity, noun article inference, user-confirmed provenance, stale-result/manual-edit races and preservation of all existing corpus, cycle, hidden and cloud behavior. Isolated Chrome verifies the visible two-field form, debounced lookup without an extra click, editable Ukrainian, one-click save, unchanged original stats/hidden/cycle and 1135-record seed, and 320/390/1280px layouts with enlarged text. Real provider probes returned Ukrainian for a German noun and reflexive phrase; translation accuracy remains subject to user review.

Pre-change repository commit: `c8909cf963777926179cbd50fcf0596b7b0de4f5`. A full local repository ZIP and version-3 Edge Function backup were saved before editing. No real user progress or hidden state is modified in tests.
