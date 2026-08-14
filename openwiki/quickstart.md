---
type: Reference
title: Colombia SOS — Wiki quickstart
description: Entrypoint to the repository wiki. High-level map of the initiatives aggregator dashboard, its data feed, and a task-routing table from change intent to the relevant page, source files, and validation.
tags: [quickstart, navigation]
timestamp: 2026-08-14T00:00:00Z
openwiki:
  roles: [repository]
  source_paths: [index.html, app.js, data/initiatives.json]
  validation_commands: ["python3 -c \"import json; json.load(open('data/initiatives.json'))\""]
---

# Quickstart

Colombia SOS is a **static, dependency-free aggregator dashboard** for citizen relief initiatives after the Colombia earthquake. One JSON feed (`data/initiatives.json`) drives an editorial single-page UI with filters by audience, category, zone, and free-text search. There is no build step, no framework, and no backend: the JSON file is both the database and the future API surface.

## Wiki map

- [Architecture overview](architecture/overview.md) — how the page loads, renders, and filters.
- [Data model](data-model.md) — the initiatives feed: every field, why it exists, and the `status` vs `verification` split.
- [Deployment & automation](operations/deployment.md) — GitHub Pages deploy and the scheduled OpenWiki docs workflow.
- [Source map](source-map.md) — file-by-file inventory.

## Task routing

| Change intent | Edit | Read first | Validate |
|---|---|---|---|
| Add/update an initiative | `data/initiatives.json` | [Data model](data-model.md) | `python3 -c "import json; json.load(open('data/initiatives.json'))"`; conforms to `data/initiatives.schema.json` |
| Add a category or audience | `data/initiatives.schema.json`, `app.js` (`CATEGORY_LABELS` / `AUDIENCE_LABELS`) | [Data model](data-model.md) | Load site, check filter dropdown/chips |
| Change filtering/sorting behavior | `app.js` (`matches`, `renderCards`, `verificationRank`) | [Architecture overview](architecture/overview.md) | Serve locally, exercise chips + selects + search |
| Visual/brand changes | `styles.css` (design tokens in `:root`) | [Architecture overview](architecture/overview.md) § Design system | Serve locally at desktop and < 880px widths |
| Copy/structure of the page | `index.html` | — | Serve locally |
| Deploy behavior | `.github/workflows/pages.yml` | [Deployment & automation](operations/deployment.md) | Actions run on push to `main` |

## Running locally

```bash
python3 -m http.server 8000   # any static server; fetch() needs http://, not file://
```

## Invariants worth knowing

- `data/initiatives.json` is the single source of truth; the UI derives filters, stats, and cards from it at load time. Nothing initiative-specific is hardcoded in HTML.
- Demo data ships with placeholder (`#`) links; replace with verified links before public launch.
- All UI text is Colombian Spanish (`es-CO` date formatting in `app.js`).
