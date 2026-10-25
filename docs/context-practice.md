# Context practice after matching mastery

## User flow

«Слово в контексті →» beside the ready-for-recall statistics opens the new mode directly. It is also available under training modes. A target must already have the app's existing `mastered` flag (three successful matching encounters, including the required noun article). This exercise supplements active recall; it does not block, replace or alter the existing matching/recall stages.

Each question shows an existing German example with one literal span missing and **exactly five distinct options**. Options contain the actual sentence form, not a replacement infinitive forced into an inflected context. The original imported textbook/user example always takes priority; supplemental authored examples retain their AI label. After choosing, the original complete sentence is restored, the correct option is highlighted, and the word's Ukrainian translation and LEO appear. Feedback stays until «Далі». A collapsed Ukrainian hint helps when more than one completion sounds plausible. No network call or paid generation is needed.

## Corpus and gap construction

All **1135 current canonical records** have at least one usable gap and four distinct distractors. The current set has **1205 usable example cards**. These are coverage counts, not a new dictionary-accuracy audit. Personal words without a suitable example remain available in existing modes; the context panel reports prepared/ready counts honestly.

`context.js` locates literal spans in source sentences using label components and recognition patterns for observed inflected forms. Patterns only locate text that already exists; they never write an invented inflection or rewrite a sentence. Noun/adjective inflections and the lexical part of a stored multiword construction can be the target gap. Thus a phrase may practise its verb or nominal component with the rest of its construction still visible.

`context-spans.js` contains 82 manually reviewed literal spans for irregular/separated forms in the existing examples, each guarded by the complete exact sentence and character offset. If that sentence changes, its old override is not applied. Every gap is reconstructible as `before + answer + after === original sentence`. Literal word boundaries prevent matching a short word inside an unrelated longer token. Only one occurrence is removed; stored examples and vocabulary files are untouched.

Distractors use observed forms from other active corpus/personal example cards of the same gap kind. Nouns with a known article use the same article group. Duplicate spellings, the same record/label, known registered synonyms, overlapping Ukrainian meaning roots and words already present in the target sentence are excluded. This is a bounded rule-based selection, not a claim that every possible alternative interpretation has been linguistically excluded; the optional Ukrainian hint identifies the intended meaning. All current canonical records still have five choices after these safeguards. Hidden words are excluded as targets and distractors. Distractors may come from the wider active database so the exercise works even when only one word is mastered; target words respect the selected book, multiple lessons, type and date filters.

## Statistics, cycles and cloud

Per-word `contextCorrect`, `contextWrong` and `contextStreak` are independent nonnegative integer counters. An answer marks the usual daily history/lastWorked, once per word/day, and is saved via the existing cloud/offline snapshot path. Wrong context answers reset only contextStreak, leaving matching correct/wrong/streak/mastered, article results and active-recall results unchanged. Older clients retain these extensible fields; no JSON schema version or database migration is required.

Context scopes use the existing cycle structure with a separate `context|type|date|ready` base and the existing canonical book/multi-lesson suffix. They cannot consume or reset matching-cycle progress. Each answered target, whether correct or wrong, is seen once until the entire eligible context cycle completes. A complete cycle then restarts; multiple authored examples rotate when available. The original single imported sentence is never rotated away. Scope seen lists and counters resume from the existing cloud state.

Answers are guarded against duplicate clicks, stale question callbacks, filter/mode changes, local hiding, logout and remote snapshot application. The context panel participates in cloud active-training detection and safe remote resume. Filter changes invalidate the current question. Invalid counters are rejected on import rather than silently reset.

## Validation and preservation

**86 tests pass**, including:

- Full 1135-record/five-option coverage and literal reconstruction of every gap; imported-example priority.
- Mastery readiness, hidden words, multiple lessons and mode filters; no repeated target before a complete context cycle.
- Correct/wrong/streak separation, duplicate/stale-click protection, daily counts and preserved existing mastery/recall/metadata.
- Exact synonym/meaning/gender exclusions; cloud restore during an active context question; cross-device score synchronization.
- All previous matching, noun article, search, vocabulary, cloud/offline and lesson regressions.

Isolated Chrome checks exercise the empty readiness gate, shortcut/mode selection, five real buttons, combined lessons, correct and wrong feedback held until Next, Ukrainian meaning/hint, LEO, no-repeat cycling, daily progress, remote resume and enlarged text at 320/390/1280px. Synthetic state and a cloud stub are used; the user's browser/cloud account is never edited by tests.

Baseline repository: `5b2794af6b36648b9d165aa03ef987da75f3d70a`. A complete local ZIP was saved before editing. All 1135 vocabulary records, original examples, supplemental examples, lesson memberships, hidden keys and existing learning fields are preserved. No Supabase functions, schema, secrets or production rows are changed for this feature.
