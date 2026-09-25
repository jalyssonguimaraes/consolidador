import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database,listNotes } from '@/db/store';
import source from '@/data/source.json';
import { noteSchema } from '@/lib/validation';
import { consolidate, type Note } from '@/lib/ledger';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Entre para acessar a carteira.'},401);try{const notes=await listNotes(user.userId);const market=await database().prepare('SELECT payload,updated FROM quotes WHERE owner=?').bind(user.userId).all<{payload:string;updated:string}>();return json({notes,...consolidate(notes),quotes:market.results.map(q=>({...JSON.parse(q.payload),updated:q.updated}))});}catch(e){console.error('portfolio read',e);return json({error:'Não foi possível carregar sua carteira. Tente novamente.'},503);}}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Entre para salvar movimentações.'},401);
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Origem não permitida.'},403);
 try{
  if(Number(req.headers.get('content-length')||0)>200000)return json({error:'Envio muito grande.'},413);
  const body=await req.json() as {action?:string;note?:unknown};const db=database();const now=new Date().toISOString();
  if(body.action==='import'){
   const existing=await listNotes(user.userId);const keys=new Set(existing.map(n=>[n.broker,n.date,n.number].join('|')));
   const fresh=(source.notes as Note[]).filter(n=>!keys.has([n.broker,n.date,n.number].join('|')));
   const results=fresh.length?await db.batch(fresh.map(n=>db.prepare('INSERT OR IGNORE INTO notes(id,owner,source_key,broker,date,number,payload,version,updated) VALUES(?,?,?,?,?,?,?,1,?)').bind(user.userId+':'+n.id,user.userId,n.id,n.broker,n.date,n.number,JSON.stringify(n),now))):[];
   return json({message:`Importação concluída: ${results.reduce((s,r)=>s+r.meta.changes,0)} documentos novos. Documentos existentes foram preservados.`});
  }
  if(body.action!=='save')return json({error:'Ação inválida.'},400);
  const parsed=noteSchema.safeParse(body.note);if(!parsed.success)return json({error:parsed.error.issues.map(i=>i.message).join(' ')},400);
  const note=parsed.data as Note;
  const existing=await db.prepare('SELECT payload,version FROM notes WHERE owner=? AND source_key=?').bind(user.userId,note.id).first<{payload:string;version:number}>();
  if(existing){
   if(note.version!==existing.version)return json({error:'Esta nota foi alterada em outra sessão. Recarregue antes de editar.'},409);
   const original=JSON.parse(existing.payload);note.source=original.source;note.original=original.original;
   const updated=await db.batch([
    db.prepare('INSERT INTO revisions(id,owner,note_id,payload,created) SELECT ?,owner,source_key,payload,? FROM notes WHERE owner=? AND source_key=? AND version=?').bind(crypto.randomUUID(),now,user.userId,note.id,note.version),
    db.prepare('UPDATE notes SET broker=?,date=?,number=?,payload=?,version=version+1,updated=? WHERE owner=? AND source_key=? AND version=?').bind(note.broker,note.date,note.number,JSON.stringify(note),now,user.userId,note.id,note.version)
   ]);
   if(!updated[1].meta.changes)return json({error:'Esta nota foi alterada em outra sessão. Recarregue antes de editar.'},409);
  }else{await db.prepare('INSERT INTO notes(id,owner,source_key,broker,date,number,payload,version,updated) VALUES(?,?,?,?,?,?,?,1,?)').bind(user.userId+':'+note.id,user.userId,note.id,note.broker,note.date,note.number,JSON.stringify(note),now).run();}
  return json({message:'Movimentações salvas. Carteira recalculada.'});
 }catch(e){console.error('portfolio write',e);return json({error:String(e).includes('UNIQUE')?'Já existe um documento desta corretora, data e número. Edite o documento existente.':'Não foi possível salvar. Seus campos foram mantidos; revise e tente novamente.'},400);}
}

