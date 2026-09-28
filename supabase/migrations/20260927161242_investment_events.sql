create table public.account_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text,
 role text not null default 'member' check (role in ('master','member')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.account_profiles enable row level security;
create policy profiles_read_self on public.account_profiles for select to authenticated using ((select auth.uid())=id);
create policy profiles_update_self on public.account_profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
revoke all on public.account_profiles from anon;
grant select on public.account_profiles to authenticated;
grant update(display_name) on public.account_profiles to authenticated;

alter table public.corporate_events add column quantity numeric(24,8);
alter table public.corporate_events add column metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object');

create table public.cash_events (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id text not null,
 asset text not null,
 event_date date not null,
 kind text not null check(kind in ('dividend','jcp','income','interest','amortization','other')),
 quantity numeric(24,8),
 gross_cents bigint not null check(gross_cents>=0),
 tax_cents bigint not null default 0 check(tax_cents>=0),
 net_cents bigint not null check(net_cents>=0),
 source_name text not null,
 source_hash text,
 source_page integer,
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
 created_at timestamptz not null default now(),
 primary key(owner_id,id)
);
create index cash_events_owner_asset_date on public.cash_events(owner_id,asset,event_date);
alter table public.cash_events enable row level security;
create policy cash_events_owner on public.cash_events for all to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
revoke all on public.cash_events from anon;
grant select,insert,update,delete on public.cash_events to authenticated;

create table public.custody_events (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id text not null,
 asset text not null,
 event_date date not null,
 kind text not null check(kind in ('deposit','withdrawal','subscription_right','subscription_exercise','rename','bonus','transfer','other')),
 quantity numeric(24,8),
 amount_cents bigint,
 source_name text not null,
 source_hash text,
 source_page integer,
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
 created_at timestamptz not null default now(),
 primary key(owner_id,id)
);
create index custody_events_owner_asset_date on public.custody_events(owner_id,asset,event_date);
alter table public.custody_events enable row level security;
create policy custody_events_owner on public.custody_events for all to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
revoke all on public.custody_events from anon;
grant select,insert,update,delete on public.custody_events to authenticated;

create index import_batches_claimed_by on private.import_batches(claimed_by);
revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
