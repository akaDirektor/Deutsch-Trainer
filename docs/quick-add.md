# Quick personal vocabulary entry

The bottom-of-page form is always visible: German input, editable Ukrainian translation, LEO link and Add. After 900ms without typing (or Enter), lookup starts automatically. Part of speech and optional grammar/example fields sit in a collapsed details block. A dictionary-provided noun article is applied automatically; an article supplied by the user is retained. Unknown grammar is not invented. No GitHub issue, import or separate search action is required to save a personal word.

## Lookup and attribution

Ukrainian Wiktionary dictionary results take priority. If none are available, the server automatically asks the anonymous free MyMemory GET endpoint with `langpair=de|uk`. **PONS is no longer queried or linked for new-word lookup**, because its available API catalogue does not supply the required Ukrainian pair. No provider catalogue, quota RPC, service-role key or PONS secret is consulted. A small empty `pons` response field remains solely for older clients' response-shape compatibility.

The suggestion links directly to the specific word in MyMemory's German–Ukrainian view (or the exact revision of Wiktionary). LEO stays the independent German–Russian check. The lookup never supplies a paid key, an email, user ID, progress data or Russian translation request. Only the queried word/phrase is sent. The user explicitly authorized automatic fallback on 2026-10-25.

MyMemory's anonymous allowance is 5000 characters/day (provider limits: https://mymemory.translated.net/doc/usagelimits.php). The endpoint has no billing credentials and cannot automatically upgrade. A limit/error produces an empty result and a short manual-entry message. Suggestions are labelled **Автоматичний переклад**, not dictionary-confirmed meanings. LEO stays a separate German–Russian check in a new tab. Machine output can be wrong or contextually inappropriate; it remains editable and is saved only after the user presses Add.

The client caches completed lookups in memory (up to 100). The server caches automatic suggestions for 30 minutes (up to 128, failed requests 1 minute) and shares in-flight identical requests. Every server request still authenticates the user and verifies an existing RLS-filtered trainer profile before provider access. The deployed function's existing `verify_jwt=false` is retained because authentication is explicitly performed against `/auth/v1/user`; unauthorized requests return 401. No auth, RLS, secrets, table or schema changes are made.

## Progress compatibility

Existing custom-word schema/enum values are unchanged so older clients can continue reading cloud progress. A user-confirmed machine suggestion has `customWord.translationOrigin=user`; its original query and automatic candidate are recorded separately as `stats[key].translationSuggestion`. This existing extensible per-word metadata survives old validation/cloning. An edited final Ukrainian translation remains in the normal customWord.uk field. No machine provider is falsely recorded as PONS or Wiktionary.

German edits invalidate old responses and remove the old word's translation/optional forms. A response cannot overwrite Ukrainian edited while the request was pending. Submitting a manual translation during lookup saves it and invalidates the pending response. Filter/cycle state and all existing per-word counters/hidden keys remain unchanged. Personal words continue using the established cloud snapshot path and become available through the whole vocabulary and global search; no canonical GitHub entries are replaced.

## Validation

75 regression tests pass, including free fallback priority/quota/caching/authentication, exact LEO reflexivity, noun article inference, user-confirmed provenance, stale-result/manual-edit races and preservation of all existing corpus, cycle, hidden and cloud behavior. Isolated Chrome verifies the visible two-field form, debounced lookup without an extra click, editable Ukrainian, one-click save, unchanged original stats/hidden/cycle and 1135-record seed, and 320/390/1280px layouts with enlarged text. Real provider probes returned Ukrainian for a German noun and reflexive phrase; translation accuracy remains subject to user review.

Pre-change repository commit: `c8909cf963777926179cbd50fcf0596b7b0de4f5`. A full local repository ZIP and version-3 Edge Function backup were saved before editing. No real user progress or hidden state is modified in tests.


Update: removed PONS from active new-word lookup and replaced its tests with open-provider priority, no-PONS/no-quota calls, exact Ukrainian word source links, authentication, reflexivity, caching, failures and CORS checks. Existing stored PONS provenance is historical user data and is not changed. Baseline before this update: `d853c973530caf31a1081d141fb9a9f36fa82771`; full repository and Edge Function v4 backups retained locally. Corpus, examples, lessons, learning counters, hidden state and cloud storage implementation remain unchanged.

## Add directly from an empty search (2026-10-26)

A nonempty search with no matches now offers «＋ Додати “query”». Clicking transfers the exact German query into the existing add form, scrolls/focuses it and immediately runs the existing Ukrainian lookup, cancelling its delayed timer to avoid a second request. It never saves implicitly; the user still reviews/edits and confirms Add. After saving, the original search refreshes and its add suggestion disappears.

Search still includes hidden words, so matching hidden entries do not produce a duplicate-add suggestion. Empty/overlong queries do not offer this action. A Cyrillic query opens the form asking for the German equivalent rather than wrongly submitting Ukrainian as German. The click rechecks the current query/results to guard stale controls; a locked profile cannot trigger lookup or save.

94 regression tests pass, including exact query transfer, no progress write on opening, explicit-save refresh, hidden/empty/Ukrainian/stale/locked cases and all prior regressions. Isolated Chrome verifies the real flow, one provider call, state preservation and enlarged responsive layouts. Vocabulary/examples/lesson membership and cloud/backend code are unchanged. Baseline `9408bf89efb57e4974433aa5debcf1a1385725a1`; pre-edit repository ZIP retained locally.
