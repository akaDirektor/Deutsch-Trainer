# Supplementary usage examples

Existing `word.example` is the primary source. It is returned verbatim on every
view, regardless of any supplementary sentences for that key. No rotation or
rewriting applies to imported textbook/user examples.

`examples.js` contains separately authored, AI-generated example sentences, not
dictionary quotations or verified corpus citations. Its keys use the existing
German word key (`de.toLowerCase().trim()`), without changing vocabulary keys,
word records, translations or progress. The UI labels these sentences
`Авторський приклад (ШІ)` and existing examples `Збережений приклад`.

Initial coverage: 1089 vocabulary records, 291 existing examples preserved,
798 supplementary keys and 870 individually written sentences. 72 keys have
two variants; the remaining 726 currently have one sentence. Variants rotate
without immediate repetition during a page session. The first variant is
chosen randomly. Example selection is transient UI state and never written to
Supabase or the learning-progress cache.

This is an offline-capable sentence bank, not live model inference. No model
credentials, service-role keys or model requests are added to the browser.
For a new word without `example`, add one or more context-specific sentences
to `examples.js`. The coverage test identifies missing entries. If a future word
has no prepared sentence, the UI explicitly says so and keeps its LEO link;
it never substitutes that word into a generic sentence template.

When adding variants, use genuinely different contexts. Check that the target
word or its correct inflected form occurs naturally and illustrates the intended
meaning and government. Do not copy dictionary quotations without attribution.
Keep user/textbook examples unchanged even if a supplementary variant exists.

Validation: run `node --test tests/*.cjs`. Tests cover full supplementary coverage,
preservation of existing examples, unique sentences, nonrepeating variants,
shared matching/search/recall source priority, unchanged learning progress and
the vocabulary corpus checksums.
