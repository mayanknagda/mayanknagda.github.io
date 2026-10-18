# The app family

The site hosts three independent, buildless Progressive Web Apps:

| App | URL | Purpose |
| --- | --- | --- |
| Pocket Spend | [/pocket-spend/](https://mayanknagda.github.io/pocket-spend/) | Expenses, income, receipts, and spending insights |
| Gym Tracker | [/gym-tracker/](https://mayanknagda.github.io/gym-tracker/) | Workouts, exercise history, strength progress, and body weight |
| Habit Tracker | [/habit-tracker/](https://mayanknagda.github.io/habit-tracker/) | Daily habits, schedules, skips, streaks, and consistency |

Each app has its own IndexedDB database, manifest, service worker, icons, Settings help, and backup format. Financial, workout, and habit records stay in the visitor's browser. There are no accounts or automatic cross-device sync. Each app asks for persistent browser storage when supported, but browser data can still be cleared.

## Everyday use

- **Pocket Spend:** Set the currency before the first entry. Tap the plus button to add an expense or income. Use Receipt for a purchase: enter its total, and optionally list items to track categories and prices. Review monthly totals on Home and patterns under Insights.
- **Gym Tracker:** Tap Start Workout, add an exercise, record weight and reps, and mark finished sets. Finish the workout when done. Reuse an earlier workout or save a template for a regular routine. Progress and body weight have their own views.
- **Habit Tracker:** Create a habit from Today or Habits. Tap it on Today to complete it; use Log amount for a quantity habit. Skip a scheduled day when appropriate. Use the date controls for earlier days and Insights for streaks and consistency.

## Back up and restore

In any app, open **Settings > Data & Backup**. Choose **Back up JSON** regularly and save the file somewhere outside the app, such as Files or cloud storage. JSON is the complete restore format. Pocket Spend includes the selected currency and Gym Tracker includes the selected weight unit in new JSON backups. Older JSON backups still import, but may not contain those preferences.

Choose **Export CSV** when you want to inspect data in Numbers or Excel. The same app can import its own CSV export, but edits made in a spreadsheet may invalidate the file. Gym and Habit CSV files include a `payload` column containing the full record as JSON; do not remove it if you plan to import the CSV later. A CSV export does not include app preferences. For reliable recovery, keep the JSON file.

To restore, open the *same app* on the destination browser, choose **Restore JSON or CSV**, and select the saved file. The app shows how many new records it found before adding them. Existing records are not overwritten; conflicting IDs stop the import. Importing the same file again does not duplicate records. For Pocket Spend, a JSON backup with a different currency cannot be merged into a browser that already has transactions. Each app has a separate database and cannot import another app's file.

There is no automatic sync. A Home Screen copy and a browser tab may have separate storage depending on the browser and device, so check where your data appears and keep a recent JSON backup before changing devices, browsers, or clearing site data.

On iPhone, open an app in Safari while online, tap **Share**, then **Add to Home Screen**. After the first successful visit, its service worker caches the app files for offline use. Updates wait for old app tabs to close so an open form is not reloaded mid-entry.

## Development and deployment

Serve the repository as static files for local preview. No build step or third-party packages are required. Run the Node tests shown in the root README. The browser IndexedDB checks live at `/pocket-spend/db-tests.html`, `/gym-tracker/db-tests.html`, and `/habit-tracker/db-tests.html`; each uses and removes a separate test database.

When changing app assets, increment that app's cache name in `sw.js`. Keep assets relative to the app directory and leave the service worker under that directory. Push committed changes to `main`; GitHub Pages serves the repository root. The homepage links come from `data/profile.json` under `misc` and `news`.
