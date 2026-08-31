# Customs & Zoll Document Automator

An AI pre-system that extracts structured, customs-ready data from German trade documents and hands it off — after mandatory human review — to a forwarder's existing certified customs software. **It does not file to ATLAS directly.** It sits in front of certified systems (DAKOSY ZODIAK, Riege Scope, CargoSoft, AEB) as a data-extraction and review layer.

Built for German SMB freight forwarders (Speditionen) too small for Digicust and underserved by generic AI tools. Tri-lingual: **Chinese · English · German**.

The application itself lives in [`customs-automator/`](customs-automator/) — see its [README](customs-automator/README.md) for setup, environment variables, and the full workflow.

## Why this exists

German customs filing (ATLAS) requires certified participant software — months of regulatory work owned by incumbents like DAKOSY, AEB, Format, and Riege Scope. The wedge is the layer in front of it: turning a pile of PDFs (commercial invoice, packing list, CMR/AWB, Zollanmeldung) into clean, validated, EUCDM-aligned structured data that a human reviews once and those existing systems can ingest.

Under EU UCC Art. 15(2), the declarant stays liable for accuracy regardless of tooling, and §378 AO makes an incorrect declaration a fine-worthy offence — so the human-review gate is not a feature to cut, it's the product's legal foundation.

## How it works

```
Upload documents (PDF/image)
  → Claude extracts EUCDM-aligned fields, scores per-field confidence
  → Human review screen (mandatory gate — nothing exports without approval)
  → Export as structured JSON (webhook-ready) or CSV/Excel (SFTP / Drag&Map)
  → Forwarder's certified ATLAS participant software takes it from there
```

Every extraction, edit, and export is logged to an append-only, GoBD-style audit trail.

## Repository layout

| Path | Purpose |
|---|---|
| [`customs-automator/`](customs-automator/) | The Next.js application — extraction, review UI, export, eval harness. Start here to run it. |
| [`customs-automator-build-spec.md`](customs-automator-build-spec.md) | Full build spec: architecture decisions, phased tech stack, data model. |
| [`compass_artifact_wf-616951a8-4606-4693-9018-83228c7c932c_text_markdown.md`](compass_artifact_wf-616951a8-4606-4693-9018-83228c7c932c_text_markdown.md) | Research on output formats & integration patterns — ATLAS/EDIFACT landscape, TMS vendor capabilities, why JSON/CSV over EDIFACT/XML. |
| [`compass_artifact_wf-5a889d1b-46cc-409f-85c1-da1bab07ca72_text_markdown.md`](compass_artifact_wf-5a889d1b-46cc-409f-85c1-da1bab07ca72_text_markdown.md) | Market research: German Mittelstand AI adoption, build-vs-buy analysis, pricing benchmarks. |
| [`CLAUDE.md`](CLAUDE.md) | Project guidance for AI coding assistants working in this repo. |

## Quick start

```bash
cd customs-automator
npm install
cp .env.local.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without a Supabase config the app runs against an in-memory demo store — see the [app README](customs-automator/README.md) for persistent setup and the full field/environment reference.

## Status

MVP. Not certified, not connected to ATLAS, and not a substitute for a customs broker's sign-off. See [`CLAUDE.md`](CLAUDE.md) for the production-readiness checklist (accuracy thresholds, conflict detection, error handling) that must be met before this touches real cargo.
