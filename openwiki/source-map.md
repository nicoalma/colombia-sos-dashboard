---
type: Reference
title: Source map
description: File-by-file inventory of the repository with each file's responsibility and its documenting wiki page.
tags: [source-map, navigation]
timestamp: 2026-08-14T00:00:00Z
openwiki:
  roles: [repository]
---

# Source map

| Path | Responsibility | Documented in |
|---|---|---|
| `index.html` | Static shell: masthead, stat tiles, filter controls, footer, submit button | [Architecture](architecture/overview.md) |
| `styles.css` | Design tokens + editorial layout (cream/ink/highlight, card rows, responsive) | [Architecture](architecture/overview.md) |
| `app.js` | Fetch feed, derive filters/stats, filter+sort+render cards | [Architecture](architecture/overview.md) |
| `data/initiatives.json` | Canonical initiatives feed (the "database" and future API) | [Data model](data-model.md) |
| `data/initiatives.schema.json` | JSON Schema for the feed | [Data model](data-model.md) |
| `.github/workflows/pages.yml` | Deploy repo root to GitHub Pages on push to `main` | [Deployment](operations/deployment.md) |
| `.github/workflows/openwiki-update.yml` | Scheduled OpenWiki docs refresh → PR | [Deployment](operations/deployment.md) |
| `README.md` | Human-facing project intro, data model summary, roadmap | — |
| `AGENTS.md` / `CLAUDE.md` | Agent instructions with the OpenWiki managed block | — |
