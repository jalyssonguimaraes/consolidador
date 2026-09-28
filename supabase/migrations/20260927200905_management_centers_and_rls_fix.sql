-- Break circular RLS evaluation and add the operational controls used by the
-- Master, Organization and Consultant centers.
create or replace function private.can_access_family(target_family_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (
    private.current_profile_role() = 'master'
    or exists (
      select 1 from public.families f
      where f.id = target_family_id and f.supervisor_id = auth.uid()
    )
    or exists (
      select 1 from public.family_members fm
      where fm.family_id = target_family_id and fm.profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.families f
      join public.organization_members om on om.organization_id = f.organization_id
      where f.id = target_family_id and om.profile_id = auth.uid() and om.role = 'admin'
    )
  )
$$;

create or replace function private.can_read_profile(target_profile_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (
    auth.uid() = target_profile_id
    or private.current_profile_role() = 'master'
    or exists (
      select 1
      from public.organization_members viewer
      join public.organization_members target
        on target.organization_id = viewer.organization_id
      where viewer.profile_id = auth.uid()
        and viewer.role = 'admin'
        and target.profile_id = target_profile_id
    )
    or exists (
      select 1 from public.families f
      join public.family_members fm on fm.family_id = f.id
      where f.supervisor_id = auth.uid() and fm.profile_id = target_profile_id
    )
  )
$$;

revoke all on function private.can_access_family(uuid), private.can_read_profile(uuid) from public, anon;
grant execute on function private.can_access_family(uuid), private.can_read_profile(uuid) to authenticated;

drop policy if exists families_hierarchy_read on public.families;
create policy families_hierarchy_read on public.families for select to authenticated
using ((select private.can_access_family(id)));

drop policy if exists family_members_hierarchy_read on public.family_members;
create policy family_members_hierarchy_read on public.family_members for select to authenticated
using ((select private.can_access_family(family_id)));

drop policy if exists family_members_supervisor_write on public.family_members;
create policy family_members_supervisor_write on public.family_members for all to authenticated
using ((select private.can_access_family(family_id)) and private.current_profile_role() in ('master','admin','consultor'))
with check ((select private.can_access_family(family_id)) and private.current_profile_role() in ('master','admin','consultor'));

create policy profiles_hierarchy_read on public.account_profiles for select to authenticated
using ((select private.can_read_profile(id)));

create table public.system_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('organization','admin','consultor','familia')),
  subject_id uuid not null,
  plan_name text not null default 'Gestão',
  status text not null default 'active' check (status in ('active','inactive')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.account_profiles(id),
  unique(subject_type, subject_id)
);
create index system_subscriptions_subject on public.system_subscriptions(subject_type, subject_id);
alter table public.system_subscriptions enable row level security;
create policy subscriptions_master_all on public.system_subscriptions for all to authenticated
using (private.current_profile_role() = 'master')
with check (private.current_profile_role() = 'master' and updated_by = auth.uid());
create policy subscriptions_subject_read on public.system_subscriptions for select to authenticated
using (
  subject_id = auth.uid()
  or (subject_type = 'organization' and exists (
    select 1 from public.organization_members om
    where om.organization_id = subject_id and om.profile_id = auth.uid()
  ))
  or (subject_type = 'familia' and (select private.can_access_family(subject_id)))
);
revoke all on public.system_subscriptions from anon;
grant select, insert, update on public.system_subscriptions to authenticated;

create table public.role_permissions (
  role text not null check (role in ('master','admin','consultor','familia')),
  permission text not null check (permission in ('manage_organizations','manage_users','manage_subscriptions','manage_families','view_portfolios','edit_portfolios')),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.account_profiles(id),
  primary key(role, permission)
);
alter table public.role_permissions enable row level security;
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);
create policy role_permissions_master_write on public.role_permissions for all to authenticated
using (private.current_profile_role() = 'master')
with check (private.current_profile_role() = 'master' and updated_by = auth.uid());
revoke all on public.role_permissions from anon;
grant select, insert, update on public.role_permissions to authenticated;

insert into public.role_permissions(role, permission, enabled, updated_by)
select r.role, p.permission,
  case
    when r.role = 'master' then true
    when r.role = 'admin' and p.permission in ('manage_users','manage_families','view_portfolios') then true
    when r.role = 'consultor' and p.permission in ('manage_families','view_portfolios','edit_portfolios') then true
    when r.role = 'familia' and p.permission in ('view_portfolios','edit_portfolios') then true
    else false
  end,
  'f42bf568-35b8-4e64-bd96-17ee675d666c'::uuid
from (values ('master'),('admin'),('consultor'),('familia')) r(role)
cross join (values ('manage_organizations'),('manage_users'),('manage_subscriptions'),('manage_families'),('view_portfolios'),('edit_portfolios')) p(permission)
on conflict(role, permission) do update set enabled = excluded.enabled, updated_at = now(), updated_by = excluded.updated_by;

insert into public.system_subscriptions(subject_type, subject_id, plan_name, status, updated_by)
select 'organization', o.id, 'Organização', 'active', o.owner_master_id from public.organizations o
on conflict(subject_type, subject_id) do nothing;
insert into public.system_subscriptions(subject_type, subject_id, plan_name, status, updated_by) values
('admin','08a9d583-4c23-4ddd-a5fb-aa1f485b54f2','Administrador','active','f42bf568-35b8-4e64-bd96-17ee675d666c'),
('consultor','96a63c5a-f6e3-417b-8afd-65716ff5faa1','Consultor','active','f42bf568-35b8-4e64-bd96-17ee675d666c')
on conflict(subject_type, subject_id) do nothing;
insert into public.system_subscriptions(subject_type, subject_id, plan_name, status, updated_by)
select 'familia', f.id, 'Família', 'active', 'f42bf568-35b8-4e64-bd96-17ee675d666c'::uuid from public.families f
on conflict(subject_type, subject_id) do nothing;
