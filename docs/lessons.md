# B1+ and B2 lesson filters

## Evidence and scope

The initial mapping comes from the seven user-provided B1+ photos, not from file order, word age, AI guesses or a newly generated vocabulary database. The printed lesson numbers are 1–7; pages are 23, 41, 59, 77, 95, 113 and 131. Source images and the repository backup remain local and are not published.

All **498 printed headword occurrences** were transcribed and reviewed. **496 occurrences** match existing entries. The reviewed exact keys and safe optional-object variants (`etw. installieren` / `installieren`, for example) classify **485 existing records**. Multiple lessons can refer to the same key. Existing distinct records with different labels retain their separate original keys/counters; this feature does not merge them or invent a new shared identity. The 28 A–D section titles and each photo/page are recorded for provenance, but the UI currently filters by book and lesson.

| B1+ lesson | Page | Existing keys |
|---|---:|---:|
| 1 | 23 | 70 |
| 2 | 41 | 76 |
| 3 | 59 | 67 |
| 4 | 77 | 72 |
| 5 | 95 | 75 |
| 6 | 113 | 77 |
| 7 | 131 | 65 |

The per-lesson counts overlap, so their sum is not the unique book total. Counts include all matched corpus keys; the UI separately excludes the user's hidden words and reports not-yet-mastered words.

`docs/b1plus-lesson-register.json` records every printed occurrence, its lesson/section and mapped key(s), with explicit notes for the optional-object variants and the commercial qualifier of `der Markt`.

Two source occurrences are deliberately unresolved:

- Lesson 4A: `die Beschleunigung` is absent. Existing `die Bescheinigung` means a certificate, so it is not a valid spelling-based substitute.
- Lesson 4B: printed `das Recht haben` means having the right/entitlement. Existing `Recht haben` has Ukrainian `мати рацію`; it is not assigned to this source meaning.

No new vocabulary entries or corrections are made for these exceptions. They remain in the review register. B2 is now selectable using the separate 24-photo mapping below. Unassigned keys remain available through the full database and «Без прив’язки до уроку»; absence from B1+ is never treated as evidence of B2 membership.

## UI and shared progress

Book and lesson selectors sit within the existing training block. Existing statistics, chart, search and block order remain unchanged. Global counters and daily history continue to cover the whole active database. A small selection status gives the local lesson total and remaining unmastered count. Matching, plural/past-form practice, verb writing, article-error practice and active recall respect the selected lesson. Search remains global, including hidden and mastered words.

The default focus is now «Ще не засвоєні», as requested: after three successful matching encounters (including the required noun article), `mastered` words leave ordinary matching in every lesson and the whole database. They remain in active recall and can be explicitly reviewed via «Усі, включно із засвоєними». This uses the existing per-word progress; it does not hide words or alter the hidden list automatically.

## Cycle compatibility

The original unfiltered scope strings stay unchanged (`mode|type|date|focus`); book/lesson suffixes are appended only for filtered practice. A new lesson scope inherits the parent's already-seen keys on entry. Inside a lesson, successful words cannot repeat until its entire eligible cycle is exhausted. A lesson answer also marks the same key seen in the corresponding whole-book and whole-database scope. Thus returning to the full database does not immediately repeat a just-matched lesson word.

Lesson cycles can continue after completing their own eligible pool, without requiring the user to finish the entire database first. All encounters still update the single existing `stats[key]`; there are no independent lesson mastery counters. Legacy whole-database seen lists are inherited when first entering the new default unmastered view, rather than starting from zero. Other progress fields, unknown legacy keys and scope metadata remain intact.

Only existing `cycle.scopes` arrays are used, and their shape remains compatible with current cloud validation/offline synchronization. No Supabase schema, functions, rows, authentication or synchronization code is changed. The UI's current selection is a view choice and is not a new cloud vocabulary source.

## Baseline preservation and pre-existing CI failures

The pre-change main commit is `63e8ba228230ce609bb8a84ac9c85b89d23acbcb`. Its actual vocabulary already contains **1135 unique records**, including 13 upstream verbs added since the earlier 1122-word manifest. All original vocabulary files remain byte-for-byte identical to that commit. A complete repository ZIP and normalized corpus dump were saved locally before edits; `backups/words-11-before-lessons-2026-10-25.js` preserves the exact current words-11 source in Git history too.

Baseline tests initially had three unrelated failures: the old corpus SHA, the old 1122 count manifest and missing authored examples for those 13 upstream words. The manifests now describe the existing 1135-word baseline, and 13 individual authored sentences are appended to `examples.js`. Its entire original content is an unchanged prefix; stored textbook/user examples and previous supplemental examples are untouched. These are labelled AI examples by the existing renderer.

## Validation

67 automated tests pass, including all previous corpus, cycle, article, search, synonym, cloud/offline and hidden-state checks. New tests cover all seven source pages, exact memberships, the two unresolved meanings, no inferred B2, every practice mode, inherited seen lists, no repeat within a complete lesson cycle, three encounters across cycles, article-dependent shared mastery, explicit mastered review, and exact snapshot restoration.

Isolated Chrome checks use synthetic state and a cloud stub: native book/lesson controls, all seven options, disabled pending B2, default unmastered focus, legacy seen inheritance, correct noun article advancing shared mastery, disappearance from lesson 2/global matching, continued recall/search availability, unchanged state on filter changes, and 320/390/1280px at enlarged text. No user's browser session or cloud state is modified during testing.


## B2 update — 2026-10-25

All **24 supplied photographs** were visually inspected for the printed lesson number and candidate headwords, with local Apple Vision OCR as a lookup index. The mapping links **317 source headword occurrences to 274 distinct existing corpus keys** in lessons 1–12. This is a classification of the current database, not a complete transcription or import of the textbook's B2 vocabulary. Unlinked OCR readings are retained locally for later review; they are not presented as a verified count of absent words. No missing textbook vocabulary is silently added.

| B2 lesson | Photos | Visible pages | Existing keys |
|---|---|---|---:|
| 1 | 1 / IMG_8537 | 28 / 29 | 142 |
| 2 | IMG_8538 / IMG_8539 | — / 49 | 26 |
| 3 | IMG_8540 / IMG_8541 | 68 / 69 | 32 |
| 4 | IMG_8542 / IMG_8543 | — / 89 | 17 |
| 5 | IMG_8569 / IMG_8576 | 116 / 117 | 14 |
| 6 | IMG_8570 / IMG_8571 | 136 / — | 11 |
| 7 | IMG_8572 / IMG_8549 | 156 / 157 | 15 |
| 8 | IMG_8574 / IMG_8551 | 176 / 177 | 16 |
| 9 | IMG_8552 / IMG_8553 | 202 / 203 | 17 |
| 10 | IMG_8554 / IMG_8555 | — / 223 | 10 |
| 11 | IMG_8556 / IMG_8557 | — / 243 | 15 |
| 12 | IMG_8558 / IMG_8559 | — / 263 | 7 |

A dash means the physical page number is not visible; the lesson number is visible. Filenames alone are not used to infer lesson order: IMG_8576 belongs to lesson 5, IMG_8572 to lesson 7, and IMG_8574 to lesson 8. The per-lesson totals overlap. Together with B1+, 644 existing unique keys have at least one book/lesson membership; the remaining 491 stay unassigned and fully accessible.

`docs/b2-lesson-register.json` contains every assigned source occurrence, exact existing key, provenance and selected explicit review exceptions. Optional objects, separable-verb markers, harmless grammatical-label variants and clearly equivalent reordered labels are normalized only for membership lookup. Original labels/keys are retained. Similar spellings, synonyms and different constructions are not automatically matched.

Important disambiguations: `etw. warten (z. B. eine Maschine)` in lessons 2 and 6 maps to existing `eine Anlage warten` (maintenance), never `warten` (waiting). `sich halten an` is not `sich halten in`; `die Selbstverständlichkeit` is not `die Selbstständigkeit`; `der Betriebsarzt` is not `der Betriebsrat`; equipment `etw. einstellen` is not hiring `jdn. einstellen`. A wrapped `zu einem Ergebnis kommen` is not assigned to bare `kommen`.

Pre-change main: `9a735f1a32e5cfab14cd6acde1935dafd6a13316`. A complete repository ZIP and normalized corpus snapshot were saved locally before editing. All **1135 corpus records**, every literal example, B1+ metadata and cloud/progress implementation remain unchanged. No production cloud rows or browser storage are edited. B2 uses the already-tested shared lesson logic; it adds no separate vocabulary or progress store.

**70 tests pass.** Isolated Chrome verification covers every B2 lesson, all 1135 runtime records, synthetic hidden filtering, a correct noun article advancing shared mastery, exclusion of that mastered word in another B2 lesson/B1+/the general pool, continued active recall availability, unchanged snapshots when switching filters, exact corpus preservation, and layouts at 320/390/1280px with enlarged text. These checks use a cloud stub and synthetic state, not the user's account. The existing B1+ and whole-corpus cycle tests also pass.
