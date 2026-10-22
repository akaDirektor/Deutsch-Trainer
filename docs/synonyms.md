# Contextual synonyms in example panels

`showMatchExample` now displays a compact «Близькі за значенням» group beneath existing verb forms (or the sentence for other word types). It works in matching, solved/previous-round card previews and search through the existing shared renderer. Tapping a synonym opens the existing German–Russian LEO lookup in a new tab. There are no new gestures on training cards.

The initial reviewed supplement covers **50 exact vocabulary records, 61 displayed relations**, across nouns, verbs, adjectives, adverbs, phrases and prepositional constructions. This is not a claim that all 1122 records have been checked for synonyms. Cards without a reviewed suitable relation simply omit this group.

## Editorial rules and evidence

`docs/synonyms-register.json` records every selected relation, the precise pinned German Wiktionary revision, the source section and sense number. Sources include explicit Synonyme, narrowly selected Sinnverwandte Wörter, and explicit equivalent wording within a definition. We select at most two close equivalents for the card's Ukrainian meaning, excluding technical/unrelated senses and unnecessary colloquial or archaic lists. This is editorial sense matching, not an automatic import of every thesaurus neighbour. German Wiktionary supplies the lexical relationship; the Ukrainian context hint narrows which existing card meaning is intended.

For example, `günstig` displays `preiswert` only with the price context; `untersuchen` displays `analysieren` for investigation, explicitly excluding a medical examination; reflexive `sich beschweren` displays `sich beklagen`, not a non-reflexive weight-related sense. Noun articles were separately checked in the linked target articles and are recorded in `nounArticleSources`.

The reverse pairs `instand setzen` → `reparieren` and `der Betrieb` → `das Unternehmen` cite the article which explicitly lists the other member of the synonymous pair. Relations are close in the reviewed sense, not a promise of identical grammar or interchangeability in every sentence. Context hints and the source-link tooltip make that distinction available without adding a large warning panel.

Attribution: German Wiktionary, CC BY-SA 4.0. Only selected lexical facts and provenance are shipped, not full articles. No paid API, live model generation or user-data request is involved.

## Data boundaries

`synonyms.js` is a separate supplement. Lookup requires an exact match of the original German label, Ukrainian translation and part of speech. Changing a word's meaning does not silently reuse an old synonym group. There is no fuzzy stripping of `sich`, prepositions or article keys. Runtime display uses textContent for the new labels and terms.

No vocabulary records, stored examples, original forms, keys, progress, hidden state, cycle rules or Supabase files are changed. Synonyms do not become training vocabulary records and do not affect the 1122 corpus / 1111 active count for the audited user state.

## Validation

Tests cover exact sense guards, all six word types, reflexivity, noun articles, source URLs, matching/search rendering and unchanged corpus/progress. Existing cycle, article, search, solved-card, previous-round and source-count tests remain enabled. Browser checks cover switching from a word with synonyms to one without, solved-card previews, search, close behaviour and mobile/desktop enlarged text.
