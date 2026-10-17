# The app family

The site hosts three independent, buildless Progressive Web Apps:

| App | URL | Purpose |
| --- | --- | --- |
| Pocket Spend | [/pocket-spend/](https://mayanknagda.github.io/pocket-spend/) | Expenses, income, receipts, and spending insights |
| Gym Tracker | [/gym-tracker/](https://mayanknagda.github.io/gym-tracker/) | Workouts, exercise history, strength progress, and body weight |
| Habit Tracker | [/habit-tracker/](https://mayanknagda.github.io/habit-tracker/) | Daily habits, schedules, skips, streaks, and consistency |

Each app has its own IndexedDB database, manifest, service worker, icons, Settings help, and backup format. Financial, workout, and habit records stay in the visitor's browser. There are no accounts or automatic cross-device sync. Each app asks for persistent browser storage when supported, but browser data can still be cleared. Export JSON regularly and keep a copy outside the browser. CSV exports are useful in Numbers or Excel; JSON is the recommended complete backup. The apps can import their own JSON and CSV exports, add missing records, and reject conflicting IDs.

On iPhone, open an app in Safari while online, tap **Share**, then **Add to Home Screen**. After the first successful visit, its service worker caches the app files for offline use. Updates wait for old app tabs to close so an open form is not reloaded mid-entry.

## Development and deployment

Serve the repository as static files for local preview. No build step or third-party packages are required. Run the Node tests shown in the root README. The browser IndexedDB checks live at `/pocket-spend/db-tests.html`, `/gym-tracker/db-tests.html`, and `/habit-tracker/db-tests.html`; each uses and removes a separate test database.

When changing app assets, increment that app's cache name in `sw.js`. Keep assets relative to the app directory and leave the service worker under that directory. Push committed changes to `main`; GitHub Pages serves the repository root. The homepage links come from `data/profile.json` under `misc` and `news`.
