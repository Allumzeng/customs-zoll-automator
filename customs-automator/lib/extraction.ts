import { PDFParse } from "pdf-parse";
import { CLAUDE_MODEL, createAnthropicClient, parseJsonResponse } from "./claude";
import { applyExtractionMetrics } from "./confidence";
import { EXTRACTION_SYSTEM_PROMPT } from "./prompts";
import { addAudit, demoExtraction, getModel, saveExtraction } from "./store";
import type { CustomsExtraction } from "./schema";

// Large uploads (full manuals, bundled archives) blow past the model's output
// budget — the JSON gets truncated mid-object and parsing fails — and cost a lot.
// Reject anything beyond this page count with a clear, actionable message.
const MAX_PAGES = 50;

// Count pages across the upload set: PDFs by their real page count, images as 1.
// A counting failure must not block extraction, so we fall back to 1 on error.
async function countPages(files: File[]): Promise<number> {
  let total = 0;
  for (const file of files) {
    const isPdf = (file.type || "").includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      total += 1;
      continue;
    }
    let parser: PDFParse | undefined;
    try {
      parser = new PDFParse({ data: await file.arrayBuffer() });
      const info = await parser.getInfo();
      total += info.total || 1;
    } catch {
      total += 1;
    } finally {
      await parser?.destroy();
    }
  }
  return total;
}

// Claude does not always honor the schema exactly: document_types may come back
// as a comma-separated string, and items may be omitted or non-array. Coerce both
// to real arrays so downstream rendering (.join / .map) never throws.
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string") {
    return value
      .split(/[,;/]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// Some scalar fields (language_detected) are occasionally returned by Claude
// wrapped as a FieldValue object {value, confidence, ...}. Unwrap to the scalar.
function toScalarString(value: unknown, fallback = ""): string {
  if (value && typeof value === "object" && "value" in (value as object)) {
    return String((value as { value: unknown }).value ?? fallback);
  }
  return value == null ? fallback : String(value);
}

function normalizeClaudeExtraction(
  raw: Partial<CustomsExtraction>,
  modelId: string
): CustomsExtraction {
  const base = demoExtraction(modelId);
  return applyExtractionMetrics({
    ...base,
    ...raw,
    id: raw.id || crypto.randomUUID(),
    model_id: modelId,
    created_at: raw.created_at || new Date().toISOString(),
    status: "extracted",
    language_detected: toScalarString(raw.language_detected, "mixed") as CustomsExtraction["language_detected"],
    document_types: toStringArray(raw.document_types),
    items: Array.isArray(raw.items) ? raw.items : [],
    human_corrections: raw.human_corrections || {},
  } as CustomsExtraction);
}

export async function extractDocuments(modelId: string, files: File[]) {
  if (!files.length) {
    throw new Error("Upload at least one PDF or image document.");
  }

  const pageCount = await countPages(files);
  if (pageCount > MAX_PAGES) {
    throw new Error(
      `This upload is ${pageCount} pages. The extractor handles up to ${MAX_PAGES} pages per submission. ` +
        `Please upload the specific shipment documents (commercial invoice, packing list, CMR, AWB, B/L) ` +
        `rather than full manuals, guides, or bundled archives.`
    );
  }

  const model = await getModel(modelId);
  const anthropic = await createAnthropicClient();
  let extraction: CustomsExtraction;

  if (!anthropic) {
    extraction = demoExtraction(model.id, files.map((file) => file.name));
  } else {
    const documentParts = await Promise.all(
      files.map(async (file) => ({
        type: "document",
        source: {
          type: "base64",
          media_type: file.type || "application/pdf",
          data: Buffer.from(await file.arrayBuffer()).toString("base64"),
        },
      }))
    );

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16384,
      system: model.extraction_prompt || EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            ...documentParts,
            {
              type: "text",
              text: "Extract all customs declaration fields from these documents. Return only valid JSON.",
            },
          ] as never,
        },
      ],
    });

    const rawText = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    extraction = normalizeClaudeExtraction(parseJsonResponse(rawText), model.id);
  }

  const saved = await saveExtraction(extraction);
  await addAudit({
    extraction_id: saved.id,
    model_id: saved.model_id,
    action: "extracted",
    actor: "system",
  });

  return saved;
}
