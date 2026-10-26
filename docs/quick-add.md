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

## Book and lesson when adding a personal word (2026-10-26)

The add form now has optional **Книжка** (B1+ / B2 / no assignment) and **Урок** selectors. Selecting a book requires choosing one of its actual lessons; no assignment stays valid. Starting a new entry suggests the currently selected training book and its single lesson, if available. A multi-lesson training selection suggests only the book and leaves the source lesson for explicit choice. Explicit choices survive lookup/input and remain selected for adding several words from the same lesson.

Associations are stored as validated `stats[key].lessonMemberships=[{book,lesson}]`, outside `customWord`. This keeps the old custom-word schema compatible: older clients retain extensible per-word metadata instead of dropping an unfamiliar customWord property. Existing stats/hidden/cycles and unknown per-word metadata remain unchanged. A check against the previous client validator confirmed exact retention. No Supabase table, RPC, auth, function, secret or cloud transport change is needed.

`wordLessonMemberships` combines canonical textbook memberships with saved personal memberships, deduplicated by book/lesson. All training pools use that combined view, including multi-lesson matching, verb writing, article review, recall and context. Assigned personal words leave the unassigned view but remain in the full vocabulary. The single existing per-word counters/mastery are shared. Personal metadata also survives later promotion of the word into the GitHub corpus; it never removes or overwrites original textbook memberships.

Validation: **99 tests pass**, including bounded membership/import validation, custom-word lesson filtering in relevant modes, hidden/mastery behavior, form defaults/explicit choice, canonical promotion, and cross-device synchronization preserving old counters and hidden keys. Isolated Chrome verifies actual form selection, lookup-independent source choice, saved lesson confirmation, combined/unassigned filters, snapshot restore, exact original snapshot preservation (apart from the new word), unchanged corpus and enlarged mobile/desktop layout. Baseline `fec58e68e84b7827c65957fe086412c00be16d7a`; complete pre-edit repository backup saved locally. All canonical vocabulary, examples and lesson files are unchanged.

## Checked spelling and noun article before adding (2026-10-26)

Word lookup now verifies German spelling/part of speech in Wiktionary before treating a suggestion as ready to save. Exact and initial-capital variants are checked (an explicit noun article gives the capitalized entry priority). Verified nouns use the dictionary title and confirmed article, including replacement of an incorrect supplied article. For example, `vergünstigung` or `der vergünstigung` becomes `die Vergünstigung` in the draft. Gender comes from dictionary noun data/header, never a guessed suffix. Multiple dictionary genders require a matching explicit choice; no arbitrary first gender is selected. Lowercase verbs keep their verb reading.

If no exact German entry exists, bounded fuzzy title search supplies nearby candidates. Only parsed German dictionary entries with a confirmed part of speech and the closest edit distance become suggestions, with pinned Wiktionary source URLs. A typo such as `vergünsigung` offers «Виправити: die Vergünstigung». It is not silently renamed. A misspelling with corrections is not sent for machine translation until correction is selected. The accepted spelling is looked up again before saving. Draft examples, forms, explicit Ukrainian edits and lesson assignments survive correction.

Unknown words no longer silently default to a phrase. The manual part-of-speech field appears only when needed, and requires an explicit choice after checking LEO. Nouns still require an article. The Add button is disabled during lookup and until a type/correction is confirmed; the submit handler independently validates the same state. Manual/offline entry remains possible through an explicit type choice, with the usual noun/article checks. Canonical draft text is bound to its verification result, and stale lookup replies cannot approve a different word.

The backend uses the official MediaWiki search API and existing free Ukrainian sources only. Authentication/profile checks, sentence translation, PONS exclusion, caches and secret boundaries remain intact. No corpus, existing personal entry, word key, hidden state or learning record is renamed or migrated. This validation applies to new additions; previously saved misspellings are retained with their original progress.

Validation: **106 tests pass**. Existing manual-flow tests now explicitly choose a type for unverified synthetic words. New checks cover lowercased nouns, wrong articles, dictionary-only typo suggestions, no translation of an unaccepted typo, ambiguous genders, preserved verb readings/noun translation context, guarded saves and preserved manual example/translation/lesson drafts. Isolated Chrome verifies the real correction controls and article, explicit Add, state/corpus preservation and enlarged mobile/desktop layouts. Real provider probes confirmed `vergünsigung → die Vergünstigung` (Wiktionary revision 10571017) and `der vergünstigung → die Vergünstigung`, Ukrainian `знижка`. Baseline `946f1db9830ce7afe4c780e58c6718c4d96f3a69`; full repository ZIP and deployed Edge Function v6 backup saved before editing. No production learning rows are changed in tests.

## Automatic morphology and search details

The authenticated open lookup now returns Wiktionary-attested part of speech, noun plural, Präteritum, Partizip II, a Perfekt with an unambiguous auxiliary, and a short unquoted dictionary example when available. Missing forms are never guessed from suffixes. Reflexive constructions resolve through a dictionary-attested reflexive sense of the base verb, retaining the complete entered construction for identity and LEO. Reflexive translations and examples are restricted to marked reflexive senses.

The Add form selects the confirmed part of speech automatically and fills empty morphology/example fields, preserving manual edits. Only the user's Add confirmation stores these details with the existing source attribution.

Search and training use the same detail renderer. Original textbook/user examples and existing checked forms always win. Missing personal-word details can be fetched on opening the card; this enrichment is ephemeral and does not write progress, hidden state, vocabulary keys, or saved examples. Late replies cannot replace another word or reopen a closed card. Results and pending requests are shared in an in-memory bounded cache. Unavailable or unconfirmed details remain explicitly unavailable; LEO stays accessible. No paid provider was added.
