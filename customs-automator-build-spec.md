# Customs Document Automator — Complete Build Spec
## Tri-lingual (ZH/EN/DE) · HS Code AI · Accuracy Eval Harness

---

## 0. Context & Decisions Locked In

| Decision | Answer |
|---|---|
| Architecture | PickUpp dual-mode + HS Code suggestion + per-field confidence |
| Languages | Chinese · English · German (tri-lingual extraction) |
| Document types | Commercial Invoice, Packing List, CMR, AWB, B/L, Zollanmeldung, any email attachment |
| Primary output | Structured JSON (EUCDM-aligned) + CSV/Excel + SFTP |
| Human gate | Mandatory review screen before any export |
| Deployment start | Your own `ANTHROPIC_API_KEY` → local Next.js |
| Deployment end | Supabase + Vercel (or Hetzner for EU data residency) |
| Production-ready | Accuracy eval harness required |

---

## 1. Tech Stack (Start Simple)

### Phase 1 stack (start TODAY, no infra needed)
```
Next.js 14 (App Router)      — frontend + API routes
Anthropic SDK                — Claude API (claude-claude-sonnet-4-20250514)
Supabase                     — Postgres + pgvector + Storage (PDF blobs)
shadcn/ui + Tailwind         — UI components
pdf-parse / pdf2pic          — PDF text extraction + page images
```

### Add in Phase 2
```
n8n                          — email ingestion trigger
SFTP client (ssh2)           — DAKOSY/Riege handoff
```

### Environment variables (`.env.local`)
```bash
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-side only
```

---

## 2. File Structure

```
customs-automator/
├── app/
│   ├── page.tsx                     # Dashboard (model list)
│   ├── models/
│   │   ├── new/page.tsx             # Development Mode: create model
│   │   └── [id]/page.tsx           # Model detail + accuracy stats
│   ├── extract/
│   │   └── page.tsx                 # Production Mode: upload + extract
│   ├── review/
│   │   └── [extraction_id]/page.tsx # Human review screen
│   └── api/
│       ├── extract/route.ts         # Core extraction endpoint
│       ├── model/route.ts           # Create/update model
│       ├── hs-code/route.ts         # HS code suggestion
│       ├── export/json/route.ts     # JSON export
│       ├── export/csv/route.ts      # CSV/Excel export
│       └── eval/route.ts            # Run accuracy eval
├── lib/
│   ├── claude.ts                    # Claude API wrapper
│   ├── extraction.ts                # Core extraction logic
│   ├── hs-code.ts                   # HS code suggestion
│   ├── confidence.ts                # Confidence scoring
│   ├── supabase.ts                  # DB client + types
│   ├── schema.ts                    # TypeScript types (see Section 3)
│   └── eval.ts                      # Accuracy evaluation
├── components/
│   ├── ReviewField.tsx              # Single field with confidence badge
│   ├── ReviewTable.tsx              # Line items review table
│   ├── ConfidenceBadge.tsx          # Green/amber/red badge
│   ├── DocumentViewer.tsx           # PDF viewer with highlight
│   ├── ModelCard.tsx                # Model list item
│   └── DiffView.tsx                 # Ground truth vs extracted diff
└── supabase/
    └── migrations/
        └── 001_init.sql             # Schema (see Section 4)
```

---

## 3. TypeScript Schema (the source of truth for everything)

```typescript
// lib/schema.ts

export interface FieldValue<T = string> {
  value: T | null;
  confidence: number;          // 0–1
  source_page: number | null;  // which PDF page
  source_text: string | null;  // raw text this was extracted from
  flagged: boolean;            // true = needs human review
}

export interface Party {
  name: string;
  address: string;
  country: string;             // ISO 3166-1 alpha-2
  eori?: string;               // EU EORI number
  tax_id?: string;
}

export interface LineItem {
  line_number: number;
  description: FieldValue<string>;
  hs_code_suggested: FieldValue<string>;    // 6–8 digit HS/CN code
  hs_code_confidence: number;
  hs_code_reasoning: string;                // why Claude suggests this code
  quantity: FieldValue<number>;
  unit: FieldValue<string>;                 // kg, pcs, m, etc.
  unit_price: FieldValue<number>;
  total_value: FieldValue<number>;
  currency: FieldValue<string>;
  country_of_origin: FieldValue<string>;
  weight_net_kg: FieldValue<number>;
  weight_gross_kg: FieldValue<number>;
  // German/EU customs specific
  warennummer?: FieldValue<string>;         // German CN code (8-digit)
  ursprungsland?: FieldValue<string>;       // Country of origin (DE)
  package_count?: FieldValue<number>;
}

export interface CustomsExtraction {
  id: string;
  model_id: string;
  created_at: string;
  status: 'pending' | 'extracted' | 'reviewing' | 'approved' | 'exported';
  language_detected: 'zh' | 'en' | 'de' | 'mixed';
  document_types: string[];                 // ['invoice', 'packing_list', 'cmr']
  
  // Header fields
  invoice_number: FieldValue;
  invoice_date: FieldValue;
  exporter: FieldValue<Party>;
  importer: FieldValue<Party>;
  incoterms: FieldValue;                    // EXW, FOB, CIF, DAP, DDP...
  currency: FieldValue;
  total_invoice_value: FieldValue<number>;
  country_of_origin: FieldValue;
  country_of_destination: FieldValue;
  transport_mode: FieldValue;              // SEA, AIR, ROAD, RAIL
  gross_weight_kg: FieldValue<number>;
  net_weight_kg: FieldValue<number>;
  package_count: FieldValue<number>;
  package_type: FieldValue;
  marks_and_numbers: FieldValue;
  
  // Line items
  items: LineItem[];
  
  // Quality metrics
  overall_confidence: number;
  fields_extracted: number;
  fields_missing: number;
  fields_low_confidence: number;           // confidence < 0.7
  requires_review: boolean;
  
  // Human edits (applied during review)
  human_corrections: Record<string, unknown>;
  reviewed_by?: string;
  reviewed_at?: string;
  approved_at?: string;
}

export interface Model {
  id: string;
  name: string;
  label: string;
  description?: string;
  created_at: string;
  updated_at: string;
  document_types: string[];
  languages: string[];
  extraction_prompt: string;               // the core IP — DO NOT EXPOSE to client
  version: number;
  accuracy_metrics: {
    test_runs: number;
    avg_field_accuracy: number;
    avg_hs_accuracy: number;
    avg_confidence_calibration: number;    // ECE score
    last_evaluated_at?: string;
  };
}
```

---

## 4. Supabase Database Schema

```sql
-- supabase/migrations/001_init.sql

-- Models (prompt templates)
create table models (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  label        text,
  description  text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  document_types text[],
  languages    text[],
  extraction_prompt text not null,         -- keep server-side only
  version      int default 1,
  accuracy_metrics jsonb default '{}',
  is_active    boolean default true
);

-- Source documents (PDF blobs stored in Supabase Storage)
create table source_documents (
  id           uuid primary key default gen_random_uuid(),
  extraction_id uuid,
  file_name    text,
  storage_path text,                       -- path in Supabase Storage bucket
  document_type text,                      -- invoice | packing_list | cmr | awb | bl
  page_count   int,
  created_at   timestamptz default now()
);

-- Extractions
create table extractions (
  id           uuid primary key default gen_random_uuid(),
  model_id     uuid references models(id),
  status       text default 'pending',
  language_detected text,
  document_types text[],
  raw_extraction jsonb,                    -- full CustomsExtraction object
  human_corrections jsonb default '{}',
  overall_confidence float,
  requires_review boolean default true,
  reviewed_by  text,
  reviewed_at  timestamptz,
  approved_at  timestamptz,
  created_at   timestamptz default now()
);

-- GoBD-compliant audit log (append-only)
create table audit_log (
  id           bigserial primary key,
  extraction_id uuid references extractions(id),
  model_id     uuid,
  action       text not null,             -- extracted | field_edited | approved | exported
  actor        text,
  field_path   text,                      -- e.g. 'items[2].hs_code_suggested.value'
  old_value    jsonb,
  new_value    jsonb,
  created_at   timestamptz default now()
);

-- Eval test cases
create table eval_cases (
  id           uuid primary key default gen_random_uuid(),
  model_id     uuid references models(id),
  document_paths text[],
  ground_truth jsonb not null,            -- expected CustomsExtraction
  last_run_at  timestamptz,
  last_field_accuracy float,
  created_at   timestamptz default now()
);

-- Row level security
alter table models enable row level security;
alter table extractions enable row level security;
alter table audit_log enable row level security;
```

---

## 5. Core Extraction System Prompt

This is the most critical piece. Start with this and iterate.

```typescript
// lib/claude.ts

export const EXTRACTION_SYSTEM_PROMPT = `
You are an expert customs document analyst specializing in international trade documentation.
You extract structured data from commercial documents with high precision.
You work with documents in Chinese (Traditional and Simplified), English, and German.

## Your task
Extract all relevant customs declaration fields from the provided documents.
Documents may include: Commercial Invoice, Packing List, CMR (road transport), 
Air Waybill (AWB), Bill of Lading (B/L), or any combination thereof.

## Output format
Respond ONLY with a valid JSON object matching this exact schema.
Do not add any prose before or after the JSON.

{
  "language_detected": "zh|en|de|mixed",
  "document_types": ["invoice", "packing_list", "cmr", "awb", "bl"],
  "invoice_number": {
    "value": "string or null",
    "confidence": 0.0-1.0,
    "source_page": 1,
    "source_text": "exact text from document",
    "flagged": false
  },
  // ... (all header fields)
  "items": [
    {
      "line_number": 1,
      "description": { "value": "...", "confidence": 0.95, "source_page": 1, "source_text": "...", "flagged": false },
      "hs_code_suggested": { "value": "8471.30", "confidence": 0.82, "source_page": 1, "source_text": "Laptop computer", "flagged": false },
      "hs_code_reasoning": "Laptop computers classified under HS 8471.30 (Portable automatic data-processing machines)",
      "quantity": { "value": 10, "confidence": 0.99, "source_page": 1, "source_text": "10 PCS", "flagged": false },
      // ... all line item fields
    }
  ]
}

## Confidence scoring rules
- 0.95–1.00: Value is explicit, unambiguous, exact match in source text
- 0.80–0.94: Value is clear but requires minor inference (unit conversion, abbreviation expansion)
- 0.60–0.79: Value is probable but document is unclear, multiple possible readings
- 0.40–0.59: Value is a best guess — ALWAYS set flagged: true
- Below 0.40: Return null as value and flagged: true

## HS Code suggestion rules
- Always suggest a 6-digit minimum HS code, 8-digit (German CN code) when possible
- Base suggestion on: product description, materials, function, end use
- Include reasoning explaining WHY you chose this code
- Set confidence based on description clarity:
  - "Laptop computer, Intel i7, 16GB RAM" → 0.95
  - "Electronic goods" → 0.40 (too vague)
  - "Ersatzteile für Maschinen" (machine spare parts) → 0.50 (too broad)

## Language handling
- Extract field VALUES in their original document language
- Translate product descriptions to English in the description field
- Detect country codes as ISO 3166-1 alpha-2 (DE, CN, TW, US, etc.)
- Handle German: "Gewicht" = weight, "Menge" = quantity, "Preis" = price
- Handle Traditional Chinese: 重量=weight, 數量=quantity, 單價=unit price

## Multi-document rules
- If multiple documents are provided, cross-reference and reconcile
- If values conflict between documents (e.g. different weights on invoice vs packing list):
  - Set flagged: true on the conflicting field
  - Set source_text to: "CONFLICT: Invoice says X, Packing List says Y"
  - Set confidence: 0.30
- Trust the customs declaration (報單/Zollanmeldung) over commercial documents if provided

## Fields to extract
Header: invoice_number, invoice_date, exporter (name/address/country/EORI),
importer (name/address/country/EORI), incoterms, currency, total_invoice_value,
country_of_origin, country_of_destination, transport_mode, gross_weight_kg,
net_weight_kg, package_count, package_type, marks_and_numbers

Per line item: description, hs_code_suggested, quantity, unit, unit_price,
total_value, currency, country_of_origin, weight_net_kg, weight_gross_kg,
package_count, warennummer (German CN code if applicable)
`.trim();

// For Development Mode: generate extraction prompt from ground truth pairing
export const MODEL_BUILDER_PROMPT = (
  groundTruthExtraction: string,
  documentsDescription: string
) => `
You are building a reusable extraction prompt template for a specific customer's document format.

I will provide you with:
1. The CORRECT extraction result (ground truth from a completed customs declaration)
2. A description of the customer's source documents

Your task: Write a customer-specific extraction prompt that will consistently extract
the same fields from future documents from this customer, accounting for their
specific formatting quirks, field locations, and naming conventions.

CORRECT EXTRACTION (ground truth):
${groundTruthExtraction}

DOCUMENT DESCRIPTION:
${documentsDescription}

Write a precise extraction prompt for this customer. Focus on:
- Where each field typically appears in their documents
- Their specific naming conventions (e.g. "REF#" instead of "Invoice No.")
- Any calculated fields (e.g. total = quantity × unit price)
- Fields they typically omit
- Language patterns specific to this customer

Respond ONLY with the extraction prompt text, no preamble.
`.trim();
```

---

## 6. Core Extraction API Route

```typescript
// app/api/extract/route.ts

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase';
import { EXTRACTION_SYSTEM_PROMPT } from '@/lib/claude';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const modelId = formData.get('model_id') as string;
  const files = formData.getAll('files') as File[];
  
  const supabase = createClient();
  
  // 1. Load model prompt (server-side only — never expose to client)
  const { data: model } = await supabase
    .from('models')
    .select('extraction_prompt')
    .eq('id', modelId)
    .single();
  
  // 2. Prepare document content for Claude
  const documentParts = await Promise.all(
    files.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      const mimeType = file.type as 'application/pdf' | 'image/jpeg' | 'image/png';
      
      return {
        type: 'document' as const,
        source: {
          type: 'base64' as const,
          media_type: mimeType,
          data: base64,
        },
      };
    })
  );
  
  // 3. Call Claude with documents
  const systemPrompt = model?.extraction_prompt || EXTRACTION_SYSTEM_PROMPT;
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          ...documentParts,
          {
            type: 'text',
            text: 'Extract all customs declaration fields from these documents. Return only valid JSON.',
          },
        ],
      },
    ],
  });
  
  // 4. Parse and store
  const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
  let extraction;
  try {
    extraction = JSON.parse(rawText);
  } catch {
    // Claude sometimes wraps in ```json ... ``` — strip it
    const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();
    extraction = JSON.parse(cleaned);
  }
  
  // 5. Calculate requires_review (flag if any field has confidence < 0.7)
  const allConfidences = collectAllConfidences(extraction);
  const requiresReview = allConfidences.some(c => c < 0.7);
  const overallConfidence = allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length;
  
  // 6. Save to Supabase
  const { data: saved } = await supabase
    .from('extractions')
    .insert({
      model_id: modelId,
      status: 'extracted',
      raw_extraction: extraction,
      overall_confidence: overallConfidence,
      requires_review: requiresReview,
      language_detected: extraction.language_detected,
      document_types: extraction.document_types,
    })
    .select('id')
    .single();
  
  // 7. Audit log
  await supabase.from('audit_log').insert({
    extraction_id: saved?.id,
    model_id: modelId,
    action: 'extracted',
    actor: 'system',
  });
  
  return NextResponse.json({
    extraction_id: saved?.id,
    overall_confidence: overallConfidence,
    requires_review: requiresReview,
    redirect: `/review/${saved?.id}`,
  });
}

function collectAllConfidences(extraction: Record<string, unknown>): number[] {
  const confidences: number[] = [];
  const traverse = (obj: unknown) => {
    if (obj && typeof obj === 'object') {
      const o = obj as Record<string, unknown>;
      if ('confidence' in o && typeof o.confidence === 'number') {
        confidences.push(o.confidence);
      }
      Object.values(o).forEach(traverse);
    }
  };
  traverse(extraction);
  return confidences;
}
```

---

## 7. Human Review Screen (Key Component)

```typescript
// components/ReviewField.tsx

interface ReviewFieldProps {
  label: string;
  fieldPath: string;           // e.g. 'invoice_number'
  value: FieldValue;
  onEdit: (path: string, newValue: string) => void;
}

export function ReviewField({ label, fieldPath, value, onEdit }: ReviewFieldProps) {
  const confidenceColor = 
    value.confidence >= 0.9 ? 'text-green-600 bg-green-50' :
    value.confidence >= 0.7 ? 'text-amber-600 bg-amber-50' :
    'text-red-600 bg-red-50';

  return (
    <div className={`p-3 rounded-lg border ${value.flagged ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
        <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${confidenceColor}`}>
          {(value.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <input
        defaultValue={value.value ?? ''}
        onChange={(e) => onEdit(fieldPath, e.target.value)}
        className="w-full text-sm border-0 p-0 focus:ring-0 bg-transparent"
      />
      {value.source_text && (
        <p className="text-xs text-gray-400 mt-1 truncate" title={value.source_text}>
          Source: {value.source_text}
        </p>
      )}
      {value.flagged && (
        <p className="text-xs text-red-500 mt-1">⚠ Low confidence — please verify</p>
      )}
    </div>
  );
}
```

---

## 8. Eval Harness

```typescript
// lib/eval.ts
// Run this after every model update to track accuracy

export interface EvalResult {
  model_id: string;
  test_case_id: string;
  field_accuracy: number;      // % of fields exactly matching ground truth
  hs_accuracy: number;         // % of HS codes with correct first 6 digits
  confidence_calibration: number; // ECE — does confidence correlate with accuracy?
  errors: Array<{
    field: string;
    expected: string;
    got: string;
    confidence: number;
  }>;
}

export async function runEval(
  modelId: string,
  testCaseId: string,
  extraction: CustomsExtraction,
  groundTruth: CustomsExtraction
): Promise<EvalResult> {
  const errors: EvalResult['errors'] = [];
  let correct = 0, total = 0;
  let hsCorrect = 0, hsTotal = 0;
  
  // Compare header fields
  const headerFields = ['invoice_number', 'incoterms', 'currency', 
                        'total_invoice_value', 'country_of_origin'] as const;
  
  for (const field of headerFields) {
    total++;
    const extracted = extraction[field]?.value;
    const expected = groundTruth[field]?.value;
    
    if (String(extracted).trim() === String(expected).trim()) {
      correct++;
    } else {
      errors.push({
        field,
        expected: String(expected),
        got: String(extracted),
        confidence: extraction[field]?.confidence ?? 0,
      });
    }
  }
  
  // Compare line items (by line number)
  for (const expectedItem of groundTruth.items) {
    const extractedItem = extraction.items.find(
      i => i.line_number === expectedItem.line_number
    );
    if (!extractedItem) continue;
    
    // HS code accuracy (first 6 digits)
    if (expectedItem.hs_code_suggested?.value) {
      hsTotal++;
      const expectedHS = expectedItem.hs_code_suggested.value.replace(/\./g, '').slice(0, 6);
      const extractedHS = (extractedItem.hs_code_suggested?.value || '').replace(/\./g, '').slice(0, 6);
      if (expectedHS === extractedHS) hsCorrect++;
    }
    
    // Quantity and value accuracy
    for (const field of ['quantity', 'unit_price', 'total_value'] as const) {
      total++;
      const extracted = extractedItem[field]?.value;
      const expected = expectedItem[field]?.value;
      if (Math.abs(Number(extracted) - Number(expected)) < 0.01) {
        correct++;
      } else {
        errors.push({
          field: `item[${expectedItem.line_number}].${field}`,
          expected: String(expected),
          got: String(extracted),
          confidence: extractedItem[field]?.confidence ?? 0,
        });
      }
    }
  }
  
  return {
    model_id: modelId,
    test_case_id: testCaseId,
    field_accuracy: total > 0 ? correct / total : 0,
    hs_accuracy: hsTotal > 0 ? hsCorrect / hsTotal : 0,
    confidence_calibration: 0, // TODO: implement ECE calculation
    errors,
  };
}
```

---

## 9. Build Phases (Vibe-Code in This Order)

### Phase 1 — Core extraction works (Days 1–5)
```
Day 1: Project setup + Supabase schema + env vars
Day 2: /api/extract route — upload PDF → Claude → JSON response
Day 3: Basic review page — show extracted fields with confidence badges
Day 4: Approve button → mark extraction as approved
Day 5: CSV export from approved extraction
```

**First vibe-coding prompt (paste this into Cursor):**
```
Create a Next.js 14 API route at app/api/extract/route.ts that:
1. Accepts multipart/form-data with files[] (PDFs) and model_id
2. Converts each PDF file to base64
3. Sends all files to Claude claude-sonnet-4-20250514 using the Anthropic SDK
4. Uses this system prompt: [paste EXTRACTION_SYSTEM_PROMPT]
5. Parses the JSON response
6. Returns { extraction_id, overall_confidence, requires_review }
Use @anthropic-ai/sdk. No auth for now. TypeScript.
```

### Phase 2 — Full review UI (Days 6–10)
```
Day 6: ReviewField component with confidence color coding
Day 7: Line items table with inline editing
Day 8: Source document PDF viewer (react-pdf)
Day 9: Development Mode — ground truth upload + diff view
Day 10: Model creation and storage
```

### Phase 3 — Production pipeline (Days 11–18)
```
Day 11: n8n email webhook → trigger extraction
Day 12: Multi-document detection and routing
Day 13: HS Code suggestion API route
Day 14: JSON webhook output
Day 15: SFTP export (for DAKOSY/Riege Scope)
Day 16: Model template management UI
Day 17: Eval harness integration
Day 18: Accuracy dashboard
```

---

## 10. Deployment Roadmap

### Now (Day 1): Run locally
```bash
npx create-next-app@latest customs-automator --typescript --tailwind --app
cd customs-automator
npm install @anthropic-ai/sdk @supabase/supabase-js pdf-parse
# Create .env.local with ANTHROPIC_API_KEY + Supabase keys
npm run dev
```

### Week 4: Deploy to Vercel (demo-ready)
```bash
# Push to GitHub → Vercel auto-deploys
# Add env vars in Vercel dashboard
vercel --prod
```

### Month 2: EU hosting for GDPR (client-ready)
```
Option A: Vercel EU region (Frankfurt) — easiest
Option B: Hetzner VPS (Nuremberg) — full control, cheapest for DE clients
  - Docker: Next.js + n8n + Nginx
  - Supabase: self-hosted on same VPS or use Supabase EU region
  
For German clients (data residency requirement):
→ All data stays in EU (Supabase Frankfurt region or self-hosted)
→ No data sent to US servers (Claude API goes via your EU-hosted server)
```

### GDPR compliance checklist for client deployment
- [ ] Privacy policy (German: Datenschutzerklärung) — use iubenda.com generator
- [ ] Data processing agreement (DPA) with Anthropic — available at anthropic.com
- [ ] DPA with Supabase — available in Supabase dashboard
- [ ] GoBD audit log (already in schema — append-only, no deletes)
- [ ] Document retention policy (default: 10 years for customs docs in DE)
- [ ] Data subject rights handler (delete/export user data on request)

---

## 11. HS Code Suggestion — Separate API

```typescript
// app/api/hs-code/route.ts

const HS_CODE_PROMPT = `
You are an expert customs classifier specializing in HS (Harmonized System) tariff codes.
Given a product description in Chinese, English, or German, suggest the most accurate HS code.

Return ONLY this JSON, nothing else:
{
  "hs_code": "8471.30",
  "description_en": "Portable automatic data-processing machines (laptops)",
  "confidence": 0.92,
  "reasoning": "Laptops fall under Chapter 84 (Nuclear reactors, boilers, machinery), specifically 8471 for automatic data-processing machines. 8471.30 covers portable machines weighing ≤10kg.",
  "alternatives": [
    { "code": "8471.41", "description": "Other ADP machines: comprising in same housing at least a CPU and an input/output unit", "confidence": 0.15 }
  ],
  "eu_cn_code": "8471300000",
  "requires_human_review": false
}

Rules:
- Always provide 6-digit HS code minimum
- Add EU CN code (8-digit) when you can determine it
- Set requires_human_review: true if confidence < 0.70 or product is dual-use/controlled
- Controlled goods (weapons, chemicals, crypto): set confidence 0 and note in reasoning
`;
```

---

## 12. Key "Actually Deployable" Checklist

Before calling this production-ready for real cargo:

- [ ] **Accuracy eval harness passes** — field accuracy > 95% on your test set
- [ ] **HS code accuracy** > 85% on test set (first 6 digits correct)
- [ ] **Confidence calibration** — 90%-confidence fields are right ≥90% of the time  
- [ ] **Human gate is unbypassable** — no export path skips review screen
- [ ] **GoBD audit log** — every field edit is logged with timestamp and actor
- [ ] **PDF page count limit handled** — graceful error if > 200 pages
- [ ] **Mixed-language tests pass** — Chinese invoice + German packing list combo tested
- [ ] **Multi-document conflict detection** — test with mismatched invoice vs PL weights
- [ ] **Error handling** — Claude API timeout, malformed JSON, corrupted PDF all handled
- [ ] **Rate limiting** — max 10 concurrent extractions to avoid API throttling
- [ ] **Cost monitoring** — alert if a single extraction exceeds 50,000 tokens (~$0.75)
