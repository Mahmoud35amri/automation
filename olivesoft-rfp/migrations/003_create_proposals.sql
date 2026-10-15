create type proposal_status as enum (
  'draft',
  'validated',
  'rejected',
  'sent'
);

create table proposals (
  id           uuid primary key default gen_random_uuid(),
  tender_id    uuid not null references tenders(id) on delete cascade,
  prospect_id  uuid references prospects(id) on delete set null,
  content      text not null,
  status       proposal_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_proposals_tender_id on proposals (tender_id);