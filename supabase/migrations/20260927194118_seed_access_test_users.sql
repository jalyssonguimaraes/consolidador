insert into public.account_profiles(id,display_name,role) values
('08a9d583-4c23-4ddd-a5fb-aa1f485b54f2','Administrador de Teste','admin'),
('96a63c5a-f6e3-417b-8afd-65716ff5faa1','Consultor de Teste','consultor'),
('3e1fa00a-8b0b-48d8-bc29-1243179ad4d3','Família de Teste — Titular','familia')
on conflict(id) do update set display_name=excluded.display_name,role=excluded.role,updated_at=now();

with org as (
 insert into public.organizations(name,kind,owner_master_id)
 select 'Sagrado Capital — Ambiente de Testes','consultoria','f42bf568-35b8-4e64-bd96-17ee675d666c'::uuid
 where not exists(select 1 from public.organizations where name='Sagrado Capital — Ambiente de Testes')
 returning id
), selected_org as (select id from org union all select id from public.organizations where name='Sagrado Capital — Ambiente de Testes' limit 1)
insert into public.organization_members(organization_id,profile_id,role)
select id,'08a9d583-4c23-4ddd-a5fb-aa1f485b54f2'::uuid,'admin' from selected_org union all
select id,'96a63c5a-f6e3-417b-8afd-65716ff5faa1'::uuid,'consultor' from selected_org
on conflict(organization_id,profile_id) do update set role=excluded.role;

insert into public.consultant_supervision(consultant_id,supervisor_id) values
('96a63c5a-f6e3-417b-8afd-65716ff5faa1','08a9d583-4c23-4ddd-a5fb-aa1f485b54f2')
on conflict(consultant_id) do update set supervisor_id=excluded.supervisor_id;

with selected_org as (select id from public.organizations where name='Sagrado Capital — Ambiente de Testes' limit 1), fam as (
 insert into public.families(name,organization_id,supervisor_id,created_by)
 select 'Família de Teste',id,'96a63c5a-f6e3-417b-8afd-65716ff5faa1','f42bf568-35b8-4e64-bd96-17ee675d666c' from selected_org
 where not exists(select 1 from public.families where name='Família de Teste') returning id
), selected_family as (select id from fam union all select id from public.families where name='Família de Teste' limit 1)
insert into public.family_members(family_id,profile_id,family_role,relationship)
select id,'3e1fa00a-8b0b-48d8-bc29-1243179ad4d3'::uuid,'titular','Titular e administrador da família' from selected_family
on conflict(family_id,profile_id) do update set family_role='titular',relationship=excluded.relationship;
