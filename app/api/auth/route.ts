import {supabaseConfigured,supabaseServer} from '@/lib/supabase/server';
import {z} from 'zod';
const schema=z.object({action:z.enum(['login','signup','logout','refresh']),email:z.string().email().optional(),password:z.string().min(8).max(128).optional()});
export async function POST(req:Request){
 const response=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 if(req.headers.get('origin')!==new URL(req.url).origin)return response({error:'Origem não permitida.'},403);
 if(!supabaseConfigured())return response({error:'Conexão com Supabase em preparação.'},503);
 const body=schema.safeParse(await req.json().catch(()=>null));if(!body.success)return response({error:'Informe e-mail válido e senha com pelo menos 8 caracteres.'},400);
 const client=await supabaseServer();const {action,email,password}=body.data;
 if(action==='logout'){const {error}=await client.auth.signOut();return error?response({error:'Não foi possível sair.'},503):response({ok:true});}
 if(action==='refresh'){const {error}=await client.auth.getUser();return response({ok:!error},error?401:200);}
 if(!email||!password)return response({error:'Informe e-mail e senha.'},400);
 const result=action==='login'?await client.auth.signInWithPassword({email,password}):await client.auth.signUp({email,password,options:{emailRedirectTo:new URL('/auth/callback',req.url).href}});
 if(result.error)return response({error:action==='login'?'Não foi possível entrar. Confira os dados e a confirmação do e-mail.':'Não foi possível criar a conta. Verifique o e-mail, a força da senha ou tente mais tarde.'},400);
 return response({ok:true,confirmation:!result.data.session});
}
