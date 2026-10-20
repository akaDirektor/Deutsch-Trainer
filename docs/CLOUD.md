# Audit and architecture

Audited baseline: aa41cf010565b56f7579286a9edfc1966db84b15.

The repository contains one inline vanilla JS application, 12 vocabulary scripts,
six historical JSON corpus backups, a minimal README, and a static Pages workflow.
All 12 scripts load 1,078 distinct German keys. The application deliberately uses
lowercase, trimmed German text as identity. This change retains that identity;
renaming corpus words would require a separate identity migration.
No vocabulary script or historical backup is changed.

Legacy state consists of `deutsch_match_b2_stats_v4`, `deutsch_match_b2_hidden_v1`,
`deutsch_match_b2_cycle_v1`, and a redundant corpus copy in
`deutsch_match_b2_data_v4`. The app used the bundled seed rather than this copy.
Statistics include correct/wrong, streak/mastered, recallCorrect/recallWrong,
verbWriteCorrect/verbWriteWrong, and lastWorked. Unknown statistics and keys are
retained on import; no field whitelist strips data. Raw legacy values, including
the redundant vocabulary copy, are included in exports. Legacy keys are never
written or deleted by this version.

Audit findings addressed:
- Removed-button handlers for prevBtn/stopBtn threw before registering Start.
- Scope switching discarded the previous cycle. Cycles are now retained per
  mode/type/date/focus signature. Returning to a signature resumes its seen set.
- Correct cards could be selected again during the animation delay.
- Hidden words remained in active recall.
- Delayed round callbacks could run after switching modes/filters.
- Today's UTC date was frozen at page load; local calendar date is computed live.

## Minimal cloud design

Keep GitHub Pages and all corpus files. Use Supabase email/password Auth with
signup disabled and one manually created user initially. The browser uses only a
public publishable key. No service-role key is needed.

One private row per user contains the complete versioned progress document.
A document is preferable here to splitting 1,078 statistics into rows: a learning
action and its cycle update commit together, preserving existing field semantics.
The vocabulary is not uploaded to Supabase. RLS permits only owner reads; clients
cannot write the table directly. A transaction function checks auth.uid() and
atomically compares revision before writing. Two devices cannot silently replace
each other's progress.

The signed-in user's cache stores revision, full state, and pending status before
network writes. Offline training can continue from a previously loaded cache.
The browser retries on reconnect, focus, manual sync and every 15 seconds. Idle
clients fetch remote changes. During training a remote revision mismatch pauses
training; local progress is retained. Export the local branch before loading the
remote branch. There is deliberately no automatic counter/streak/cycle merge:
adding counts or unioning incompatible cycles could count a word twice.

Only one tab per origin may train at a time (Web Locks). Across devices,
compare-and-swap protects cloud state. A timed-out acknowledged write can produce
a conservative conflict on retry; it never blindly retries an overwrite.
Tokens and cache are account scoped; sign-out clears the saved session but keeps
pending recovery data. Browser storage must remain available for offline writes.
Offline here means a loaded/cached application session, not service-worker support
for opening the site for the first time without a network connection.

## Setup before merging/deploying

1. Create a Supabase project. In Authentication, disable public signup and create
   your user with an email and password. Configure password recovery through the
   Supabase dashboard as needed.
2. Run `supabase/001_progress.sql` once in the project's SQL editor.
3. Fill `cloud-config.js` with the project HTTPS URL and **publishable** key.
   Never use a secret or service-role key. Supabase Auth supplies the user JWT.
4. Run `node --test tests/*.cjs`. The regression workflow runs the same command.
5. Perform the live checks below with a disposable account/project, then merge.
   The existing main-branch Pages deployment stays unchanged. Until configured,
   this version disables training and offers a legacy export; do not merge an
   unconfigured deployment if you need uninterrupted training.

## Safe Safari migration

Use the exact existing Pages origin, browser profile and Safari device containing
progress. Browser storage on a preview domain or another browser is different.

1. Before rollout, optionally download the original Safari localStorage using
   Safari's developer console:
   ```js
   const keys=['deutsch_match_b2_data_v4','deutsch_match_b2_stats_v4','deutsch_match_b2_hidden_v1','deutsch_match_b2_cycle_v1'];
   const a=document.createElement('a');
   a.href=URL.createObjectURL(new Blob([JSON.stringify(Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])))],{type:'application/json'}));
   a.download='safari-original-localstorage.json';a.click();
   ```
   Keep this original emergency backup. It is raw storage, not the UI import format.
2. Open the updated app on the original Safari origin and click Export / backup.
   Verify the downloaded file contains your stats, hidden words and cycle. Store
   this file safely: it may include personal examples. No auth token is exported.
3. Sign in. A missing cloud row does **not** create or import anything automatically.
4. Click Import into empty cloud. Review the displayed word counts and unknown
   keys; confirm only if they agree with Safari. The import preserves all counters,
   lastWorked, hidden keys and the existing cycle exactly.
5. The app reports success only after the server acknowledges the import. Keep
   the backup and original Safari keys. Refresh Safari, then sign in from Chrome
   and iPhone and compare statistics and hidden words.

You can select a UI-generated backup file on another device before importing
into an empty account. Imports never overwrite an existing cloud profile. If
Chrome was initialized empty first, stop and preserve both exports; do not delete
cloud rows or use New profile to work around it. Merging multiple historical
browser branches requires a separately reviewed reconciliation; this version
refuses to guess which overlapping successes represent the same encounters.

## Live acceptance checks still required

Automated tests mock the network; they do not claim to verify a live Supabase
installation. Before production:
- Check anonymous reads/writes and another user's read are denied. Check direct
  table updates and unauthenticated RPC calls are denied.
- Import a Safari backup and compare every JSON field after server round trip.
- Match a round on Safari; refresh Chrome and verify the seen set/statistics.
- Make changes offline and reconnect; verify the pending snapshot is uploaded.
- Make concurrent offline changes on two devices; verify the second stops with
  a conflict, can export its local branch, and cannot overwrite the server.
- Close/reopen the page with pending changes; verify they remain pending.
- Verify password sign-in, token refresh, sign-out, cache isolation, and two tabs.
- Play all 1,078 words (final round has 3), then verify a new cycle begins.
- Verify noun/plural, verb past, verb writing, examples, hiding and active recall.

The UI still uses three consecutive successful matches for mastered status;
a mistake resets streak and mastered as before. Active recall and verb-writing
counters are preserved separately. Active recall no longer mutates the matching
cycle. Different signatures have independent eligible cycles; changing filters
and returning resumes each cycle. Daily count remains unique words whose latest
lastWorked is today, matching the existing data model; no historical daily totals
can be reconstructed from old lastWorked values alone.
