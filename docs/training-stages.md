# Four exercise types (2026-10-29)

The existing book/lesson, word-type, period and grammar-mode controls remain. A separate, always-visible **Тип тренування** selects matching, multiple-choice active recall, context, or a writing sheet. Context is no longer a grammar-mode option. Existing article-error, plural, past-form and dedicated verb-writing modes are retained.

## Learning and preservation

- Three successful matching encounters, two multiple-choice answers, then two written answers produce a fully learned word. Errors never subtract successes. Noun translation matching still requires the correct article.
- Context is additional: one successful context answer completes its separate indicator. It does not substitute for, or block, the 3–2–2 progression.
- New `stats[wordKey].learningV2` version-2 metadata contains independent correct/wrong counts for matching, choice and writing. The containing progress snapshot stays schema 1; the existing authenticated cloud CAS/offline-cache path is unchanged. No database migration or profile reset is needed.
- Existing `correct`, `wrong`, `streak`, `mastered`, recall results, article statistics, examples, feedback, personal translations, lesson assignments, hidden keys and cycle scopes are retained. Legacy `mastered` remains the historical three-match readiness flag; fully learned status is derived separately.
- Until a word receives a new-stage result, its baseline is derived without saving: old readiness gives three matches; otherwise its existing streak supplies known successful matches, capped at three. Lifetime `correct` is not blindly promoted because it can include noun answers with a wrong article. Old `recallCorrect`/`recallWrong` belonged to the former typed recall exercise and are credited only to writing, never to multiple choice. Historical specialized verb-writing results stay in their own fields because the translation could have been skipped. These original fields are not deleted or rewritten by the new exercises.
- Stage metadata is frozen lazily on the next actual result. Merely viewing statistics does not migrate or write progress. Earlier successes remain counted after future mistakes.

## Scope and review

The overview shows the whole-base total and fully learned count, then the selected books/lessons with stage counts and 1/3, 2/3 details. Main stages partition active words; the context indicator is independent. Hidden words stay stored but are excluded. Selecting the whole base shows whole-base stages. The archive contains fully learned words in the selected lessons and opens normal searchable word details. For repeat practice choose **Засвоєні · архів** or **Усі, включно із засвоєними**.

Default unmastered practice presents words still needing the chosen stage. Choice requires matching readiness; writing additionally requires two choice successes. Later-stage UI controls cannot award progress early. Matching keeps the original durable no-repeat cycles. Context has its own durable scope. Choice/writing rotate through eligible targets within a session; a writing sheet never includes the same key twice. Wrong answers stay eligible without resetting their prior successes.

## Writing and answer safety

Five, ten, fifteen or twenty native text fields are available. Defaults: five on widths below 600px, fifteen otherwise. Native inputs support hardware/software keyboards and iPad Apple Pencil Scribble; no canvas/OCR library or paid service is used. Actual Apple Pencil handwriting recognition is provided by iPadOS, not simulated by the app. Each row is checked separately by its button or Enter. Empty answers do not record an attempt; duplicate/stale row controls do not record again. Wrong rows show the correct answer and can reappear on the next page. Typed but unchecked answers block the next-page button. Remote progress refresh invalidates stale controls and restores unfinished drafts for eligible words.

Answers require exact spelling after NFC, case/whitespace and apostrophe normalization; German umlauts remain significant. Noun articles and reflexivity remain required. Word-label annotations such as `jdn.`, `(etw.)` and `+ Dat.` need not be typed; lexical full/optional forms are accepted without modifying the source entry. The Ukrainian direction accepts each of the user's saved translation variants. Choice alternatives are distinct, omit accepted alternate answers and never modify the corpus. Failed local saves roll back new-stage results.

## Examples and technical checks

The pre-change corpus is pinned by commit `f49fb5fbaaedd664066a2290688604768b86ac36` and an exact local repository archive at `/private/tmp/deutsch-stages-20261029/before.zip`. All 13 loaded vocabulary files and the two historical vocabulary backup files remain byte-identical: **1177 records before and after**. Existing `example` strings retain priority.

The previous main had 39 recently added words without supplementary examples and stale corpus fixtures from 1138 records. This change adds one distinct, explicitly AI-authored sentence and an exact guarded context gap for each missing word in the separate supplementary files. No original example is changed. Test hashes/counts are updated only to the already-existing corpus; reflexive count is now 150, and every reflexive entry already had forms. This resolves the six pre-existing regression failures without weakening the checks.

Validation includes all 153 automated tests, a real-browser 3–2–2 scenario with wrong answers and double clicks, both directions, native input attributes, 5/15/20 row sheets, archive and lesson statistics, remote draft restoration, context separation and 320px/large-text layout. All corpus records have a valid context gap and five distinct answer choices. Live-profile data was not used in testing.

## Hidden words and statistics

All learning aggregates use active (non-hidden) vocabulary: word/article accuracy, article mistakes, readiness stages, fully learned archive, daily coverage, per-type counts, old written-recall totals and context totals. Hiding a word immediately removes its historical attempts from displayed aggregates; restoring its key automatically includes those original attempts again. No counters, vocabulary, examples or cloud state are erased. Technical vocabulary diagnostics still show the physical corpus and hidden count so inventory remains auditable. Translation feedback remains accessible for hidden entries because it is a review log rather than a learning aggregate.
