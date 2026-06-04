# Customs & Zoll Document Automator

AI pre-system that extracts structured, customs-ready data from trade documents and hands it off to a forwarder's existing customs software (DAKOSY ZODIAK, Riege Scope, CargoSoft, AEB). It **does not file to ATLAS directly** — it sits in front of certified systems as a data-extraction and human-review layer.

Built for German SMB freight forwarders (Speditionen). Tri-lingual: **Chinese · English · German**.

## What it does

- **Extracts** EUCDM-aligned fields from Commercial Invoices, Packing Lists, CMR, AWB, B/L, and Zollanmeldung (PDF or image) using Claude.
- **Scores confidence** per field, flags low-confidence and conflicting values for review.
- **Suggests HS / Warennummer codes** with reasoning and confidence.
- **Enforces a mandatory human-review gate** — no data can be exported until a person approves it.
- **Exports** approved data as JSON (webhook-ready) or CSV (for SFTP/Drag&Map handoff).
- **Logs every action** (extract / edit / approve / export) to a GoBD-style append-only audit trail.
- **Tracks accuracy** with a built-in eval harness (field accuracy, HS accuracy, confidence calibration).

## ⚠️ Legal notice

Extracted data **must be verified by a qualified person** before use in any customs declaration. Under EU UCC Art. 15(2) and German §378 AO, the declarant remains fully liable for accuracy. The human-review gate in this tool is a deliberate, non-bypassable safeguard — do not remove it.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| AI | Anthropic SDK — `claude-sonnet-4-20250514` |
| Storage | Supabase (Postgres + Storage) — optional; falls back to in-memory demo store |
| UI | shadcn/ui + Tailwind CSS |

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Workflow

1. **Dashboard** (`/`) — extraction models + recent extractions (a tri-lingual default model is pre-seeded).
2. **Extract** (`/extract`) — upload one or more documents; multiple files are cross-referenced.
3. **Review** (`/review/[id]`) — verify fields; low-confidence ones are flagged. Export unlocks only after approval.
4. **Export** — download JSON or CSV for handoff.

## Operating modes

| Configured in `.env.local` | Behaviour |
|---|---|
| `ANTHROPIC_API_KEY` only | Real Claude extraction; records held in an **in-memory store that resets on restart**. Good for demos/testing. |
| `ANTHROPIC_API_KEY` + Supabase keys | Data **persists**; audit log is durable. Production path. |

**Enabling Supabase:** create a project at [supabase.com](https://supabase.com), run [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) in its SQL editor, then fill the three Supabase values in `.env.local` and restart. The app auto-detects the keys.

If no `ANTHROPIC_API_KEY` is set, extraction returns demo data so the UI is still explorable.

## Environment variables

```bash
ANTHROPIC_API_KEY=sk-ant-...          # required for real extraction
NEXT_PUBLIC_SUPABASE_URL=             # optional — enables persistence
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # server-side only — never expose to the client
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`.env.local` is git-ignored. Never commit real keys.

## Project structure

```
app/
  api/        extract · hs-code · model · export(json|csv) · eval · review
  extract/    upload + extraction trigger
  review/     human-review screen (the approval gate)
  models/     model list, detail, and creation (Development Mode)
lib/
  schema.ts     source-of-truth TypeScript types
  claude.ts     prompts + Anthropic client
  extraction.ts core extraction logic (Claude → normalized record)
  hs-code.ts    standalone HS-code classifier
  eval.ts       accuracy eval harness
  store.ts      data layer (Supabase or in-memory fallback)
  confidence.ts confidence aggregation + metrics
components/customs/   review UI, uploader, HS lookup, model form
supabase/migrations/  database schema
```

## Status

MVP. See the in-repo build spec and `CLAUDE.md` for the full specification and the production-readiness checklist (accuracy thresholds, conflict detection, error handling) before deploying for real cargo.
