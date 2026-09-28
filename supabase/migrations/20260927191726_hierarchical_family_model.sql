create sequence private.organization_code_seq start 1;
create sequence private.family_entity_code_seq start 1;
revoke all on sequence private.organization_code_seq,private.family_entity_code_seq from public,anon,authenticated;

create function private.current_profile_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.account_profiles where id=auth.uid()
$$;
revoke all on function private.current_profile_role() from public,anon;
grant execute on function private.current_profile_role() to authenticated;

create table public.organizations (
 id uuid primary key default gen_random_uuid(), code text not null unique default ('OR'||lpad(nextval('private.organization_code_seq')::text,7,'0')),
 name text not null, kind text not null check(kind in ('empresa','consultoria')),
 owner_master_id uuid not null references public.account_profiles(id), created_at timestamptz not null default now(),
 check(code ~ '^OR[0-9]{7}$')
);
create table public.organization_members (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 profile_id uuid not null references public.account_profiles(id) on delete cascade,
 role text not null check(role in ('admin','consultor')), created_at timestamptz not null default now(),
 primary key(organization_id,profile_id)
);
create table public.families (
 id uuid primary key default gen_random_uuid(), code text not null unique default ('FA'||lpad(nextval('private.family_entity_code_seq')::text,7,'0')),
 name text not null, organization_id uuid references public.organizations(id) on delete set null,
 supervisor_id uuid not null references public.account_profiles(id), created_by uuid not null references public.account_profiles(id),
 created_at timestamptz not null default now(), check(code ~ '^FA[0-9]{7}$')
);
create table public.family_members (
 family_id uuid not null references public.families(id) on delete cascade,
 profile_id uuid not null references public.account_profiles(id) on delete cascade,
 family_role text not null check(family_role in ('titular','dependente')),
 relationship text, created_at timestamptz not null default now(), primary key(family_id,profile_id)
);
create table public.managed_invitations (
 id uuid primary key default gen_random_uuid(), email text not null, role text not null check(role in ('admin','consultor','familia')),
 display_name text not null, organization_id uuid references public.organizations(id) on delete cascade,
 family_id uuid references public.families(id) on delete cascade, supervisor_id uuid references public.account_profiles(id),
 family_role text check(family_role in ('titular','dependente')), created_by uuid not null references public.account_profiles(id),
 status text not null default 'pending' check(status in ('pending','accepted','cancelled')), created_at timestamptz not null default now(),
 unique(email,status)
);
create index organizations_owner on public.organizations(owner_master_id);
create index organization_members_profile on public.organization_members(profile_id);
create index families_supervisor on public.families(supervisor_id);
create index families_organization on public.families(organization_id);
create index family_members_profile on public.family_members(profile_id);
create index managed_invitations_creator on public.managed_invitations(created_by,status);

alter table public.organizations enable row level security;alter table public.organization_members enable row level security;
alter table public.families enable row level security;alter table public.family_members enable row level security;alter table public.managed_invitations enable row level security;
create policy organizations_master_all on public.organizations for all to authenticated using (private.current_profile_role()='master') with check (private.current_profile_role()='master' and owner_master_id=(select auth.uid()));
create policy organizations_member_read on public.organizations for select to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=id and m.profile_id=(select auth.uid())));
create policy organization_members_master_all on public.organization_members for all to authenticated using (private.current_profile_role()='master') with check (private.current_profile_role()='master');
create policy organization_members_self_read on public.organization_members for select to authenticated using (profile_id=(select auth.uid()));
create policy families_hierarchy_read on public.families for select to authenticated using (private.current_profile_role()='master' or supervisor_id=(select auth.uid()) or exists(select 1 from public.family_members fm where fm.family_id=id and fm.profile_id=(select auth.uid())));
create policy families_hierarchy_insert on public.families for insert to authenticated with check (private.current_profile_role() in ('master','admin','consultor') and created_by=(select auth.uid()) and supervisor_id=(select auth.uid()));
create policy families_supervisor_update on public.families for update to authenticated using (private.current_profile_role()='master' or supervisor_id=(select auth.uid())) with check (private.current_profile_role()='master' or supervisor_id=(select auth.uid()));
create policy family_members_hierarchy_read on public.family_members for select to authenticated using (profile_id=(select auth.uid()) or exists(select 1 from public.families f where f.id=family_id and (f.supervisor_id=(select auth.uid()) or private.current_profile_role()='master')));
create policy family_members_supervisor_write on public.family_members for all to authenticated using (exists(select 1 from public.families f where f.id=family_id and (f.supervisor_id=(select auth.uid()) or private.current_profile_role()='master'))) with check (exists(select 1 from public.families f where f.id=family_id and (f.supervisor_id=(select auth.uid()) or private.current_profile_role()='master')));
create policy invitations_creator_all on public.managed_invitations for all to authenticated using (created_by=(select auth.uid()) or private.current_profile_role()='master') with check (created_by=(select auth.uid()) and private.current_profile_role() in ('master','admin','consultor'));
revoke all on public.organizations,public.organization_members,public.families,public.family_members,public.managed_invitations from anon;
grant select,insert,update,delete on public.organizations,public.organization_members,public.families,public.family_members,public.managed_invitations to authenticated;

drop table public.family_consultants;
