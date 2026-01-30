# AGENTS.md

This repository is a static personal site. Follow these guidelines when making changes.

## General
- Keep edits minimal and consistent with existing style.
- Prefer plain HTML/CSS/JS with no build step.
- Use ASCII only unless a file already contains Unicode.
- Avoid introducing new dependencies.

## Content Sources
- `data/profile.json` is the primary source for homepage content.
- `data/publications.json` powers the publications list.
- Markdown notes live in `misc/`.

## Misc Markdown Notes
- Notes in `misc/` are auto-listed on the home page under “misc”.
- The list shows the 4 most recent notes.
- To control titles/dates, add frontmatter at the top of each markdown file:
  ```md
  ---
  title: My Note Title
  date: 2025-12-20
  ---
  ```
- The site uses a generated `misc/index.json` for GitHub Pages. It is created by a GitHub Action on every push that touches `misc/`.
- If no frontmatter `date:` is present, the generated index falls back to the file’s git creation date.
- The note view is `misc.html?doc=filename.md` and uses the site theme/background.

## Do Not Do
- Do not reintroduce `projects` pages or data.
- Do not add build tooling unless explicitly requested.

## Files of Interest
- `index.html`: homepage layout
- `styles.css`: global styling
- `script.js`: homepage rendering + misc list
- `misc.html` and `markdown.js`: markdown viewer
