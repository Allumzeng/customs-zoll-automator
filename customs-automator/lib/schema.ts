export interface FieldValue<T = string> {
  value: T | null;
  confidence: number;
  source_page: number | null;
  source_text: string | null;
  flagged: boolean;
}

export interface Party {
  name: string;
  address: string;
  country: string;
  eori?: string;
  tax_id?: string;
}

export interface LineItem {
  line_number: number;
  description: FieldValue<string>;
  hs_code_suggested: FieldValue<string>;
  hs_code_confidence: number;
  hs_code_reasoning: string;
  quantity: FieldValue<number>;
  unit: FieldValue<string>;
  unit_price: FieldValue<number>;
  total_value: FieldValue<number>;
  currency: FieldValue<string>;
  country_of_origin: FieldValue<string>;
  weight_net_kg: FieldValue<number>;
  weight_gross_kg: FieldValue<number>;
  warennummer?: FieldValue<string>;
  ursprungsland?: FieldValue<string>;
  package_count?: FieldValue<number>;
}

export interface CustomsExtraction {
  id: string;
  model_id: string;
  created_at: string;
  status: "pending" | "extracted" | "reviewing" | "approved" | "exported";
  language_detected: "zh" | "en" | "de" | "mixed";
  document_types: string[];
  invoice_number: FieldValue;
  invoice_date: FieldValue;
  exporter: FieldValue<Party>;
  importer: FieldValue<Party>;
  incoterms: FieldValue;
  currency: FieldValue;
  total_invoice_value: FieldValue<number>;
  country_of_origin: FieldValue;
  country_of_destination: FieldValue;
  transport_mode: FieldValue;
  gross_weight_kg: FieldValue<number>;
  net_weight_kg: FieldValue<number>;
  package_count: FieldValue<number>;
  package_type: FieldValue;
  marks_and_numbers: FieldValue;
  items: LineItem[];
  overall_confidence: number;
  fields_extracted: number;
  fields_missing: number;
  fields_low_confidence: number;
  requires_review: boolean;
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
  extraction_prompt: string;
  version: number;
  accuracy_metrics: {
    test_runs: number;
    avg_field_accuracy: number;
    avg_hs_accuracy: number;
    avg_confidence_calibration: number;
    last_evaluated_at?: string;
  };
}

export interface EvalCase {
  id: string;
  model_id: string;
  document_paths: string[];
  ground_truth: CustomsExtraction;
  last_run_at?: string;
  last_field_accuracy?: number;
  created_at: string;
}

export interface AuditEntry {
  extraction_id?: string;
  model_id?: string;
  action: "extracted" | "field_edited" | "approved" | "exported" | "model_created" | "evaluated";
  actor?: string;
  field_path?: string;
  old_value?: unknown;
  new_value?: unknown;
}
