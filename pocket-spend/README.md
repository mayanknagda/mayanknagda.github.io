# Pocket Spend

Pocket Spend is a buildless, offline-first personal finance app. All records are stored in IndexedDB in the visitor's browser. The service worker caches only files under `/pocket-spend/`. No personal financial data is sent to this repository or a server.

Open `/pocket-spend/` on GitHub Pages. On iPhone, use Safari's Share menu and **Add to Home Screen** after the first visit. The app works offline once its assets are cached. Browser data does not sync automatically; use **Settings > Data & Backup** to save a JSON backup regularly. CSV exports are also supported for Numbers and Excel.

Run calculation and transfer tests with `node --test pocket-spend/tests.mjs`. For real IndexedDB operations, serve the repository locally and open `/pocket-spend/db-tests.html`; it uses a separate temporary database and deletes it afterward.

When changing cached app files, increase the cache version in `sw.js`. The updated worker activates after old app tabs close, so an in-progress form is not interrupted.
