# Mayank Nagda · Personal Site

This repository powers [mayanknagda.github.io](https://mayanknagda.github.io), a data-driven personal site showcasing experience, publications, and notes in Generative AI. It also hosts three independent, private Progressive Web Apps.

## Features
- Responsive layout with automatic light/dark mode and a remembered manual override
- Home page fed entirely from JSON data sources
- Markdown notes rendered on demand from `misc/`
- Dedicated pages for publications with reusable styling
- Easy content updates via `data/*.json` files
- GitHub Pages–friendly (no build step required)
- Three offline-first apps with local IndexedDB data and JSON/CSV backups: [Pocket Spend](https://mayanknagda.github.io/pocket-spend/), [Gym Tracker](https://mayanknagda.github.io/gym-tracker/), and [Habit Tracker](https://mayanknagda.github.io/habit-tracker/)

## Project Structure
```
.
├── data/
│   ├── profile.json       # Hero content, section blurbs, skills, social links
│   └── publications.json  # Publication catalog with links & metadata
├── misc/                  # Markdown notes + generated index
├── pocket-spend/          # Personal finance PWA
├── gym-tracker/           # Strength training PWA
├── habit-tracker/         # Daily habit PWA
├── docs/apps.md           # App family use, storage, and backup guide
├── index.html             # Home page shell (loads JSON and renders sections)
├── publications.html      # Publications page shell
├── markdown.js            # Markdown viewer (direct rendering)
├── styles.css             # Shared styling + responsive theme system
├── scripts/               # Helpers for generating misc index
└── script.js              # Single client-side renderer + theme logic
```

## Editing Content
1. Update `data/profile.json` for headline info, experience, education, skills, and footer note.
2. Maintain publication metadata in `data/publications.json`; each item can include authors, venue, year, tags, and a `link`.
3. Add markdown notes to `misc/` and push. GitHub Actions generates `misc/index.json`.
4. Update `data/profile.json` for app links in `misc` and launch updates in `news`.

Changes appear after a page refresh once the files are committed to `main` and GitHub Actions finishes.

## Local Preview
GitHub Pages will serve the site automatically. To test locally without pushing:
```bash
python -m http.server
```
Then browse to [`http://localhost:8000`](http://localhost:8000).

Open `/pocket-spend/`, `/gym-tracker/`, or `/habit-tracker/` to preview each app. Run their calculation tests with `node --test pocket-spend/tests.mjs gym-tracker/tests.mjs habit-tracker/tests.mjs`. Each app has its own README and in-app **How to Use** section. See [docs/apps.md](docs/apps.md) for storage, backup, and installation details.

## Deployment
1. Commit changes in this repository.
2. Push to the `main` branch.
3. GitHub Pages automatically rebuilds within 1–2 minutes.

## Keeping README Updated
- This README is updated when significant site behavior changes (content workflow, rendering, licensing).

## License
All rights reserved. See [LICENSE](LICENSE) for details.
