import {supabaseConfigured,supabaseServer} from '@/lib/supabase/server';
import {database,listNotes as localNotes} from './store';
import type {Note} from '@/lib/ledger';
export type StoredNote=Note & {updated?:string};
export type CashEvent={id:string;asset:string;eventDate:string;kind:'dividend'|'jcp'|'income'|'interest'|'amortization'|'other';quantity:number|null;grossCents:number;taxCents:number;netCents:number;sourceName:string;sourcePage:number|null};
export type ImportBatch={id:string;fileName:string;sourceType:string;status:string;totalDocuments:number;insertedDocuments:number;duplicateDocuments:number;rejectedDocuments:number;createdAt:string;completedAt:string|null};
export type StoredMarketSeries={id:string;symbol:string;name:string;kind:string;unit:string;frequency:string;available:boolean;statusMessage:string|null;updatedAt:string;lastAttemptAt:string|null;lastSuccessAt:string|null;nextRefreshAt:string|null;points:Array<{date:string;value:number;adjusted:number|null}>};
export class StoreError extends Error{constructor(message:string,public status=400){super(message);}}
export async function readNotes(owner:string):Promise<StoredNote[]>{
 if(!supabaseConfigured()){
  const rows=await database().prepare('SELECT payload,version,updated FROM notes WHERE owner=? ORDER BY date,id').bind(owner).all<{payload:string;version:number;updated:string}>();
  return rows.results.map(r=>({...JSON.parse(r.payload),version:r.version,updated:r.updated}));
 }
 const db=await supabaseServer();const {data,error}=await db.from('portfolio_notes').select('payload,version,updated_at').eq('owner_id',owner).order('trade_date').order('id');
 if(error)throw error;return (data||[]).map(r=>({...r.payload,version:r.version,updated:r.updated_at}));
}
export async function readCashEvents(owner:string):Promise<CashEvent[]>{
 if(!supabaseConfigured())return [];
 const db=await supabaseServer();const {data,error}=await db.from('cash_events').select('id,asset,event_date,kind,quantity,gross_cents,tax_cents,net_cents,source_name,source_page').eq('owner_id',owner).order('event_date');
 if(error)throw error;return (data||[]).map(row=>({id:row.id,asset:row.asset,eventDate:row.event_date,kind:row.kind,quantity:row.quantity===null?null:Number(row.quantity),grossCents:Number(row.gross_cents),taxCents:Number(row.tax_cents),netCents:Number(row.net_cents),sourceName:row.source_name,sourcePage:row.source_page}));
}
export async function readCache(owner:string,kind:'quote'|'details'|'benchmark',asset?:string){
 if(supabaseConfigured()){
  const db=await supabaseServer();let q=db.from('market_cache').select('payload,updated_at').eq('owner_id',owner).eq('kind',kind);if(asset)q=q.eq('asset',asset);
  const {data,error}=await q;if(error)throw error;return (data||[]).map(r=>({...r.payload,updated:r.updated_at}));
 }
 const rows=await database().prepare('SELECT id,payload,updated FROM quotes WHERE owner=?').bind(owner).all<{id:string;payload:string;updated:string}>();
 return rows.results.filter(r=>kind==='quote'?!r.id.endsWith(':details')&&!r.id.endsWith(':benchmark'):r.id.endsWith(`:${kind}`)).filter(r=>kind!=='benchmark'||!asset||r.id.includes(`:${asset}:benchmark`)).map(r=>({...JSON.parse(r.payload),updated:r.updated})).filter(r=>kind==='benchmark'||(!asset||r.asset===asset)&&(kind==='details'||(Number.isFinite(r.price)&&r.price>0)));
}
export async function writeCache(owner:string,kind:'quote'|'details'|'benchmark',asset:string,payload:unknown){
 const now=new Date().toISOString();
 if(supabaseConfigured()){
  const db=await supabaseServer();const {error}=await db.from('market_cache').upsert({owner_id:owner,kind,asset,payload,updated_at:now},{onConflict:'owner_id,kind,asset'});if(error)throw error;return;
 }
 const suffix=kind==='quote'?'':`:${kind}`;
 await database().prepare('INSERT INTO quotes(id,owner,payload,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').bind(owner+':'+asset+suffix,owner,JSON.stringify(payload),now).run();
}
export async function writeMarketSeries(owner:string,series:Array<{id:string;name:string;unit:'index'|'rate';frequency?:string;points:Array<{date:string;value:number}>;available:boolean;message?:string}>,assetSeries:Record<string,Array<{date:string;close:number;adjustedClose:number}>>){
 if(!supabaseConfigured())return;
 const db=await supabaseServer();
 const rows=[...series.map(item=>({symbol:item.id,name:item.name,kind:item.unit==='rate'?'macro':'benchmark',unit:item.unit==='rate'?(item.frequency==='monthly'?'percent':'annual_rate'):'index',frequency:item.frequency||'daily',available:item.available,status_message:item.message||null,points:item.points.map(point=>({date:point.date,value:point.value,adjusted:null}))})),...Object.entries(assetSeries).map(([symbol,points])=>({symbol,name:symbol,kind:'asset',unit:'price',frequency:'daily',available:points.length>1,status_message:points.length>1?null:'Histórico insuficiente',points:points.map(point=>({date:point.date,value:point.close,adjusted:point.adjustedClose}))}))];
 for(const row of rows){const {data,error}=await db.from('market_series').upsert({owner_id:owner,provider:'BRAPI',symbol:row.symbol,name:row.name,kind:row.kind,unit:row.unit,frequency:row.frequency,available:row.available,status_message:row.status_message,updated_at:new Date().toISOString()},{onConflict:'owner_id,provider,symbol,kind'}).select('id').single();if(error)throw error;if(!row.points.length)continue;const {error:pointError}=await db.from('market_series_points').upsert(row.points.map(point=>({series_id:data.id,point_date:point.date,value:point.value,adjusted_value:point.adjusted})),{onConflict:'series_id,point_date'});if(pointError)throw pointError;}
}
export async function readMarketSeries(owner:string,symbols:string[],start:string,end:string):Promise<StoredMarketSeries[]>{
 if(!supabaseConfigured()||!symbols.length)return [];
 const db=await supabaseServer();const {data,error}=await db.from('market_series').select('id,symbol,name,kind,unit,frequency,available,status_message,updated_at,last_attempt_at,last_success_at,next_refresh_at,market_series_points(point_date,value,adjusted_value)').eq('owner_id',owner).eq('provider','BRAPI').in('symbol',symbols);
 if(error)throw error;return (data||[]).map(row=>({id:row.id,symbol:row.symbol,name:row.name,kind:row.kind,unit:row.unit,frequency:row.frequency,available:row.available,statusMessage:row.status_message,updatedAt:row.updated_at,lastAttemptAt:row.last_attempt_at,lastSuccessAt:row.last_success_at,nextRefreshAt:row.next_refresh_at,points:(row.market_series_points||[]).filter((point:{point_date:string})=>point.point_date>=start&&point.point_date<=end).map((point:{point_date:string;value:number;adjusted_value:number|null})=>({date:point.point_date,value:Number(point.value),adjusted:point.adjusted_value===null?null:Number(point.adjusted_value)})).sort((a:{date:string},b:{date:string})=>a.date.localeCompare(b.date))}));
}
export async function recordMarketAttempt(owner:string,row:{symbol:string;name:string;kind:string;unit:string;frequency:string;available:boolean;statusMessage?:string|null;httpStatus?:number|null;nextRefreshAt:string;success:boolean;points?:Array<{date:string;value:number;adjusted?:number|null}>}){
 if(!supabaseConfigured())return;const db=await supabaseServer(),now=new Date().toISOString();
 const {data,error}=await db.from('market_series').upsert({owner_id:owner,provider:'BRAPI',symbol:row.symbol,name:row.name,kind:row.kind,unit:row.unit,frequency:row.frequency,available:row.available,status_message:row.statusMessage||null,last_attempt_at:now,last_success_at:row.success?now:undefined,next_refresh_at:row.nextRefreshAt,last_http_status:row.httpStatus??null,updated_at:now},{onConflict:'owner_id,provider,symbol,kind'}).select('id').single();if(error)throw error;
 if(row.points?.length){const {error:pointError}=await db.from('market_series_points').upsert(row.points.map(point=>({series_id:data.id,point_date:point.date,value:point.value,adjusted_value:point.adjusted??null})),{onConflict:'series_id,point_date'});if(pointError)throw pointError;}
 const {error:runError}=await db.from('market_sync_runs').insert({owner_id:owner,series_id:data.id,provider:'BRAPI',symbol:row.symbol,status:row.success?'success':'failed',http_status:row.httpStatus??null,message:row.statusMessage||null,points_received:row.points?.length||0});if(runError)throw runError;
}
export async function importNotes(owner:string,notes:Note[]){
 if(supabaseConfigured()){
  const db=await supabaseServer();const {data,error}=await db.rpc('import_portfolio_notes',{documents:notes});if(error)throw error;return Number(data);
 }
 const existing=await localNotes(owner);const keys=new Set(existing.map(n=>[n.broker,n.date,n.number].join('|')));const fresh=notes.filter(n=>!keys.has([n.broker,n.date,n.number].join('|')));
 const rows=fresh.length?await database().batch(fresh.map(n=>database().prepare('INSERT OR IGNORE INTO notes(id,owner,source_key,broker,date,number,payload,version,updated) VALUES(?,?,?,?,?,?,?,1,?)').bind(owner+':'+n.id,owner,n.id,n.broker,n.date,n.number,JSON.stringify(n),new Date().toISOString()))):[];
 return rows.reduce((s,r)=>s+r.meta.changes,0);
}
export async function importNotesV2(owner:string,notes:Note[],fileName:string,fileHash:string){
 if(!supabaseConfigured())return {batchId:null,inserted:await importNotes(owner,notes),duplicates:0,status:'completed'};
 const db=await supabaseServer();const {data,error}=await db.rpc('import_portfolio_notes_v2',{documents:notes,file_name:fileName,file_hash:fileHash,source_kind:'json'});
 if(error)throw error;return data as {batchId:string;inserted:number;duplicates:number;status:string};
}
export async function readImportBatches(owner:string):Promise<ImportBatch[]>{
 if(!supabaseConfigured())return [];
 const db=await supabaseServer();const {data,error}=await db.from('document_import_batches').select('id,file_name,source_type,status,total_documents,inserted_documents,duplicate_documents,rejected_documents,created_at,completed_at').eq('owner_id',owner).order('created_at',{ascending:false}).limit(20);
 if(error)throw error;return (data||[]).map(row=>({id:row.id,fileName:row.file_name,sourceType:row.source_type,status:row.status,totalDocuments:row.total_documents,insertedDocuments:row.inserted_documents,duplicateDocuments:row.duplicate_documents,rejectedDocuments:row.rejected_documents,createdAt:row.created_at,completedAt:row.completed_at}));
}
export async function saveNote(owner:string,note:Note){
 if(supabaseConfigured()){
  const db=await supabaseServer();const {error}=await db.rpc('save_portfolio_note',{document:note,expected_version:note.version??null});
  if(error)throw new StoreError(error.message.includes('VERSION_CONFLICT')?'Documento alterado em outra sessão. Recarregue antes de editar.':'Não foi possível salvar o documento.',error.message.includes('VERSION_CONFLICT')?409:400);return;
 }
 const db=database();const existing=await db.prepare('SELECT payload,version FROM notes WHERE owner=? AND source_key=?').bind(owner,note.id).first<{payload:string;version:number}>();const now=new Date().toISOString();
 if(existing){
  if(note.version!==existing.version)throw new StoreError('Documento alterado em outra sessão. Recarregue antes de editar.',409);
  const original=JSON.parse(existing.payload);note.source=original.source;note.original=original.original;
  const result=await db.batch([
   db.prepare('INSERT INTO revisions(id,owner,note_id,payload,created) SELECT ?,owner,source_key,payload,? FROM notes WHERE owner=? AND source_key=? AND version=?').bind(crypto.randomUUID(),now,owner,note.id,note.version),
   db.prepare('UPDATE notes SET broker=?,date=?,number=?,payload=?,version=version+1,updated=? WHERE owner=? AND source_key=? AND version=?').bind(note.broker,note.date,note.number,JSON.stringify(note),now,owner,note.id,note.version),
  ]);if(!result[1].meta.changes)throw new StoreError('Documento alterado em outra sessão.',409);
 }else{
  if(note.version)throw new StoreError('Documento não encontrado. Recarregue a carteira.',409);
  await db.prepare('INSERT INTO notes(id,owner,source_key,broker,date,number,payload,version,updated) VALUES(?,?,?,?,?,?,?,1,?)').bind(owner+':'+note.id,owner,note.id,note.broker,note.date,note.number,JSON.stringify(note),now).run();
 }
}
