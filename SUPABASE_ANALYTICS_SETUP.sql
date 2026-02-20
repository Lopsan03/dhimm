-- Page visits analytics table for DHIMM admin dashboard
-- Run this in Supabase SQL Editor

create table if not exists public.page_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  path text not null default '/',
  visit_date date not null,
  created_at timestamptz not null default now()
);

create unique index if not exists page_visits_visitor_day_unique
  on public.page_visits (visitor_id, visit_date);

create index if not exists page_visits_visit_date_idx
  on public.page_visits (visit_date desc);

create index if not exists page_visits_created_at_idx
  on public.page_visits (created_at desc);
