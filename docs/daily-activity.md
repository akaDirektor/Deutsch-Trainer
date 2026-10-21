# Daily activity chart

The seven bars show unique vocabulary records worked on each local calendar day
as a percentage of the current full corpus (including hidden words). Matching,
active recall and verb writing all call `markWorked`; correct and wrong attempts
both count. Repeated encounters with one word on the same day count once.

Each word's existing stats object gains an optional `workedDays` date array.
Existing correct/wrong/streak/recall/writing/mastery counters and `lastWorked`
are retained. The regular snapshot, cloud compare-and-swap, local pending cache,
backup and import paths preserve this additive field, without a SQL migration.
Recent dates are retained for 31 calendar days when a word is updated. This
keeps the per-word history bounded; the UI displays only the last seven days.

Legacy `lastWorked` stores only the most recent date, so it cannot reconstruct
complete historical daily totals. Today remains recoverable from that field.
Before recording an answer, all legacy records last worked today are included
in today's history, preserving the complete current-day count. Past dates before
the earliest recorded `workedDays` are marked unavailable, never displayed as
zero or fabricated totals. Dates within the recorded period without activity
are shown as zero. Words with future or older lastWorked values are not counted
as today's activity. Dates use local noon/setDate for calendar arithmetic, so
daylight-saving changes do not skip a calendar day.

Historical percentages are relative to the current corpus size, allowing future
vocabulary additions without a stored denominator migration. Hiding a word does
not erase past work. The chart explicitly states this full-corpus definition.
Select a bar to see its date and unique count. Missing data use a hatched bar
and em dash. Screen-reader labels provide date, count and percentage; the
selection is read-only and never saves progress.

New browser sessions/devices load workedDays with the existing cloud state.
Refresh existing open app tabs to run the new daily recording code. Previously
downloaded versions preserve the extra stats field but do not record new days.
