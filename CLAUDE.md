# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Customs & Zoll Document Automator** — an AI pre-system that extracts structured data from German customs and trade documents (commercial invoices, packing lists, delivery notes, CMR/AWB) and hands validated, human-reviewed data off to the forwarder's existing certified customs software (ATLAS participant software like DAKOSY ZODIAK, Riege Scope, CargoSoft, AEB). It does **not** file to ATLAS directly.

Target customers: German SMB freight forwarders (Speditionen) too small for Digicust, underserved by generic AI tools.

## Architecture

**Stack:**
- **Framework:** Next.js 14 (App Router) — all in `customs-automator/`
- **Extraction:** Anthropic SDK (`claude-sonnet-4-20250514`) with multimodal PDF/image input
- **Storage:** Supabase (Postgres + Storage for PDF blobs)
- **UI:** shadcn/ui + Tailwind CSS
- **Phase 2:** n8n (email trigger) + `ssh2` SFTP for DAKOSY/Riege Scope handoff

**Data flow:**
```
Upload (extract page)
  → /api/extract → Claude API (base64 documents → structured JSON)
  → Supabase extractions table (raw_extraction JSONB + audit_log)
  → /review/[id] — human review screen (mandatory gate)
  → Approve → /api/export/json or /api/export/csv
```

## Commands

```bash
cd customs-automator
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint
```

Copy `.env.local.example` to `.env.local` and fill in keys before running.

## Output Formats

The canonical output is **structured JSON via REST/webhook**, with a file-based fallback (CSV/Excel/XML over SFTP) for partners who can't consume an API. Both carry per-field `confidence` and `source` (document + bounding region).

JSON schema follows **EU Customs Data Model (EUCDM) / UCC Annex B H1** field names:
- Header: parties (with EORI), Incoterms, currency, invoice number/value, country of origin, transport details
- Line items array: description, HS/Warennummer, quantity, weight, value, packaging

**Do not build:** direct ATLAS XML filing, EDIFACT CUSDEC generation, or ATLAS participant certification. These require months of regulatory certification work owned by incumbents.

## Key Domain Constraints

- **Human-in-the-loop is mandatory**, not optional — EU UCC Art. 15(2) keeps declarant liability with the forwarder; §378 AO makes incorrect declarations a €50k-fine offence. Every field must be reviewable before export.
- **Confidence-score routing:** high-confidence fields auto-populate; low-confidence fields route to a review queue showing value + source-document region; corrections become training data.
- **Downstream targets (lowest common denominator):** DAKOSY ingests Excel/CSV (Drag&Map tool) + SFTP; Riege Scope ingests CSV/SCI; CargoSoft exposes REST/JSON. Configurable per-customer column mapping is required.
- **ATLAS Release 10.2** is the current production release (live 28 Feb 2026, adds CCI/Centralised Clearance). AES 3.0 adds mandatory fields: carrier, means-of-transport registration, country of origin, security indicator, LRN→MRN. Field schemas must be versioned.

## Key Files

| Path | Purpose |
|---|---|
| `customs-automator/lib/schema.ts` | All TypeScript types: `FieldValue<T>`, `CustomsExtraction`, `LineItem`, `Model`, `EvalResult` |
| `customs-automator/lib/claude.ts` | Anthropic client, `EXTRACTION_SYSTEM_PROMPT`, `MODEL_BUILDER_PROMPT`, `HS_CODE_SYSTEM_PROMPT` |
| `customs-automator/lib/eval.ts` | `runEval()` — field accuracy, HS accuracy, ECE calibration |
| `customs-automator/app/api/extract/route.ts` | Core extraction endpoint (multipart PDF → Claude → Supabase) |
| `customs-automator/app/review/[extraction_id]/page.tsx` | Human review screen (mandatory gate before any export) |
| `customs-automator/supabase/migrations/001_init.sql` | DB schema: models, extractions, source_documents, audit_log, eval_cases |

## Production-Readiness Checklist (from spec)

Before deploying for real cargo:
- [ ] Field accuracy > 95% on test set
- [ ] HS code accuracy > 85% (first 6 digits) on test set
- [ ] Human gate unbypassable — no export path skips review
- [ ] GoBD audit log active — every field edit logged with timestamp + actor
- [ ] Mixed-language tests pass (ZH invoice + DE packing list combo)
- [ ] Multi-document conflict detection tested
- [ ] Error handling: Claude timeout, malformed JSON, corrupted PDF

## Reference Documents

- [Output formats & integration research](compass_artifact_wf-616951a8-4606-4693-9018-83228c7c932c_text_markdown.md) — ATLAS/EDIFACT landscape, TMS vendor capabilities, Digicust architecture analysis, recommended output stack
- [AI prototyping playbook](compass_artifact_wf-5a889d1b-46cc-409f-85c1-da1bab07ca72_text_markdown.md) — market context, build-vs-buy analysis, pricing benchmarks, anti-patterns
