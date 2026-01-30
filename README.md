# Mayank Nagda · Personal Site

This repository powers [mayanknagda.github.io](https://mayanknagda.github.io), a data-driven personal site showcasing experience and publications in Generative AI.

## Features
- Responsive layout with light/dark theme toggle (defaults to light)
- Home page fed entirely from JSON data sources
- Dedicated pages for publications with reusable styling
- Easy content updates via `data/*.json` files
- GitHub Pages–friendly (no build step required)

## Project Structure
```
.
├── data/
│   ├── profile.json       # Hero content, section blurbs, skills, social links
│   └── publications.json  # Publication catalog with links & metadata
├── index.html             # Home page shell (loads JSON and renders sections)
├── publications.html      # Publications page shell
├── styles.css             # Shared styling + responsive theme system
└── script.js              # Single client-side renderer + theme logic
```

## Editing Content
1. Update `data/profile.json` for headline info, experience, education, skills, and footer note.
2. Maintain publication metadata in `data/publications.json`; each item can include authors, venue, year, tags, and a `link`.

Changes appear immediately after a page refresh once the files are committed to `main`.

## Local Preview
GitHub Pages will serve the site automatically. To test locally without pushing:
```bash
python -m http.server
```
Then browse to [`http://localhost:8000`](http://localhost:8000).

## Deployment
1. Commit changes in this repository.
2. Push to the `main` branch.
3. GitHub Pages automatically rebuilds within 1–2 minutes.

## License
This site is released under the MIT License. See [LICENSE](LICENSE) for details.
