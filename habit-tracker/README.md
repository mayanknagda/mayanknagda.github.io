# Habit Tracker

Habit Tracker is a private, offline-first daily habit app at `/habit-tracker/`. Create checkbox or quantity habits, choose daily or weekday schedules, mark completion in one tap, log partial quantities, and skip days without breaking a streak. The Today screen can show earlier days for corrections. Pausing and archiving preserve history.

Streaks count consecutive completed scheduled days. Skipped days, unscheduled days, and paused periods are neutral. An incomplete current day stays open until the next day. Optional weekly targets summarize progress but do not change daily streak rules. Dates are stored as local calendar dates to avoid UTC rollover errors.

Settings explains the app and provides complete JSON backup, CSV export, and **Restore JSON or CSV**. Use JSON for a reliable restore file and CSV for spreadsheets. Data stays in this browser and does not sync automatically. On iPhone, open the app in Safari, tap Share, then Add to Home Screen after the first online visit.

Run `node --test habit-tracker/tests.mjs`. Serve the repository and open `/habit-tracker/db-tests.html` for an IndexedDB operation check. Increase the cache version in `sw.js` when app assets change.
