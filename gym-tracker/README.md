# Gym Tracker

Gym Tracker is a private, offline-first strength training app at `/gym-tracker/`. Start a workout, add built-in or custom exercises, log working and warm-up sets, and finish when done. Active workouts are saved as single IndexedDB records after each change and can be resumed after closing the page. Templates and the previous workout make repeat sessions quick.

Progress uses completed working sets. Training volume is the sum of weight times reps; warm-ups are excluded. The heaviest completed set is a weight record. Estimated one-rep max uses the Epley formula for sets of 1-12 reps and is labeled as an estimate. Body weight is separate from lifted weight; both are stored canonically in grams and displayed in kg or lb.

Settings explains the app and provides complete JSON and CSV backups with **Restore JSON or CSV**. Both include the selected weight unit; CSV also opens in spreadsheets. Keep the CSV payload column for restoration. Data stays in this browser and does not sync automatically. On iPhone, use Safari Share > Add to Home Screen. On Android Chrome, use the menu's Install app or Add to Home screen option after the first online visit.

Run `node --test gym-tracker/tests.mjs`. Serve the repository and open `/gym-tracker/db-tests.html` for an IndexedDB operation check. Increase the cache version in `sw.js` when app assets change.
