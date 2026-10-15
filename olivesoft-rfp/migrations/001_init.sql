create extension if not exists "pgcrypto";

create type tender_status as enum (
  'detected',
  'incomplete',
  'rejected',
  'researching',
  'proposal_ready',
  'validated',
  'sent'
);

create table tenders (
  id              uuid primary key default gen_random_uuid(),
  reference       text,
  title           text not null,
  raw_description text not null,
  sector          text,
  deadline        date,
  source_url      text,
  status          tender_status not null default 'detected',
  raw_payload     jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_tenders_status on tenders (status);

create table prospects (
  id                uuid primary key default gen_random_uuid(),
  tender_id         uuid not null references tenders(id) on delete cascade,
  sector            text,
  estimated_revenue numeric,
  key_partners      jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);

create index idx_prospects_tender_id on prospects (tender_id);