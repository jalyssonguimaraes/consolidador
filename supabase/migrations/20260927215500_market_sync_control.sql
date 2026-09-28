alter table public.market_series
 add column if not exists last_attempt_at timestamptz,
 add column if not exists last_success_at timestamptz,
 add column if not exists next_refresh_at timestamptz,
 add column if not exists last_http_status integer;

create table if not exists public.market_sync_runs (
 id bigint generated always as identity primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 series_id uuid references public.market_series(id) on delete set null,
 provider text not null,
 symbol text not null,
 status text not null check(status in ('success','failed','skipped')),
 http_status integer,
 message text,
 points_received integer not null default 0,
 created_at timestamptz not null default now()
);
create index if not exists market_sync_runs_owner_created on public.market_sync_runs(owner_id,created_at desc);
alter table public.market_sync_runs enable row level security;
create policy market_sync_runs_owner on public.market_sync_runs for select to authenticated using(owner_id=(select auth.uid()));
create policy market_sync_runs_insert on public.market_sync_runs for insert to authenticated with check(owner_id=(select auth.uid()));
grant select,insert on public.market_sync_runs to authenticated;
