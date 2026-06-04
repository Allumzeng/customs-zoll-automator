import type { CustomsExtraction, FieldValue } from "./schema";

export function emptyField<T = string>(value: T | null = null): FieldValue<T> {
  return {
    value,
    confidence: value === null ? 0 : 0.5,
    source_page: null,
    source_text: null,
    flagged: true,
  };
}

export function collectAllConfidences(value: unknown): number[] {
  const confidences: number[] = [];

  function traverse(node: unknown) {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (typeof record.confidence === "number") {
      confidences.push(Math.max(0, Math.min(1, record.confidence)));
    }
    Object.values(record).forEach(traverse);
  }

  traverse(value);
  return confidences;
}

export function countFields(value: unknown) {
  let extracted = 0;
  let missing = 0;
  let lowConfidence = 0;

  function traverse(node: unknown) {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if ("confidence" in record && "value" in record) {
      if (record.value === null || record.value === "") missing += 1;
      else extracted += 1;
      if (typeof record.confidence === "number" && record.confidence < 0.7) {
        lowConfidence += 1;
      }
    }
    Object.values(record).forEach(traverse);
  }

  traverse(value);
  return { extracted, missing, lowConfidence };
}

export function applyExtractionMetrics(extraction: CustomsExtraction): CustomsExtraction {
  const confidences = collectAllConfidences(extraction);
  const { extracted, missing, lowConfidence } = countFields(extraction);
  const overall =
    confidences.length > 0
      ? confidences.reduce((sum, confidence) => sum + confidence, 0) / confidences.length
      : 0;

  return {
    ...extraction,
    overall_confidence: Number(overall.toFixed(4)),
    fields_extracted: extracted,
    fields_missing: missing,
    fields_low_confidence: lowConfidence,
    requires_review: lowConfidence > 0 || confidences.some((confidence) => confidence < 0.7),
  };
}

export function confidenceTone(confidence: number) {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.7) return "medium";
  return "low";
}
