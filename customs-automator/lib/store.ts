import { applyExtractionMetrics, emptyField } from "./confidence";
import { EXTRACTION_SYSTEM_PROMPT } from "./prompts";
import { createClient, hasSupabaseConfig } from "./supabase";
import type { AuditEntry, CustomsExtraction, Model } from "./schema";

type ExtractionRow = {
  id: string;
  model_id: string;
  status: CustomsExtraction["status"];
  language_detected: string;
  document_types: string[];
  raw_extraction: CustomsExtraction;
  human_corrections: Record<string, unknown>;
  overall_confidence: number;
  requires_review: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  approved_at?: string;
  created_at: string;
};

const now = () => new Date().toISOString();
export const DEFAULT_MODEL_ID = "00000000-0000-4000-8000-000000000001";

const defaultModel: Model = {
  id: DEFAULT_MODEL_ID,
  name: "default-customs",
  label: "Default Customs Extractor",
  description: "Tri-lingual ZH/EN/DE extraction for invoices, packing lists, CMR, AWB, B/L, and Zollanmeldung.",
  created_at: now(),
  updated_at: now(),
  document_types: ["invoice", "packing_list", "cmr", "awb", "bl", "zollanmeldung"],
  languages: ["zh", "en", "de"],
  extraction_prompt: EXTRACTION_SYSTEM_PROMPT,
  version: 1,
  accuracy_metrics: {
    test_runs: 0,
    avg_field_accuracy: 0,
    avg_hs_accuracy: 0,
    avg_confidence_calibration: 0,
  },
};

declare global {
  var customsAutomatorStore:
    | {
        models: Map<string, Model>;
        extractions: Map<string, ExtractionRow>;
        audit: AuditEntry[];
      }
    | undefined;
}

function localStore() {
  if (!globalThis.customsAutomatorStore) {
    globalThis.customsAutomatorStore = {
      models: new Map([[defaultModel.id, defaultModel]]),
      extractions: new Map(),
      audit: [],
    };
  }
  return globalThis.customsAutomatorStore;
}

export function isUsingSupabase() {
  return hasSupabaseConfig();
}

export async function listModels(): Promise<Model[]> {
  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("models")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });
    if (!error && data) return data as Model[];
  }
  return Array.from(localStore().models.values()).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getModel(id?: string | null): Promise<Model> {
  const modelId = !id || id === "default-customs-model" ? defaultModel.id : id;
  const supabase = createClient();
  if (supabase) {
    const { data } = await supabase.from("models").select("*").eq("id", modelId).single();
    if (data) return data as Model;
  }
  return localStore().models.get(modelId) || defaultModel;
}

export async function saveModel(input: Partial<Model> & Pick<Model, "name" | "label">): Promise<Model> {
  const model: Model = {
    id: input.id || crypto.randomUUID(),
    name: input.name,
    label: input.label,
    description: input.description || "",
    created_at: input.created_at || now(),
    updated_at: now(),
    document_types: input.document_types?.length ? input.document_types : defaultModel.document_types,
    languages: input.languages?.length ? input.languages : defaultModel.languages,
    extraction_prompt: input.extraction_prompt || EXTRACTION_SYSTEM_PROMPT,
    version: input.version || 1,
    accuracy_metrics: input.accuracy_metrics || {
      test_runs: 0,
      avg_field_accuracy: 0,
      avg_hs_accuracy: 0,
      avg_confidence_calibration: 0,
    },
  };

  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase.from("models").upsert(model).select("*").single();
    if (!error && data) return data as Model;
  }

  localStore().models.set(model.id, model);
  localStore().audit.push({ model_id: model.id, action: "model_created", actor: "system" });
  return model;
}

export async function saveExtraction(extraction: CustomsExtraction): Promise<CustomsExtraction> {
  const normalized = applyExtractionMetrics(extraction);
  const row: ExtractionRow = {
    id: normalized.id,
    model_id: normalized.model_id,
    status: normalized.status,
    language_detected: normalized.language_detected,
    document_types: normalized.document_types,
    raw_extraction: normalized,
    human_corrections: normalized.human_corrections,
    overall_confidence: normalized.overall_confidence,
    requires_review: normalized.requires_review,
    reviewed_by: normalized.reviewed_by,
    reviewed_at: normalized.reviewed_at,
    approved_at: normalized.approved_at,
    created_at: normalized.created_at,
  };

  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("extractions")
      .upsert(row)
      .select("raw_extraction")
      .single();
    if (!error && data?.raw_extraction) return data.raw_extraction as CustomsExtraction;
  }

  localStore().extractions.set(normalized.id, row);
  return normalized;
}

export async function listExtractions(limit = 8): Promise<CustomsExtraction[]> {
  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("extractions")
      .select("raw_extraction")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error && data) return data.map((row) => row.raw_extraction as CustomsExtraction);
  }
  return Array.from(localStore().extractions.values())
    .map((row) => row.raw_extraction)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export async function getExtraction(id: string): Promise<CustomsExtraction | null> {
  const supabase = createClient();
  if (supabase) {
    const { data } = await supabase.from("extractions").select("raw_extraction").eq("id", id).single();
    if (data?.raw_extraction) return data.raw_extraction as CustomsExtraction;
  }
  return localStore().extractions.get(id)?.raw_extraction || null;
}

export async function approveExtraction(
  id: string,
  extraction: CustomsExtraction,
  actor = "reviewer"
): Promise<CustomsExtraction> {
  const approved = applyExtractionMetrics({
    ...extraction,
    id,
    status: "approved",
    requires_review: false,
    reviewed_by: actor,
    reviewed_at: now(),
    approved_at: now(),
  });
  await saveExtraction(approved);
  await addAudit({ extraction_id: id, model_id: approved.model_id, action: "approved", actor });
  return approved;
}

export async function addAudit(entry: AuditEntry) {
  const supabase = createClient();
  if (supabase) {
    await supabase.from("audit_log").insert(entry);
    return;
  }
  localStore().audit.push(entry);
}

export function demoExtraction(modelId = defaultModel.id, fileNames: string[] = []): CustomsExtraction {
  const source = fileNames.length ? fileNames.join(", ") : "Demo invoice and packing list";
  return applyExtractionMetrics({
    id: crypto.randomUUID(),
    model_id: modelId,
    created_at: now(),
    status: "extracted",
    language_detected: "mixed",
    document_types: ["invoice", "packing_list"],
    invoice_number: { ...emptyField("DEMO-INV-1001"), confidence: 0.86, source_text: source, flagged: false },
    invoice_date: { ...emptyField("2026-06-04"), confidence: 0.82, source_text: source, flagged: false },
    exporter: {
      value: { name: "Shenzhen Sample Export Co., Ltd.", address: "Nanshan District, Shenzhen", country: "CN" },
      confidence: 0.72,
      source_page: 1,
      source_text: source,
      flagged: false,
    },
    importer: {
      value: { name: "Muster Import GmbH", address: "Hamburg, Germany", country: "DE", eori: "DE1234567890" },
      confidence: 0.68,
      source_page: 1,
      source_text: "Importer block requires review",
      flagged: true,
    },
    incoterms: { ...emptyField("DAP Hamburg"), confidence: 0.79, source_text: "DAP Hamburg", flagged: false },
    currency: { ...emptyField("EUR"), confidence: 0.95, source_text: "EUR", flagged: false },
    total_invoice_value: { ...emptyField(4250), confidence: 0.91, source_text: "Total EUR 4,250.00", flagged: false },
    country_of_origin: { ...emptyField("CN"), confidence: 0.7, source_text: "Made in China", flagged: false },
    country_of_destination: { ...emptyField("DE"), confidence: 0.75, source_text: "Ship to Germany", flagged: false },
    transport_mode: { ...emptyField("ROAD"), confidence: 0.62, source_text: "CMR attached", flagged: true },
    gross_weight_kg: { ...emptyField(540), confidence: 0.88, source_text: "Gross weight 540 kg", flagged: false },
    net_weight_kg: { ...emptyField(500), confidence: 0.87, source_text: "Net weight 500 kg", flagged: false },
    package_count: { ...emptyField(20), confidence: 0.9, source_text: "20 CTNS", flagged: false },
    package_type: { ...emptyField("cartons"), confidence: 0.84, source_text: "CTNS", flagged: false },
    marks_and_numbers: { ...emptyField("N/M"), confidence: 0.78, source_text: "N/M", flagged: false },
    items: [
      {
        line_number: 1,
        description: { ...emptyField("Portable barcode scanners"), confidence: 0.82, source_text: "Barcode scanner", flagged: false },
        hs_code_suggested: { ...emptyField("8471.90"), confidence: 0.64, source_text: "Barcode scanner", flagged: true },
        hs_code_confidence: 0.64,
        hs_code_reasoning: "Likely automatic data-processing input equipment; classification needs confirmation from product specs.",
        quantity: { ...emptyField(100), confidence: 0.96, source_text: "100 PCS", flagged: false },
        unit: { ...emptyField("pcs"), confidence: 0.96, source_text: "PCS", flagged: false },
        unit_price: { ...emptyField(42.5), confidence: 0.94, source_text: "42.50", flagged: false },
        total_value: { ...emptyField(4250), confidence: 0.94, source_text: "4,250.00", flagged: false },
        currency: { ...emptyField("EUR"), confidence: 0.95, source_text: "EUR", flagged: false },
        country_of_origin: { ...emptyField("CN"), confidence: 0.74, source_text: "Origin CN", flagged: false },
        weight_net_kg: { ...emptyField(500), confidence: 0.8, source_text: "NW 500 kg", flagged: false },
        weight_gross_kg: { ...emptyField(540), confidence: 0.8, source_text: "GW 540 kg", flagged: false },
        package_count: { ...emptyField(20), confidence: 0.9, source_text: "20 CTNS", flagged: false },
      },
    ],
    overall_confidence: 0,
    fields_extracted: 0,
    fields_missing: 0,
    fields_low_confidence: 0,
    requires_review: true,
    human_corrections: {},
  });
}
