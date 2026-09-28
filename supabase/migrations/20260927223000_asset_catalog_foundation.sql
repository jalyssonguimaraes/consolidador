create table if not exists public.asset_taxonomy_nodes (
 id uuid primary key default gen_random_uuid(), parent_id uuid references public.asset_taxonomy_nodes(id),
 code text not null unique, name text not null, level text not null,
 jurisdiction text, description text, sort_order integer not null default 0,
 active boolean not null default true, created_at timestamptz not null default now()
);
create index if not exists asset_taxonomy_parent on public.asset_taxonomy_nodes(parent_id,sort_order);

create table if not exists public.issuers (
 id uuid primary key default gen_random_uuid(), legal_name text not null, display_name text not null,
 issuer_type text not null, jurisdiction text not null, document_number text,
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 unique(jurisdiction,document_number)
);

create table if not exists public.assets (
 id uuid primary key default gen_random_uuid(), canonical_code text not null unique,
 display_name text not null, jurisdiction text not null, currency char(3) not null,
 taxonomy_leaf_id uuid references public.asset_taxonomy_nodes(id), issuer_id uuid references public.issuers(id),
 status text not null default 'active' check(status in ('active','matured','delisted','inactive')),
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists assets_taxonomy on public.assets(taxonomy_leaf_id);
create index if not exists assets_issuer on public.assets(issuer_id);

create table if not exists public.asset_identifiers (
 id uuid primary key default gen_random_uuid(), asset_id uuid not null references public.assets(id) on delete cascade,
 scheme text not null, value text not null, provider text, valid_from date, valid_to date,
 unique(scheme,value,provider)
);
create index if not exists asset_identifiers_asset on public.asset_identifiers(asset_id);

create table if not exists public.asset_terms (
 asset_id uuid primary key references public.assets(id) on delete cascade,
 maturity_date date, indexer text, indexer_percentage numeric, spread_rate numeric,
 coupon_rate numeric, coupon_frequency text, guarantee_type text, seniority text,
 liquidity_terms jsonb not null default '{}'::jsonb, tax_terms jsonb not null default '{}'::jsonb,
 attributes jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);

alter table public.asset_taxonomy_nodes enable row level security;
alter table public.issuers enable row level security;
alter table public.assets enable row level security;
alter table public.asset_identifiers enable row level security;
alter table public.asset_terms enable row level security;
create policy asset_taxonomy_read on public.asset_taxonomy_nodes for select to authenticated using(true);
create policy issuers_read on public.issuers for select to authenticated using(true);
create policy assets_read on public.assets for select to authenticated using(true);
create policy asset_identifiers_read on public.asset_identifiers for select to authenticated using(true);
create policy asset_terms_read on public.asset_terms for select to authenticated using(true);
grant select on public.asset_taxonomy_nodes,public.issuers,public.assets,public.asset_identifiers,public.asset_terms to authenticated;
