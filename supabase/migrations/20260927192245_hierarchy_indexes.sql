create index families_created_by on public.families(created_by);
create index managed_invitations_family on public.managed_invitations(family_id);
create index managed_invitations_organization on public.managed_invitations(organization_id);
create index managed_invitations_supervisor on public.managed_invitations(supervisor_id);
create policy import_batches_deny_all on private.import_batches for all to authenticated using (false) with check (false);
