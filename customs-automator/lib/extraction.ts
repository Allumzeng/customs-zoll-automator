import { CLAUDE_MODEL, createAnthropicClient, parseJsonResponse } from "./claude";
import { applyExtractionMetrics } from "./confidence";
import { EXTRACTION_SYSTEM_PROMPT } from "./prompts";
import { addAudit, demoExtraction, getModel, saveExtraction } from "./store";
import type { CustomsExtraction } from "./schema";

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
    human_corrections: raw.human_corrections || {},
  } as CustomsExtraction);
}

export async function extractDocuments(modelId: string, files: File[]) {
  if (!files.length) {
    throw new Error("Upload at least one PDF or image document.");
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
      max_tokens: 8192,
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
