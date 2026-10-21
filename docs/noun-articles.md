# Articles integrated into translation matching

In translation matching, nouns with an explicit der/die/das article omit the
leading article on the German card. No corpus record or progress key changes.
Three substantivized-adjective pairs share the same article-free spelling
(Erwerbstätige, Vorgesetzte, Beschäftigte). Their display adds a male/female
context cue so their two different Ukrainian translations remain distinguishable.

After a correct translation pair, record `correct` and cycle membership exactly
once and persist `pendingArticle: true`. The pair is reserved/done, shown amber
with a question marker; it cannot be scored again. Ask der/die/das in a modal.
No new streak/mastery credit is granted yet.

Correct article: increment `articleCorrect`, clear `articleNeedsReview`, advance
the ordinary success streak and mark mastered at three successes. Incorrect
article: increment only `articleWrong`, set `articleNeedsReview`, reset the
success streak/mastery and show the correct article. Do not increment translation
`wrong`, since the translation was correct. Acknowledge the correction to resume;
correct responses continue automatically after a short confirmation.

Only then finish the pair in the five-pair round. The next round still starts
automatically; in particular it cannot start while the last noun awaits its
article. A translation-matched noun is already in cycle.seen, even after a wrong
article, so it cannot repeat before the eligible translation cycle completes.

The optional per-word fields articleCorrect/articleWrong, pendingArticle and
articleNeedsReview travel through existing cloud/cache/import/backup paths.
Pending questions resume after reload/device change. A completed answer is
guarded against double submission. Cloud locks close the transient question,
without deleting its stored pending state. Remote state replaces transient UI
before any restored question is shown. A resumed answer also counts toward the
current day's unique-word activity.

Old progress is not reset or retroactively graded for articles. Existing saved
examples stay literal; consulting examples/LEO remains available before matching
and may naturally provide clues. Noun-plural, verb-form, verb-writing and active
recall modes retain their existing scoring. The integration applies specifically
to translation-pair matching, not as a separate trainer.

The separate article-error list includes nonhidden nouns with articleWrong > 0,
ordered with articleNeedsReview first. It retains lifetime mistakes even after
a later correct article, distinguishing history from the current review flag.

Validation covers delayed mastery, wrong-article accounting, no cycle repeats,
last-pair gating, snapshot restoration, double-submit prevention, legacy progress,
all existing corpus/example checksums and the original matching regression suite.
