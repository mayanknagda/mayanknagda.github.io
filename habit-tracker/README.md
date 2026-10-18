# Habit Tracker

Habit Tracker is a private, offline-first daily habit app at `/habit-tracker/`. Create checkbox or quantity habits, choose daily or weekday schedules, mark completion in one tap, log partial quantities, and skip days without breaking a streak. The Today screen can show earlier days for corrections. Pausing and archiving preserve history.

Streaks count consecutive completed scheduled days. Skipped days, unscheduled days, and paused periods are neutral. An incomplete current day stays open until the next day. Optional weekly targets summarize progress but do not change daily streak rules. Dates are stored as local calendar dates to avoid UTC rollover errors.

Settings explains the app and provides complete JSON and CSV backups with **Restore JSON or CSV**. CSV also opens in spreadsheets; keep its payload column for restoration. Data stays in this browser and does not sync automatically. On iPhone, use Safari Share > Add to Home Screen. On Android Chrome, use the menu's Install app or Add to Home screen option after the first online visit.

Run `node --test habit-tracker/tests.mjs`. Serve the repository and open `/habit-tracker/db-tests.html` for an IndexedDB operation check. Increase the cache version in `sw.js` when app assets change.
