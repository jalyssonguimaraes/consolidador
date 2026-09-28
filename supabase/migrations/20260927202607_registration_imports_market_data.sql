alter table public.account_profiles add column access_status text not null default 'active' check(access_status in ('active','inactive','invited'));
alter table public.organizations add column status text not null default 'active' check(status in ('active','inactive'));
alter table public.families add column status text not null default 'active' check(status in ('active','inactive'));

create table public.document_import_batches (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 family_id uuid references public.families(id) on delete set null,
 file_name text not null,
 file_sha256 text not null check(file_sha256 ~ '^[a-f0-9]{64}$'),
 source_type text not null check(source_type in ('json','xlsx','pdf','b3','broker')),
 status text not null default 'processing' check(status in ('processing','completed','partial','failed')),
 total_documents integer not null default 0 check(total_documents>=0),
 inserted_documents integer not null default 0 check(inserted_documents>=0),
 duplicate_documents integer not null default 0 check(duplicate_documents>=0),
 rejected_documents integer not null default 0 check(rejected_documents>=0),
 error_summary jsonb not null default '[]'::jsonb check(jsonb_typeof(error_summary)='array'),
 created_by uuid not null references public.account_profiles(id),
 created_at timestamptz not null default now(), completed_at timestamptz,
 unique(owner_id,file_sha256)
);
create index document_import_batches_owner_created on public.document_import_batches(owner_id,created_at desc);
create index document_import_batches_family on public.document_import_batches(family_id);
create index document_import_batches_created_by on public.document_import_batches(created_by);

create table public.document_import_items (
 id uuid primary key default gen_random_uuid(),
 batch_id uuid not null references public.document_import_batches(id) on delete cascade,
 source_reference text not null,
 status text not null check(status in ('imported','duplicate','rejected')),
 portfolio_note_id text,
 errors jsonb not null default '[]'::jsonb check(jsonb_typeof(errors)='array'),
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 created_at timestamptz not null default now(),
 unique(batch_id,source_reference)
);
create index document_import_items_batch_status on public.document_import_items(batch_id,status);
alter table public.portfolio_notes add column import_batch_id uuid references public.document_import_batches(id) on delete set null;
create index portfolio_notes_import_batch on public.portfolio_notes(import_batch_id);

alter table public.document_import_batches enable row level security;
alter table public.document_import_items enable row level security;
create policy import_batches_owner on public.document_import_batches for all to authenticated
using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and created_by=(select auth.uid()));

create function private.owns_import_batch(target_batch_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.document_import_batches b where b.id=target_batch_id and b.owner_id=auth.uid())
$$;
revoke all on function private.owns_import_batch(uuid) from public,anon;
grant execute on function private.owns_import_batch(uuid) to authenticated;
create policy import_items_owner on public.document_import_items for all to authenticated
using((select private.owns_import_batch(batch_id))) with check((select private.owns_import_batch(batch_id)));
revoke all on public.document_import_batches,public.document_import_items from anon;
grant select,insert,update on public.document_import_batches to authenticated;
grant select,insert on public.document_import_items to authenticated;

create or replace function public.import_portfolio_notes_v2(documents jsonb,file_name text,file_hash text,source_kind text default 'json')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare batch uuid; doc jsonb; inserted_count integer:=0; duplicate_count integer:=0; changed integer; reference text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if jsonb_typeof(documents)<>'array' or jsonb_array_length(documents)=0 or jsonb_array_length(documents)>2000 then raise exception 'INVALID_DOCUMENT_BATCH'; end if;
 insert into public.document_import_batches(owner_id,file_name,file_sha256,source_type,total_documents,created_by)
 values(auth.uid(),file_name,file_hash,source_kind,jsonb_array_length(documents),auth.uid())
 on conflict(owner_id,file_sha256) do update set file_name=excluded.file_name
 returning id into batch;
 if exists(select 1 from public.document_import_items where batch_id=batch) then
  return jsonb_build_object('batchId',batch,'inserted',0,'duplicates',jsonb_array_length(documents),'status','completed');
 end if;
 for doc in select value from jsonb_array_elements(documents) loop
  reference:=coalesce(doc->>'id',gen_random_uuid()::text);
  insert into public.portfolio_notes(id,owner_id,broker,trade_date,document_number,payload,import_batch_id)
  values(reference,auth.uid(),doc->>'broker',(doc->>'date')::date,doc->>'number',doc,batch)
  on conflict do nothing;
  get diagnostics changed=row_count;
  if changed=1 then inserted_count:=inserted_count+1; else duplicate_count:=duplicate_count+1; end if;
  insert into public.document_import_items(batch_id,source_reference,status,portfolio_note_id,payload)
  values(batch,reference,case when changed=1 then 'imported' else 'duplicate' end,case when changed=1 then reference else null end,doc);
 end loop;
 update public.document_import_batches set status='completed',inserted_documents=inserted_count,duplicate_documents=duplicate_count,completed_at=now() where id=batch;
 return jsonb_build_object('batchId',batch,'inserted',inserted_count,'duplicates',duplicate_count,'status','completed');
end $$;
revoke all on function public.import_portfolio_notes_v2(jsonb,text,text,text) from public,anon;
grant execute on function public.import_portfolio_notes_v2(jsonb,text,text,text) to authenticated;

create table public.market_series (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 provider text not null default 'BRAPI', symbol text not null, name text not null,
 kind text not null check(kind in ('asset','benchmark','macro','treasury')),
 unit text not null check(unit in ('price','index','percent','annual_rate')),
 frequency text not null check(frequency in ('daily','monthly','irregular')),
 available boolean not null default true, status_message text, updated_at timestamptz not null default now(),
 unique(owner_id,provider,symbol,kind)
);
create table public.market_series_points (
 series_id uuid not null references public.market_series(id) on delete cascade,
 point_date date not null, value numeric(24,10) not null, adjusted_value numeric(24,10),
 primary key(series_id,point_date)
);
create index market_series_owner_kind on public.market_series(owner_id,kind);
alter table public.market_series enable row level security;alter table public.market_series_points enable row level security;
create policy market_series_owner on public.market_series for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy market_points_owner on public.market_series_points for all to authenticated
using(exists(select 1 from public.market_series s where s.id=series_id and s.owner_id=(select auth.uid())))
with check(exists(select 1 from public.market_series s where s.id=series_id and s.owner_id=(select auth.uid())));
revoke all on public.market_series,public.market_series_points from anon;
grant select,insert,update,delete on public.market_series,public.market_series_points to authenticated;
