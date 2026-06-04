export const CLAUDE_MODEL = "claude-sonnet-4-20250514";

export async function createAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic({ apiKey });
}

export function parseJsonResponse(rawText: string) {
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}
