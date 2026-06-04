import type { CustomsExtraction } from "./schema";

export interface EvalResult {
  model_id: string;
  test_case_id: string;
  field_accuracy: number;
  hs_accuracy: number;
  confidence_calibration: number;
  errors: Array<{
    field: string;
    expected: string;
    got: string;
    confidence: number;
  }>;
}

function normalizeHs(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "").slice(0, 6);
}

function exactMatch(a: unknown, b: unknown) {
  return String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
}

export async function runEval(
  modelId: string,
  testCaseId: string,
  extraction: CustomsExtraction,
  groundTruth: CustomsExtraction
): Promise<EvalResult> {
  const errors: EvalResult["errors"] = [];
  let correct = 0;
  let total = 0;
  let hsCorrect = 0;
  let hsTotal = 0;
  const calibration: Array<{ confidence: number; correct: boolean }> = [];

  const headerFields = [
    "invoice_number",
    "incoterms",
    "currency",
    "total_invoice_value",
    "country_of_origin",
    "country_of_destination",
    "gross_weight_kg",
    "net_weight_kg",
  ] as const;

  for (const field of headerFields) {
    total += 1;
    const got = extraction[field]?.value;
    const expected = groundTruth[field]?.value;
    const isCorrect = exactMatch(got, expected);
    calibration.push({ confidence: extraction[field]?.confidence ?? 0, correct: isCorrect });
    if (isCorrect) {
      correct += 1;
    } else {
      errors.push({
        field,
        expected: String(expected),
        got: String(got),
        confidence: extraction[field]?.confidence ?? 0,
      });
    }
  }

  for (const expectedItem of groundTruth.items) {
    const extractedItem = extraction.items.find((item) => item.line_number === expectedItem.line_number);
    if (!extractedItem) continue;

    if (expectedItem.hs_code_suggested?.value) {
      hsTotal += 1;
      const isHsCorrect =
        normalizeHs(expectedItem.hs_code_suggested.value) === normalizeHs(extractedItem.hs_code_suggested?.value);
      if (isHsCorrect) hsCorrect += 1;
      calibration.push({ confidence: extractedItem.hs_code_suggested?.confidence ?? 0, correct: isHsCorrect });
    }

    for (const field of ["quantity", "unit_price", "total_value"] as const) {
      total += 1;
      const got = extractedItem[field]?.value;
      const expected = expectedItem[field]?.value;
      const isCorrect = Math.abs(Number(got) - Number(expected)) < 0.01;
      calibration.push({ confidence: extractedItem[field]?.confidence ?? 0, correct: isCorrect });
      if (isCorrect) {
        correct += 1;
      } else {
        errors.push({
          field: `items[${expectedItem.line_number}].${field}`,
          expected: String(expected),
          got: String(got),
          confidence: extractedItem[field]?.confidence ?? 0,
        });
      }
    }
  }

  const ece =
    calibration.length === 0
      ? 0
      : calibration.reduce((sum, item) => sum + Math.abs(item.confidence - (item.correct ? 1 : 0)), 0) /
        calibration.length;

  return {
    model_id: modelId,
    test_case_id: testCaseId,
    field_accuracy: total > 0 ? correct / total : 0,
    hs_accuracy: hsTotal > 0 ? hsCorrect / hsTotal : 0,
    confidence_calibration: ece,
    errors,
  };
}
