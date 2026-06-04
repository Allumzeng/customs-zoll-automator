import { CLAUDE_MODEL, createAnthropicClient, parseJsonResponse } from "./claude";
import { HS_CODE_PROMPT } from "./prompts";

export interface HsCodeSuggestion {
  hs_code: string;
  description_en: string;
  confidence: number;
  reasoning: string;
  alternatives: Array<{ code: string; description: string; confidence: number }>;
  eu_cn_code?: string;
  requires_human_review: boolean;
}

export async function suggestHsCode(description: string): Promise<HsCodeSuggestion> {
  if (!description.trim()) {
    throw new Error("Product description is required.");
  }

  const anthropic = await createAnthropicClient();
  if (!anthropic) {
    return {
      hs_code: "8471.90",
      description_en: description,
      confidence: 0.42,
      reasoning: "Demo suggestion only because ANTHROPIC_API_KEY is not configured. Confirm classification manually.",
      alternatives: [],
      eu_cn_code: "84719000",
      requires_human_review: true,
    };
  }

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: HS_CODE_PROMPT,
    messages: [
      {
        role: "user",
        content: `Classify this product for customs: ${description}`,
      },
    ],
  });

  const rawText = response.content[0]?.type === "text" ? response.content[0].text : "{}";
  return parseJsonResponse(rawText) as HsCodeSuggestion;
}
