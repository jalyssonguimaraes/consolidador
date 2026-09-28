import {getUser} from '@/lib/auth';
import {supabaseServer} from '@/lib/supabase/server';
import {z} from 'zod';

const createSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('organizacao'),name:z.string().trim().min(2).max(100),kind:z.enum(['empresa','consultoria'])}),
 z.object({type:z.literal('familia'),name:z.string().trim().min(2).max(100),organizationId:z.string().uuid().nullable().optional(),holderEmail:z.string().email().optional(),holderName:z.string().trim().max(100).optional()}),
 z.object({type:z.enum(['admin','consultor']),name:z.string().trim().min(2).max(100),email:z.string().email(),organizationId:z.string().uuid().nullable().optional()}),
]);
const updateSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('subscription'),id:z.string().uuid(),status:z.enum(['active','inactive'])}),
 z.object({type:z.literal('permission'),role:z.enum(['master','admin','consultor','familia']),permission:z.enum(['manage_organizations','manage_users','manage_subscriptions','manage_families','view_portfolios','edit_portfolios']),enabled:z.boolean()}),
]);
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});

export async function GET(){
 const user=await getUser();if(!user)return json({error:'Entre para acessar a gestão.'},401);
 const db=await supabaseServer();
 const results=await Promise.all([
  db.from('account_profiles').select('id,display_name,role,profile_code').order('display_name'),
  db.from('organizations').select('id,code,name,kind,owner_master_id').order('name'),
  db.from('organization_members').select('organization_id,profile_id,role'),
  db.from('families').select('id,code,name,organization_id,supervisor_id').order('name'),
  db.from('family_members').select('family_id,profile_id,family_role,relationship'),
  db.from('consultant_supervision').select('consultant_id,supervisor_id'),
  db.from('managed_invitations').select('id,email,role,display_name,status,organization_id,family_id,created_at').order('created_at',{ascending:false}),
  db.from('system_subscriptions').select('id,subject_type,subject_id,plan_name,status,starts_at,ends_at,updated_at').order('subject_type'),
  db.from('role_permissions').select('role,permission,enabled').order('role'),
 ]);
 const failed=results.map((result,index)=>({index,error:result.error})).filter(item=>item.error);
 if(failed.length){console.error('management-read-failed',failed);return json({error:'Não foi possível ler a estrutura de perfis. A falha foi registrada para diagnóstico.'},503);}
 const profiles=results[0].data||[],organizations=results[1].data||[],organizationMembers=results[2].data||[],families=results[3].data||[],familyMembers=results[4].data||[],supervision=results[5].data||[],invitations=results[6].data||[],subscriptions=results[7].data||[],permissions=results[8].data||[];
 const profile=profiles.find(item=>item.id===user.userId);
 if(!profile)return json({error:'Seu usuário autenticado ainda não possui um perfil de acesso.'},403);
 return json({profile,profiles,organizations,organizationMembers,families,familyMembers,supervision,invitations,subscriptions,permissions});
}

export async function PATCH(req:Request){
 const user=await getUser();if(!user)return json({error:'Entre para alterar a gestão.'},401);
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Origem não permitida.'},403);
 const body=updateSchema.safeParse(await req.json().catch(()=>null));if(!body.success)return json({error:'Alteração inválida.'},400);
 const db=await supabaseServer();const {data:profile}=await db.from('account_profiles').select('role').eq('id',user.userId).single();
 if(profile?.role!=='master')return json({error:'Somente o Master altera permissões e assinaturas.'},403);
 if(body.data.type==='subscription'){
  const {error}=await db.from('system_subscriptions').update({status:body.data.status,updated_at:new Date().toISOString(),updated_by:user.userId}).eq('id',body.data.id);
  return error?json({error:'Não foi possível atualizar a assinatura.'},400):json({message:'Assinatura atualizada.'});
 }
 const {error}=await db.from('role_permissions').update({enabled:body.data.enabled,updated_at:new Date().toISOString(),updated_by:user.userId}).eq('role',body.data.role).eq('permission',body.data.permission);
 return error?json({error:'Não foi possível atualizar a permissão.'},400):json({message:'Permissão atualizada.'});
}

export async function POST(req:Request){
 const user=await getUser();if(!user)return json({error:'Entre para cadastrar.'},401);if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Origem não permitida.'},403);
 const body=createSchema.safeParse(await req.json().catch(()=>null));if(!body.success)return json({error:body.error.issues.map(i=>i.message).join(' ')},400);
 const db=await supabaseServer();const {data:profile}=await db.from('account_profiles').select('role').eq('id',user.userId).single();const role=profile?.role as string|undefined;if(!role||role==='familia')return json({error:'Este perfil não pode cadastrar vínculos.'},403);
 const value=body.data;if(value.type==='organizacao'){if(role!=='master')return json({error:'Somente o Master cadastra organizações.'},403);const {data,error}=await db.from('organizations').insert({name:value.name,kind:value.kind,owner_master_id:user.userId}).select('code').single();return error?json({error:'Não foi possível cadastrar a organização.'},400):json({message:`Organização ${data.code} cadastrada.`});}
 if(value.type==='familia'){const {data,error}=await db.from('families').insert({name:value.name,organization_id:value.organizationId||null,supervisor_id:user.userId,created_by:user.userId}).select('id,code').single();if(error)return json({error:'Não foi possível cadastrar a família.'},400);if(value.holderEmail){const invite=await db.from('managed_invitations').insert({email:value.holderEmail.toLowerCase(),role:'familia',display_name:value.holderName||value.name,family_id:data.id,organization_id:value.organizationId||null,supervisor_id:user.userId,family_role:'titular',created_by:user.userId});if(invite.error)return json({error:`Família ${data.code} criada, mas o convite do titular não foi salvo.`},400);}return json({message:`Família ${data.code} cadastrada.`});}
 if(role==='consultor')return json({error:'Consultor só pode cadastrar famílias.'},403);if(role==='admin'&&value.type==='admin')return json({error:'Somente o Master cadastra administradores.'},403);
 const {error}=await db.from('managed_invitations').insert({email:value.email.toLowerCase(),role:value.type,display_name:value.name,organization_id:value.organizationId||null,supervisor_id:user.userId,created_by:user.userId});return error?json({error:'Não foi possível salvar o cadastro pendente.'},400):json({message:`Cadastro de ${value.type} salvo e aguardando ativação.`});
}
