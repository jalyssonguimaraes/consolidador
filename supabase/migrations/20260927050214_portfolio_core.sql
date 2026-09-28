-- Private, per-user portfolio storage. No service key is needed by the application.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table public.portfolio_notes (
 id text not null, owner_id uuid not null references auth.users(id),
 broker text not null, trade_date date not null, document_number text not null,
 payload jsonb not null, version integer not null default 1 check(version>0),
 updated_at timestamptz not null default now(),
 primary key(owner_id,id), unique(owner_id,broker,trade_date,document_number),
 check(jsonb_typeof(payload)='object'),
 check(jsonb_typeof(payload->'trades')='array' and jsonb_array_length(payload->'trades') between 1 and 100)
);
create index portfolio_notes_owner_date on public.portfolio_notes(owner_id,trade_date);
create table public.note_revisions (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 note_id text not null, payload jsonb not null, version integer not null, created_at timestamptz not null default now(),
 foreign key(owner_id,note_id) references public.portfolio_notes(owner_id,id)
);
create index note_revisions_owner_note on public.note_revisions(owner_id,note_id,created_at);
create table public.market_cache (
 owner_id uuid not null references auth.users(id), asset text not null, kind text not null check(kind in ('quote','details','benchmark')),
 payload jsonb not null, updated_at timestamptz not null default now(), primary key(owner_id,kind,asset)
);
create table public.corporate_events (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 asset text not null, kind text not null check(kind in ('bonus','split','reverse_split','subscription','transfer','other')),
 event_date date not null, factor numeric(24,10), label text not null, source text, notes text,
 status text not null default 'pending' check(status in ('pending','confirmed')),
 updated_at timestamptz not null default now()
);
create index corporate_events_owner_asset on public.corporate_events(owner_id,asset,event_date);
alter table public.portfolio_notes enable row level security;
alter table public.note_revisions enable row level security;
alter table public.market_cache enable row level security;
alter table public.corporate_events enable row level security;
create policy notes_read on public.portfolio_notes for select to authenticated using ((select auth.uid())=owner_id);
create policy notes_insert on public.portfolio_notes for insert to authenticated with check ((select auth.uid())=owner_id);
create policy notes_update on public.portfolio_notes for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy revisions_read on public.note_revisions for select to authenticated using ((select auth.uid())=owner_id);
create policy cache_owner on public.market_cache for all to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy events_owner on public.corporate_events for all to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
revoke all on public.portfolio_notes,public.note_revisions,public.market_cache,public.corporate_events from anon;
grant select,insert,update on public.portfolio_notes to authenticated;
grant select on public.note_revisions to authenticated;
grant select,insert,update,delete on public.market_cache,public.corporate_events to authenticated;
-- Audit has elevated INSERT rights only within a private trigger. Users cannot rewrite history.
create function private.audit_portfolio_note() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.owner_id<>old.owner_id or new.id<>old.id then raise exception 'IMMUTABLE_OWNER'; end if;
 if new.version<>old.version+1 then raise exception 'VERSION_CONFLICT'; end if;
 insert into public.note_revisions(owner_id,note_id,payload,version) values(old.owner_id,old.id,old.payload,old.version);
 new.payload := (new.payload - 'source' - 'original') || jsonb_strip_nulls(jsonb_build_object('source',old.payload->'source','original',old.payload->'original'));
 new.updated_at:=now();return new;
end $$;
revoke all on function private.audit_portfolio_note() from public,anon,authenticated;
create trigger audit_portfolio_note before update on public.portfolio_notes for each row execute function private.audit_portfolio_note();
create function public.save_portfolio_note(document jsonb,expected_version integer default null) returns integer language plpgsql security invoker set search_path='' as $$
declare next_version integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if expected_version is null then
  insert into public.portfolio_notes(id,owner_id,broker,trade_date,document_number,payload)
   values(document->>'id',auth.uid(),document->>'broker',(document->>'date')::date,document->>'number',document);
  return 1;
 end if;
 update public.portfolio_notes set broker=document->>'broker',trade_date=(document->>'date')::date,document_number=document->>'number',payload=document,version=version+1
 where owner_id=auth.uid() and id=document->>'id' and version=expected_version returning version into next_version;
 if next_version is null then raise exception 'VERSION_CONFLICT'; end if;
 return next_version;
end $$;
create function public.import_portfolio_notes(documents jsonb) returns integer language plpgsql security invoker set search_path='' as $$
declare inserted integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.portfolio_notes(id,owner_id,broker,trade_date,document_number,payload)
 select d->>'id',auth.uid(),d->>'broker',(d->>'date')::date,d->>'number',d from jsonb_array_elements(documents) d on conflict do nothing;
 get diagnostics inserted=row_count;return inserted;
end $$;
revoke all on function public.save_portfolio_note(jsonb,integer),public.import_portfolio_notes(jsonb) from public,anon;
grant execute on function public.save_portfolio_note(jsonb,integer),public.import_portfolio_notes(jsonb) to authenticated;
create view public.portfolio_movements with (security_invoker=true) as
 select n.owner_id,n.id as note_id,n.broker,n.trade_date,n.document_number,
 t.ordinality as line_number,t.value->>'asset' as asset,t.value->>'category' as category,t.value->>'side' as side,
 (t.value->>'quantity')::numeric as quantity,(t.value->>'price')::numeric as price,
 nullif(t.value->>'maturity','')::date as maturity
 from public.portfolio_notes n cross join lateral jsonb_array_elements(n.payload->'trades') with ordinality t(value,ordinality);
grant select on public.portfolio_movements to authenticated;
revoke all on public.portfolio_movements from anon;
-- Preserved source backup, accessible only by the administrator until the account is identified.
create table private.import_batches (id uuid primary key default gen_random_uuid(),source_name text not null,sha256 text not null unique,payload jsonb not null,created_at timestamptz not null default now(),claimed_by uuid references auth.users(id));
alter table private.import_batches enable row level security;
revoke all on private.import_batches from public,anon,authenticated;
