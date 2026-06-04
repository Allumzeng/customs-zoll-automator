create extension if not exists pgcrypto;

create table if not exists models (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  label             text,
  description       text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  document_types    text[],
  languages         text[],
  extraction_prompt text not null,
  version           int default 1,
  accuracy_metrics  jsonb default '{}',
  is_active         boolean default true
);

create table if not exists extractions (
  id                 uuid primary key default gen_random_uuid(),
  model_id           uuid references models(id),
  status             text default 'pending',
  language_detected  text,
  document_types     text[],
  raw_extraction     jsonb,
  human_corrections  jsonb default '{}',
  overall_confidence float,
  requires_review    boolean default true,
  reviewed_by        text,
  reviewed_at        timestamptz,
  approved_at        timestamptz,
  created_at         timestamptz default now()
);

create table if not exists source_documents (
  id            uuid primary key default gen_random_uuid(),
  extraction_id uuid references extractions(id),
  file_name     text,
  storage_path  text,
  document_type text,
  page_count    int,
  created_at    timestamptz default now()
);

create table if not exists audit_log (
  id            bigserial primary key,
  extraction_id uuid references extractions(id),
  model_id      uuid references models(id),
  action        text not null,
  actor         text,
  field_path    text,
  old_value     jsonb,
  new_value     jsonb,
  created_at    timestamptz default now()
);

create table if not exists eval_cases (
  id                  uuid primary key default gen_random_uuid(),
  model_id            uuid references models(id),
  document_paths      text[],
  ground_truth        jsonb not null,
  last_run_at         timestamptz,
  last_field_accuracy float,
  created_at          timestamptz default now()
);

alter table models enable row level security;
alter table extractions enable row level security;
alter table source_documents enable row level security;
alter table audit_log enable row level security;
alter table eval_cases enable row level security;

insert into models (
  id,
  name,
  label,
  description,
  document_types,
  languages,
  extraction_prompt,
  accuracy_metrics
) values (
  '00000000-0000-4000-8000-000000000001',
  'default-customs',
  'Default Customs Extractor',
  'Tri-lingual ZH/EN/DE extraction for invoices, packing lists, CMR, AWB, B/L, and Zollanmeldung.',
  array['invoice', 'packing_list', 'cmr', 'awb', 'bl', 'zollanmeldung'],
  array['zh', 'en', 'de'],
  'Use the application EXTRACTION_SYSTEM_PROMPT from lib/claude.ts. Replace this row with the full prompt when deploying Supabase.',
  '{"test_runs":0,"avg_field_accuracy":0,"avg_hs_accuracy":0,"avg_confidence_calibration":0}'::jsonb
) on conflict (id) do nothing;
