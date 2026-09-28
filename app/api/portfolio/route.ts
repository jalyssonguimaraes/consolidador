import {getUser} from '@/lib/auth';
import {readNotes,readCache,readCashEvents,readImportBatches,saveNote,importNotes,importNotesV2,StoreError} from '@/db/repository';
import {supabaseConfigured} from '@/lib/supabase/server';
import source from '@/data/source.json';
import {noteSchema} from '@/lib/validation';
import {consolidate,type Note} from '@/lib/ledger';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){
 const user=await getUser();if(!user)return json({error:'Entre para acessar a carteira.'},401);
 try{const [notes,quotes,cashEvents,imports]=await Promise.all([readNotes(user.userId),readCache(user.userId,'quote'),readCashEvents(user.userId),readImportBatches(user.userId)]);return json({notes,...consolidate(notes),quotes,cashEvents,imports,storage:{provider:supabaseConfigured()?'Supabase PostgreSQL':'D1 local (SQLite)',cloud:supabaseConfigured(),loadedAt:new Date().toISOString(),lastSavedAt:notes.map(n=>n.updated||'').sort().at(-1)||null}});}
 catch(e){console.error('portfolio read',e);return json({error:'Não foi possível carregar o banco de dados. Tente novamente.'},503);}
}
export async function POST(req:Request){
 const user=await getUser();if(!user)return json({error:'Entre para salvar movimentações.'},401);
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Origem não permitida.'},403);
 try{
  const raw=await req.text();if(raw.length>5000000)return json({error:'Envio muito grande. Limite de 5 MB por lote.'},413);
  const body=JSON.parse(raw);
  if(body.action==='import'){
   const incoming:unknown[]=Array.isArray(body.documents)?body.documents:source.notes;const parsed=incoming.map(item=>noteSchema.safeParse(item));const invalid=parsed.map((item,index)=>item.success?null:{index:index+1,message:item.error.issues.map(issue=>issue.message).join(' ')}).filter(Boolean);
   if(invalid.length)return json({error:`O lote possui ${invalid.length} documento(s) inválido(s).`,details:invalid.slice(0,20)},400);
   const notes=parsed.flatMap(item=>item.success?[item.data as Note]:[]);const fileName=typeof body.fileName==='string'&&body.fileName.trim()?body.fileName.trim().slice(0,180):'base-inicial.json';
   if(!supabaseConfigured()){const count=await importNotes(user.userId,notes);return json({message:`Importação concluída: ${count} documentos novos.`});}
   const bytes=new TextEncoder().encode(JSON.stringify(notes));const digest=await crypto.subtle.digest('SHA-256',bytes);const fileHash=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');const result=await importNotesV2(user.userId,notes,fileName,fileHash);
   return json({message:`Lote registrado: ${result.inserted} documento(s) importado(s) e ${result.duplicates} duplicado(s) preservado(s).`,batch:result});
  }
  if(body.action!=='save')return json({error:'Ação inválida.'},400);
  const parsed=noteSchema.safeParse(body.note);if(!parsed.success)return json({error:parsed.error.issues.map(i=>i.message).join(' ')},400);
  await saveNote(user.userId,parsed.data as Note);return json({message:'Documento salvo no banco. Carteira recalculada.'});
 }catch(e){console.error('portfolio write',e);return json({error:e instanceof StoreError?e.message:'Não foi possível salvar. Revise os campos e tente novamente.'},e instanceof StoreError?e.status:400);}
}
