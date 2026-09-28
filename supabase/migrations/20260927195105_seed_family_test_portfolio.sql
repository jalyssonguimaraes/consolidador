insert into public.portfolio_notes(id,owner_id,broker,trade_date,document_number,payload,version,updated_at)
select id,'3e1fa00a-8b0b-48d8-bc29-1243179ad4d3',broker,trade_date,document_number,payload,version,updated_at from public.portfolio_notes where owner_id='f42bf568-35b8-4e64-bd96-17ee675d666c'
on conflict(owner_id,id) do update set payload=excluded.payload,version=excluded.version,updated_at=excluded.updated_at;
insert into public.market_cache(owner_id,asset,kind,payload,updated_at)
select '3e1fa00a-8b0b-48d8-bc29-1243179ad4d3',asset,kind,payload,updated_at from public.market_cache where owner_id='f42bf568-35b8-4e64-bd96-17ee675d666c'
on conflict(owner_id,asset,kind) do update set payload=excluded.payload,updated_at=excluded.updated_at;
insert into public.cash_events(owner_id,id,asset,event_date,kind,quantity,gross_cents,tax_cents,net_cents,source_name,source_hash,source_page,metadata,created_at)
select '3e1fa00a-8b0b-48d8-bc29-1243179ad4d3',id,asset,event_date,kind,quantity,gross_cents,tax_cents,net_cents,source_name,source_hash,source_page,metadata,created_at from public.cash_events where owner_id='f42bf568-35b8-4e64-bd96-17ee675d666c'
on conflict(owner_id,id) do update set net_cents=excluded.net_cents,metadata=excluded.metadata;
insert into public.custody_events(owner_id,id,asset,event_date,kind,quantity,amount_cents,source_name,source_hash,source_page,metadata,created_at)
select '3e1fa00a-8b0b-48d8-bc29-1243179ad4d3',id,asset,event_date,kind,quantity,amount_cents,source_name,source_hash,source_page,metadata,created_at from public.custody_events where owner_id='f42bf568-35b8-4e64-bd96-17ee675d666c'
on conflict(owner_id,id) do update set quantity=excluded.quantity,metadata=excluded.metadata;
insert into public.corporate_events(owner_id,asset,kind,event_date,factor,label,source,notes,status,updated_at,quantity,metadata)
select '3e1fa00a-8b0b-48d8-bc29-1243179ad4d3',asset,kind,event_date,factor,label,source,notes,status,updated_at,quantity,metadata from public.corporate_events where owner_id='f42bf568-35b8-4e64-bd96-17ee675d666c'
on conflict(owner_id,asset,kind,event_date,label) do update set quantity=excluded.quantity,metadata=excluded.metadata;

drop policy families_hierarchy_read on public.families;
create policy families_hierarchy_read on public.families for select to authenticated using (
 private.current_profile_role()='master' or supervisor_id=(select auth.uid()) or
 exists(select 1 from public.family_members fm where fm.family_id=id and fm.profile_id=(select auth.uid())) or
 exists(select 1 from public.organization_members om where om.organization_id=organization_id and om.profile_id=(select auth.uid()) and om.role='admin')
);
