create index system_subscriptions_updated_by on public.system_subscriptions(updated_by);
create index role_permissions_updated_by on public.role_permissions(updated_by);

drop policy if exists profiles_read_self on public.account_profiles;

drop policy if exists family_members_supervisor_write on public.family_members;
create policy family_members_hierarchy_insert on public.family_members for insert to authenticated
with check ((select private.can_access_family(family_id)) and (select private.current_profile_role()) in ('master','admin','consultor'));
create policy family_members_hierarchy_update on public.family_members for update to authenticated
using ((select private.can_access_family(family_id)) and (select private.current_profile_role()) in ('master','admin','consultor'))
with check ((select private.can_access_family(family_id)) and (select private.current_profile_role()) in ('master','admin','consultor'));
create policy family_members_hierarchy_delete on public.family_members for delete to authenticated
using ((select private.can_access_family(family_id)) and (select private.current_profile_role()) in ('master','admin','consultor'));

drop policy if exists subscriptions_master_all on public.system_subscriptions;
drop policy if exists subscriptions_subject_read on public.system_subscriptions;
create policy subscriptions_hierarchy_read on public.system_subscriptions for select to authenticated using (
  (select private.current_profile_role()) = 'master'
  or subject_id = (select auth.uid())
  or (subject_type = 'organization' and exists (
    select 1 from public.organization_members om
    where om.organization_id = subject_id and om.profile_id = (select auth.uid())
  ))
  or (subject_type = 'familia' and (select private.can_access_family(subject_id)))
);
create policy subscriptions_master_insert on public.system_subscriptions for insert to authenticated
with check ((select private.current_profile_role()) = 'master' and updated_by = (select auth.uid()));
create policy subscriptions_master_update on public.system_subscriptions for update to authenticated
using ((select private.current_profile_role()) = 'master')
with check ((select private.current_profile_role()) = 'master' and updated_by = (select auth.uid()));
create policy subscriptions_master_delete on public.system_subscriptions for delete to authenticated
using ((select private.current_profile_role()) = 'master');

drop policy if exists role_permissions_master_write on public.role_permissions;
create policy role_permissions_master_insert on public.role_permissions for insert to authenticated
with check ((select private.current_profile_role()) = 'master' and updated_by = (select auth.uid()));
create policy role_permissions_master_update on public.role_permissions for update to authenticated
using ((select private.current_profile_role()) = 'master')
with check ((select private.current_profile_role()) = 'master' and updated_by = (select auth.uid()));
create policy role_permissions_master_delete on public.role_permissions for delete to authenticated
using ((select private.current_profile_role()) = 'master');
