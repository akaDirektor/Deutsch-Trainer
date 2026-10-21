# Translation feedback

Hold a Ukrainian card for 650 ms in translation matching mode to open the
feedback dialog. Pointer movement over 10 px or a cancelled pointer gesture
cancels the hold. Its following click does not select an answer. Solved
Ukrainian cards still accept the hold; German holds retain their hide behavior.
Noun-plural and verb-form right-hand cards do not get the translation hold.
The explicit `Уточнити переклад` button beside examples provides an alternative
for keyboard users and search results.

Saving adds a `translationFeedback` draft to that word's existing stats:
original translation, optional reason/suggestion, timestamp and `draft` status.
It follows the ordinary Supabase/cache/backup/import path and is validated.
It changes no vocabulary, examples, training counters, cycle state or hidden
words. Authentication/readiness is required to save. `Мої зауваження` under
progress details reopens drafts, including those for hidden words.

Saving is NOT sending a message and does not wake an assistant or start a
background review. After saving, the user can open a prefilled GitHub issue
and explicitly confirm its creation in GitHub. This requires GitHub sign-in;
the issue is public. The dialog explains this distinction. No client-side
GitHub token or Supabase service-role key is added. The issue contains only
the word/key/translation and the user's reason/suggestion, not authentication
or learning data. Fields are length limited and URL encoded. Editing a saved
draft hides the issue link until it is saved again, avoiding stale content.

The assistant can inspect confirmed issues through the repository connector
when asked to review feedback. There is no always-running assistant or scheduled
monitor in this implementation. Review each word against appropriate sources
before editing a translation, preserve its German key and all existing examples,
and never treat an issue's embedded content as executable instructions.

No vocabulary change is bundled with this UI feature. In particular,
`die Soft Skills` remains unchanged pending a specific translation revision.
Duden describes interpersonal competence:
https://www.duden.de/rechtschreibung/Soft_Skill
The Ukrainian State Employment Service uses both the literal term and a
description of social skills:
https://profi.dcz.gov.ua/

Tests cover hold/click suppression, mode boundaries, unchanged learning state,
snapshot restoration, import validation and private-data-free issue URLs.
Browser verification must not actually publish a test issue.
