# Reflexive forms in example panels

The current corpus contains 140 records with `sich`: 19 already supply both past forms; 121 receive display-only supplements from `verb-forms.js`. The supplements cover 97 lexical verbs. No corpus entries, keys, stored examples, training modes or progress fields are changed.

`exampleVerbForms` gives directly stored forms priority, then uses the exact complete vocabulary key (including its preposition). It does not strip `sich` or borrow a non-reflexive vocabulary record. Matching and search share this renderer; previous-round cards use the same example panel.

## Evidence and composition

`reflexive-verb-forms-register.json` records every supplemented entry, the retrieved German Wiktionary Präteritum, Partizip II and auxiliary fields, its pinned revision URL, and the resulting display forms. Lexical inflections are attributed to Wiktionary under CC BY-SA 4.0. They were retrieved individually for all 97 lemmas. The displayed third-person reflexive phrases combine these dictionary forms with the existing record’s reflexive construction.

Reflexive placement and conjugation: https://dict.leo.org/grammatik/deutsch/Wort/Verb/Valenz/Reflexiv-Flexion.xml?lang=de

For constructions with an additional infinitive and `können` or `lassen`, Perfekt uses an Ersatzinfinitiv and is labelled accordingly, rather than incorrectly labelling the final infinitive as Partizip II: https://grammis.ids-mannheim.de/fragen/99

This is a display supplement, not a claim that every meaning, translation or prepositional construction in the corpus has been semantically verified. It performs no runtime dictionary requests and consumes no PONS quota.

## Validation

Tests check all 140 records have both display forms, representative separable/reflexive/modal constructions, priority of saved forms, original sentence rendering, source attribution, and unchanged vocabulary/progress after lookup. Browser checks cover mobile and desktop rendering and the shared search example panel.
