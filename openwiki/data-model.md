---
type: Data Model
title: Initiatives feed
description: Field-by-field contract of data/initiatives.json — categories, audiences, zones, organizer types, link types, and the deliberate split between initiative status and information verification designed for AI-driven freshness checks.
tags: [data, schema, initiatives]
timestamp: 2026-08-14T00:00:00Z
openwiki:
  roles: [domain]
  change_kinds: [schema, content]
  source_paths: [data/initiatives.json, data/initiatives.schema.json]
  invariants: [Every initiative id is a stable kebab-case slug and never reused., "status answers 'does the initiative exist?'; verification answers 'is our information current?' — they change independently."]
  validation_commands: ["python3 -c \"import json; json.load(open('data/initiatives.json'))\""]
---

# Initiatives feed

`data/initiatives.json` is the entire backend. It is validated by `data/initiatives.schema.json` (JSON Schema 2020-12) and shaped for three consumers: the dashboard UI, human editors reviewing submissions, and a future MCP server / AI agent that refreshes freshness metadata.

## Top level

| Field | Meaning |
|---|---|
| `event` | `{ name, date, description }` of the disaster this feed covers |
| `updatedAt` | Date of the last editorial change to the feed |
| `initiatives[]` | The initiative records below |

## Initiative record

| Field | Values | Purpose |
|---|---|---|
| `id` | kebab-case slug (`ferulas-3d-001`) | Stable reference for dedupe, links, MCP lookups |
| `title`, `summary` | free text (Spanish) | What people read |
| `category` | `sos`, `salud`, `donaciones`, `albergue`, `suministros`, `legal`, `mascotas`, `reconstruccion`, `informacion` | Primary filter; labels live in `app.js` `CATEGORY_LABELS` |
| `audiences[]` | `afectado`, `donante`, `voluntario`, `organizacion` | Drives the "¿Quién eres?" chips — the product's core filter |
| `zones[]` | department/city names or `Nacional` | Geographic filter; zone dropdown is derived from these values |
| `organizer` | `{ name, type }`, type ∈ `ciudadano`, `colectivo`, `ong`, `gobierno`, `empresa` | Trust signal |
| `links[]` | `{ type, url, label }`, type ∈ `web`, `instagram`, `tiktok`, `whatsapp`, `telefono`, `formulario`, `mapa` | Calls to action; demo data uses `#` placeholders |
| `needs[]` / `offers[]` | free text | Matches donors/volunteers (needs) with affected people (offers) |
| `status` | `activa`, `pausada`, `finalizada` | Lifecycle of the initiative itself |
| `verification` | `{ state, lastCheckedAt, checkedBy, source }`, state ∈ `verificada`, `por_verificar`, `desactualizada` | Freshness of *our information about* the initiative |
| `tags[]`, `createdAt`, `updatedAt` | metadata | Search and audit |

## The status / verification split

This is the load-bearing design decision. `status` describes the world; `verification` describes our knowledge of it. An automated agent can re-check links and social accounts on a schedule and update only `verification.state` and `lastCheckedAt` without touching editorial content — and the UI already ranks cards by that freshness (`verificationRank` in `app.js`). New badge states need a matching `status--<state>` CSS class in `styles.css`.

## Adding an initiative

1. Append a record conforming to the schema (copy a sibling as template).
2. Keep `verification.state: por_verificar` until a human confirms links and contacts, recording `checkedBy` and `source`.
3. Validate: `python3 -c "import json; json.load(open('data/initiatives.json'))"` (or any JSON Schema validator against `data/initiatives.schema.json`).

The public submission path is the "Proponerla aquí" button in `index.html`, which opens a pre-labeled GitHub issue (`propuesta`) for editorial review before anything lands in the feed.
